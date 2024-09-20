/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { skip } from 'rxjs';

import { noSearchSessionStorageCapabilityMessage } from '@kbn/data-plugin/public';

import { dashboardCapabilitiesService } from '../../../../services/dashboard_services';
import { dataService } from '../../../../services/kibana_services';
import { DashboardContainer } from '../../dashboard_container';
import { DashboardCreationOptions } from '../../dashboard_container_factory';
import { newSession$ } from './new_session';

/**
 * Enables dashboard search sessions.
 */
export function startDashboardSearchSessionIntegration(
  this: DashboardContainer,
  searchSessionSettings: DashboardCreationOptions['searchSessionSettings']
) {
  if (!searchSessionSettings) return;

  const {
    sessionIdUrlChangeObservable,
    getSearchSessionIdFromURL,
    removeSessionIdFromUrl,
    createSessionRestorationDataProvider,
  } = searchSessionSettings;

  dataService.search.session.enableStorage(createSessionRestorationDataProvider(this), {
    isDisabled: () =>
      dashboardCapabilitiesService.dashboardCapabilities.storeSearchSession
        ? { disabled: false }
        : {
            disabled: true,
            reasonText: noSearchSessionStorageCapabilityMessage,
          },
  });

  // force refresh when the session id in the URL changes. This will also fire off the "handle search session change" below.
  const searchSessionIdChangeSubscription = sessionIdUrlChangeObservable
    ?.pipe(skip(1))
    .subscribe(() => this.forceRefresh());

  newSession$(this).subscribe(() => {
    const currentSearchSessionId = this.getState().explicitInput.searchSessionId;

    const updatedSearchSessionId: string | undefined = (() => {
      let searchSessionIdFromURL = getSearchSessionIdFromURL();
      if (searchSessionIdFromURL) {
        if (
          dataService.search.session.isRestore() &&
          dataService.search.session.isCurrentSession(searchSessionIdFromURL)
        ) {
          // we had previously been in a restored session but have now changed state so remove the session id from the URL.
          removeSessionIdFromUrl();
          searchSessionIdFromURL = undefined;
        } else {
          dataService.search.session.restore(searchSessionIdFromURL);
        }
      }
      return searchSessionIdFromURL ?? dataService.search.session.start();
    })();

    if (updatedSearchSessionId && updatedSearchSessionId !== currentSearchSessionId) {
      this.searchSessionId = updatedSearchSessionId;
      this.searchSessionId$.next(updatedSearchSessionId);
    }
  });

  this.integrationSubscriptions.add(searchSessionIdChangeSubscription);
}
