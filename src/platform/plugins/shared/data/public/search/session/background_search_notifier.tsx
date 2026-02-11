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
import { SearchSessionStatus, type SearchSessionStatusResponse } from '../../../common';
import type { ISessionsClient } from '../..';
import { SEARCH_SESSIONS_MANAGEMENT_ID } from './constants';
import { getInProgressSessionIds, setInProgressSessionIds } from './in_progress_session';

export class BackgroundSearchNotifier {
  private pollingSubscription?: Subscription;

  constructor(private sessionsClient: ISessionsClient, private core: CoreStart) {}

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
                loadedStatuses: { statuses: {} } as {
                  statuses: Record<string, SearchSessionStatusResponse>;
                },
                existingIds,
              })
            )
          )
        ),
        map(({ loadedStatuses, existingIds }) =>
          this.groupSessions(loadedStatuses.statuses, existingIds)
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
    loadedSessions: Record<string, SearchSessionStatusResponse>,
    existingIds: string[]
  ) {
    const inProgressIds: string[] = [];
    const completedIds: string[] = [];
    const failedIds: string[] = [];

    for (const existingId of existingIds) {
      const sessionStatus = loadedSessions[existingId];
      if (!sessionStatus || sessionStatus.status === SearchSessionStatus.IN_PROGRESS)
        inProgressIds.push(existingId);
      else if (sessionStatus.status === SearchSessionStatus.COMPLETE) completedIds.push(existingId);
      else failedIds.push(existingId);
    }

    return { inProgressIds, completedIds, failedIds };
  }

  private updateSessions(sessions: {
    inProgressIds: string[];
    completedIds: string[];
    failedIds: string[];
  }) {
    setInProgressSessionIds(sessions.inProgressIds);
    this.showNotifications(sessions.completedIds, sessions.failedIds);
  }

  private showNotifications(completedIds: string[], failedIds: string[]) {
    const managementUrl = this.core.application.getUrlForApp('management', {
      deepLinkId: SEARCH_SESSIONS_MANAGEMENT_ID,
    });

    if (completedIds.length > 0) {
      this.core.notifications.toasts.addSuccess({
        title: i18n.translate('data.search.sessions.backgroundSearch.completedToastTitle', {
          defaultMessage:
            '{count, plural, one {Background search completed} other {Completed {count} background searches}}',
          values: {
            count: completedIds.length,
          },
        }),
        text: toMountPoint(
          <FormattedMessage
            id="data.search.sessions.backgroundSearch.completedToastText"
            defaultMessage="<link>View results in Background Search</link>"
            values={{
              link: (chunks: React.ReactNode) => (
                <EuiLink href={managementUrl} data-test-subj="backgroundSearchCompletedToastLink">
                  {chunks}
                </EuiLink>
              ),
            }}
          />,
          this.core
        ),
      });
    }

    if (failedIds.length > 0) {
      this.core.notifications.toasts.addDanger({
        title: i18n.translate('data.search.sessions.backgroundSearch.failedToastTitle', {
          defaultMessage:
            '{count, plural, one {Background search failed} other {Failed {count} background searches}}',
          values: {
            count: failedIds.length,
          },
        }),
        text: toMountPoint(
          <FormattedMessage
            id="data.search.sessions.backgroundSearch.failedToastText"
            defaultMessage="<link>Check Background Search</link>"
            values={{
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
