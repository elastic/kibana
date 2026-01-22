/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filter, map, takeUntil, timer, mergeMap, Subject } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { SearchSessionStatus, type SearchSessionStatusResponse } from '../../../common';
import type { ISessionsClient } from '../..';
import { getInProgressSessionIds, setInProgressSessionIds } from './in_progress_session';

export class BackgroundSearchNotifier {
  private stop$?: Subject<void>;

  constructor(private sessionsClient: ISessionsClient, private core: CoreStart) {}

  public async startPolling(interval: number) {
    this.stop$ = new Subject();

    const serverInProgressSession = await this.loadInProgressSessions();
    const localInProgressSessions = getInProgressSessionIds();
    this.updateSessions(
      this.initializeSessions(serverInProgressSession.statuses, localInProgressSessions)
    );

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

  private loadInProgressSessions() {
    return this.sessionsClient.find({
      filter: 'search-session.attributes.status: "in_progress"',
    });
  }

  private initializeSessions(
    loadedSessions: Record<string, SearchSessionStatusResponse>,
    localSessionIds: string[]
  ) {
    // Merge server in-progress sessions with local sessions (removing duplicates)
    const serverSessionIds = Object.keys(loadedSessions);
    const mergedSessionIds = Array.from(new Set([...localSessionIds, ...serverSessionIds]));
    return { inProgressIds: mergedSessionIds, completedIds: [], failedIds: [] };
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
    for (const id of completedIds) {
      this.core.notifications.toasts.addSuccess({
        title: i18n.translate('data.search.sessions.backgroundSearch.completedToastTitle', {
          defaultMessage: 'Background search completed',
        }),
        text: i18n.translate('data.search.sessions.backgroundSearch.completedToastText', {
          defaultMessage: 'Search session {id} has completed successfully.',
          values: { id },
        }),
      });
    }

    for (const id of failedIds) {
      this.core.notifications.toasts.addDanger({
        title: i18n.translate('data.search.sessions.backgroundSearch.failedToastTitle', {
          defaultMessage: 'Background search failed',
        }),
        text: i18n.translate('data.search.sessions.backgroundSearch.failedToastText', {
          defaultMessage: 'Search session {id} has failed.',
          values: { id },
        }),
      });
    }
  }
}
