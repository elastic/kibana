/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ApplicationStart, FeatureFlagsStart, NotificationsStart } from '@kbn/core/public';
import moment from 'moment';
import { from, race, timer } from 'rxjs';
import { mapTo, tap } from 'rxjs';
import type { SearchSessionStatusResponse } from '../../../../../common';
import type { SearchSessionSavedObject } from '../types';
import type { ISessionsClient } from '../../sessions_client';
import type { SearchUsageCollector } from '../../../collectors';
import type { SearchSessionsConfigSchema } from '../../../../../server/config';

interface SearchSessionManagementDeps {
  notifications: NotificationsStart;
  application: ApplicationStart;
  usageCollector?: SearchUsageCollector;
  featureFlags: FeatureFlagsStart;
}

interface FetchReturn {
  savedObjects: SearchSessionSavedObject[];
  statuses: Record<string, SearchSessionStatusResponse>;
}

export class SearchSessionsMgmtAPI {
  constructor(
    private sessionsClient: ISessionsClient,
    private config: SearchSessionsConfigSchema,
    private deps: SearchSessionManagementDeps
  ) {}

  public async fetchTableData({ appId }: { appId?: string } = {}): Promise<FetchReturn> {
    const mgmtConfig = this.config.management;

    const refreshTimeout = moment.duration(mgmtConfig.refreshTimeout);

    const fetch$ = from(
      this.sessionsClient.find({
        page: 1,
        perPage: mgmtConfig.maxSessions,
        sortField: 'created',
        sortOrder: 'desc',
      })
    );
    const timeout$ = timer(refreshTimeout.asMilliseconds()).pipe(
      tap(() => {
        this.deps.notifications.toasts.addDanger(
          i18n.translate('data.mgmt.searchSessions.api.backgroundSearchFetchTimeout', {
            defaultMessage: 'Fetching the Background Search info timed out after {timeout} seconds',
            values: { timeout: refreshTimeout.asSeconds() },
          })
        );
      }),
      mapTo(null)
    );

    // fetch the search sessions before timeout triggers
    try {
      const result = await race(fetch$, timeout$).toPromise();
      if (result && result.saved_objects) {
        return {
          savedObjects: result.saved_objects.filter((object) => {
            if (!appId) return true;
            return object.attributes.appId === appId;
          }) as SearchSessionSavedObject[],
          statuses: result.statuses,
        };
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      this.deps.notifications.toasts.addError(err, {
        title: i18n.translate('data.mgmt.searchSessions.api.fetchError', {
          defaultMessage: 'Failed to refresh the page!',
        }),
      });
    }

    return {
      savedObjects: [],
      statuses: {},
    };
  }

  public getExtendByDuration() {
    return this.config.defaultExpiration;
  }

  // Delete and expire
  public async sendDelete(id: string): Promise<void> {
    this.deps.usageCollector?.trackSessionDeleted();
    try {
      await this.sessionsClient.delete(id);

      this.deps.notifications.toasts.addSuccess({
        title: i18n.translate('data.mgmt.searchSessions.api.backgroundSearchDeleted', {
          defaultMessage: 'The background search was deleted.',
        }),
      });
    } catch (err) {
      this.deps.notifications.toasts.addError(err, {
        title: i18n.translate('data.mgmt.searchSessions.api.backgroundSearchDeletedError', {
          defaultMessage: 'Failed to delete the background search!',
        }),
      });
    }
  }

  // Extend
  public async sendExtend(id: string, expires: string): Promise<void> {
    this.deps.usageCollector?.trackSessionExtended();
    try {
      await this.sessionsClient.extend(id, expires);

      this.deps.notifications.toasts.addSuccess({
        title: i18n.translate('data.mgmt.searchSessions.api.backgroundSearchExtended', {
          defaultMessage: 'The background search was extended.',
        }),
      });
    } catch (err) {
      this.deps.notifications.toasts.addError(err, {
        title: i18n.translate('data.mgmt.searchSessions.api.backgroundSearchExtendError', {
          defaultMessage: 'Failed to extend the background search!',
        }),
      });
    }
  }

  // Change the user-facing name of a search session
  public async sendRename(id: string, newName: string): Promise<void> {
    try {
      await this.sessionsClient.rename(id, newName);

      this.deps.notifications.toasts.addSuccess({
        title: i18n.translate('data.mgmt.searchSessions.api.backgroundSearchRename', {
          defaultMessage: 'The background search was renamed',
        }),
      });
    } catch (err) {
      this.deps.notifications.toasts.addError(err, {
        title: i18n.translate('data.mgmt.searchSessions.api.backgroundSearchRenameError', {
          defaultMessage: 'Failed to rename the background search',
        }),
      });
    }
  }
}
