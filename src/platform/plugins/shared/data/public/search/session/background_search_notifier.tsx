/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { filter, map, takeUntil, timer, mergeMap, Subject } from 'rxjs';
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
  private stop$?: Subject<void>;

  constructor(private sessionsClient: ISessionsClient, private core: CoreStart) {}

  public async startPolling(interval: number) {
    this.stop$ = new Subject();

    timer(0, interval)
      .pipe(
        takeUntil(this.stop$),
        map(getInProgressSessionIds),
        filter((inProgress) => inProgress.length > 0),
        mergeMap(async (inProgress) => ({
          loadedStatuses: await this.sessionsClient.status(inProgress),
          existingIds: inProgress,
        })),
        map(({ loadedStatuses, existingIds }) =>
          this.groupSessions(loadedStatuses.statuses, existingIds)
        ),
        map((sessions) => this.updateSessions(sessions))
      )
      .subscribe();
  }

  public stopPolling() {
    this.stop$?.next();
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

    completedIds.forEach(() => {
      this.core.notifications.toasts.addSuccess({
        title: i18n.translate('data.search.sessions.backgroundSearch.completedToastTitle', {
          defaultMessage: 'Background search completed',
        }),
        text: toMountPoint(
          <FormattedMessage
            id="data.search.sessions.backgroundSearch.completedToastText"
            defaultMessage="Background search completed. <link>View results in Search Sessions</link>"
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
    });

    failedIds.forEach(() => {
      this.core.notifications.toasts.addDanger({
        title: i18n.translate('data.search.sessions.backgroundSearch.failedToastTitle', {
          defaultMessage: 'Background search failed',
        }),
        text: toMountPoint(
          <FormattedMessage
            id="data.search.sessions.backgroundSearch.failedToastText"
            defaultMessage="A background search has failed. <link>Check Search Sessions</link>"
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
    });
  }
}
