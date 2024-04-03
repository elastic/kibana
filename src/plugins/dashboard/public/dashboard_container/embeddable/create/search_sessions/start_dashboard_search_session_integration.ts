/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pairwise, skip } from 'rxjs';

import { noSearchSessionStorageCapabilityMessage } from '@kbn/data-plugin/public';

import { DashboardContainer } from '../../dashboard_container';
import { DashboardContainerInput } from '../../../../../common';
import { pluginServices } from '../../../../services/plugin_services';
import { DashboardCreationOptions } from '../../dashboard_container_factory';
import { getShouldRefresh } from '../../../state/diffing/dashboard_diffing_integration';

/**
 * Enables dashboard search sessions.
 */
export function startDashboardSearchSessionIntegration(
  this: DashboardContainer,
  searchSessionSettings: DashboardCreationOptions['searchSessionSettings']
) {
  if (!searchSessionSettings) return;

  const {
    data: {
      search: { session },
    },
    dashboardCapabilities: { storeSearchSession: canStoreSearchSession },
  } = pluginServices.getServices();

  const {
    sessionIdUrlChangeObservable,
    getSearchSessionIdFromURL,
    removeSessionIdFromUrl,
    createSessionRestorationDataProvider,
  } = searchSessionSettings;

  session.enableStorage(createSessionRestorationDataProvider(this), {
    isDisabled: () =>
      canStoreSearchSession
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

  // listen to and compare states to determine when to launch a new session.
  this.getInput$()
    .pipe(pairwise())
    .subscribe((states) => {
      const [previous, current] = states as DashboardContainerInput[];
      const shouldRefetch = getShouldRefresh.bind(this)(previous, current);
      if (!shouldRefetch) return;

      const currentSearchSessionId = this.getState().explicitInput.searchSessionId;

      const updatedSearchSessionId: string | undefined = (() => {
        // do not update session id if this is irrelevant state change to prevent excessive searches
        if (!shouldRefetch) return;

        let searchSessionIdFromURL = getSearchSessionIdFromURL();
        if (searchSessionIdFromURL) {
          if (session.isRestore() && session.isCurrentSession(searchSessionIdFromURL)) {
            // we had previously been in a restored session but have now changed state so remove the session id from the URL.
            removeSessionIdFromUrl();
            searchSessionIdFromURL = undefined;
          } else {
            session.restore(searchSessionIdFromURL);
          }
        }
        return searchSessionIdFromURL ?? session.start();
      })();

      if (updatedSearchSessionId && updatedSearchSessionId !== currentSearchSessionId) {
        this.searchSessionId = updatedSearchSessionId;
      }
    });

  this.integrationSubscriptions.add(searchSessionIdChangeSubscription);
}
