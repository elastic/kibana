/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { catchError, exhaustMap, filter, from, map, of, tap, timer, type Subscription } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  SearchSessionStatus,
  type SearchSessionStatusResponse,
  type SearchSessionStatusesResponse,
} from '../../../common';
import type { ISessionsClient } from '../..';
import { SEARCH_SESSIONS_MANAGEMENT_ID } from './constants';
import { getInProgressSessionIds, setInProgressSessionIds } from './in_progress_session';
import type { LocatorsStart } from './sessions_mgmt/types';
import { getRestoreUrl } from './get_session_redirect_url';

type SessionNotificationInfo = Omit<
  SearchSessionStatusesResponse['sessions'][string],
  'restoreState'
> & {
  restoreUrl?: string;
  id: string;
};

export class BackgroundSearchNotifier {
  private pollingSubscription?: Subscription;

  constructor(
    private sessionsClient: ISessionsClient,
    private core: CoreStart,
    private locators: LocatorsStart
  ) {}

  public startPolling(interval: number) {
    this.stopPolling();

    this.pollingSubscription = timer(0, interval)
      .pipe(
        map(getInProgressSessionIds),
        filter((inProgress) => inProgress.length > 0),
        exhaustMap((existingIds) =>
          from(this.sessionsClient.status(existingIds)).pipe(
            map((loadedStatuses) => ({ loadedStatuses, existingIds })),
            catchError(() =>
              of({
                loadedStatuses: {
                  statuses: Object.fromEntries(
                    existingIds.map((id) => [id, { status: SearchSessionStatus.IN_PROGRESS }])
                  ) satisfies Record<string, SearchSessionStatusResponse>,
                  sessions: {} satisfies SearchSessionStatusesResponse['sessions'],
                },
                existingIds,
              })
            )
          )
        ),
        map(({ loadedStatuses, existingIds }) =>
          this.groupSessions(loadedStatuses.statuses, loadedStatuses.sessions, existingIds)
        ),
        tap((sessions) => this.updateSessions(sessions))
      )
      .subscribe();
  }

  public stopPolling() {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = undefined;
  }

  private groupSessions(
    loadedStatuses: Record<string, SearchSessionStatusResponse>,
    loadedSessions: SearchSessionStatusesResponse['sessions'],
    existingIds: string[]
  ) {
    const inProgressIds: string[] = [];
    const completedSessions: SessionNotificationInfo[] = [];
    const failedSessions: SessionNotificationInfo[] = [];

    for (const existingId of existingIds) {
      const sessionStatus = loadedStatuses[existingId];
      if (!sessionStatus) continue;
      else if (sessionStatus.status === SearchSessionStatus.IN_PROGRESS)
        inProgressIds.push(existingId);
      else if (sessionStatus.status === SearchSessionStatus.COMPLETE)
        completedSessions.push(this.buildNotificationInfo(existingId, loadedSessions[existingId]));
      else failedSessions.push(this.buildNotificationInfo(existingId, loadedSessions[existingId]));
    }

    // It's possible that while the polling is running new sessions are added to the list. For example:
    //
    // 1. Timer fires → getInProgressSessionIds() snapshots ['session-A'] as existingIds
    // 2. sessionsClient.status(['session-A']) goes out (async, potentially slow)
    // 3. New session session-B is added to localStorage
    // 4. Response comes back → groupSessions only processes existingIds (['session-A'])
    // 5. setInProgressSessionIds(['session-A']) overwrites localStorage, silently dropping session-B
    //
    // To prevent this from happening, we need to check for new sessions that were added while the polling was running.
    const currentSessions = getInProgressSessionIds();
    const polledIds = new Set(existingIds);
    const newSessionIds = currentSessions.filter((id) => !polledIds.has(id));
    inProgressIds.push(...newSessionIds);

    return { inProgressIds, completedSessions, failedSessions };
  }

  private updateSessions(sessions: {
    inProgressIds: string[];
    completedSessions: SessionNotificationInfo[];
    failedSessions: SessionNotificationInfo[];
  }) {
    setInProgressSessionIds(sessions.inProgressIds);
    this.showNotifications(sessions.completedSessions, sessions.failedSessions);
  }

  private buildNotificationInfo(
    sessionId: string,
    sessionData?: SearchSessionStatusesResponse['sessions'][string]
  ): SessionNotificationInfo {
    const name = sessionData?.name ?? this.getDefaultSessionName();
    return {
      id: sessionId,
      name,
      appId: sessionData?.appId,
      restoreUrl: getRestoreUrl({
        locators: this.locators,
        locatorId: sessionData?.locatorId,
        restoreState: sessionData?.restoreState,
        sessionName: name,
      }),
    };
  }

  private getDefaultSessionName() {
    return i18n.translate('data.search.sessions.backgroundSearch.unnamedSession', {
      defaultMessage: 'Untitled background search',
    });
  }

  private showNotifications(
    completedSessions: SessionNotificationInfo[],
    failedSessions: SessionNotificationInfo[]
  ) {
    const managementUrl = this.core.application.getUrlForApp('management', {
      deepLinkId: SEARCH_SESSIONS_MANAGEMENT_ID,
    });

    for (const completedSession of completedSessions) {
      this.core.notifications.toasts.addSuccess({
        title: i18n.translate('data.search.sessions.backgroundSearch.completedToastTitle', {
          defaultMessage: 'Background search completed',
        }),
        text: toMountPoint(
          <FormattedMessage
            id="data.search.sessions.backgroundSearch.completedToastText"
            defaultMessage='"{name}" is complete. <link>Open in {appId}.</link>'
            values={{
              link: (chunks: React.ReactNode) => (
                <EuiLink
                  href={completedSession.restoreUrl ?? managementUrl}
                  data-test-subj="backgroundSearchCompletedToastLink"
                >
                  {chunks}
                </EuiLink>
              ),
              appId: completedSession.appId,
              name: completedSession.name,
            }}
          />,
          this.core
        ),
      });
    }

    for (const failedSession of failedSessions) {
      this.core.notifications.toasts.addDanger({
        title: i18n.translate('data.search.sessions.backgroundSearch.failedToastTitle', {
          defaultMessage: 'Background search failed',
        }),
        text: toMountPoint(
          <FormattedMessage
            id="data.search.sessions.backgroundSearch.failedToastText"
            defaultMessage='There was a problem with "{name}". <link>Go to management.</link>'
            values={{
              name: failedSession.name,
              link: (chunks: React.ReactNode) => (
                <EuiLink href={managementUrl} data-test-subj="backgroundSearchFailedToastLink">
                  {chunks}
                </EuiLink>
              ),
            }}
          />,
          this.core
        ),
      });
    }
  }
}
