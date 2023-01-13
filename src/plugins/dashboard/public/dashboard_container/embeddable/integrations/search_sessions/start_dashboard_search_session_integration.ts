/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subscription } from 'rxjs';
import { debounceTime, pairwise, skip } from 'rxjs/operators';
import { noSearchSessionStorageCapabilityMessage } from '@kbn/data-plugin/public';

import { DashboardContainer } from '../../dashboard_container';
import { pluginServices } from '../../../../services/plugin_services';
import { DashboardContainerByValueInput } from '../../../../../common';
import { CHANGE_CHECK_DEBOUNCE } from '../../../../dashboard_constants';
import { DashboardCreationOptions } from '../../dashboard_container_factory';
import { getUnsavedChanges } from '../diff_state/dashboard_diffing_integration';

/**
 * input keys that will cause a new session to be created.
 */
const refetchKeys: Array<keyof DashboardContainerByValueInput> = [
  'query',
  'filters',
  'timeRange',
  'timeslice',
  'timeRestore',
  'lastReloadRequestTime',

  // also refetch when chart settings change
  'syncColors',
  'syncCursor',
  'syncTooltips',
];

/**
 * Enables dashboard search sessions.
 */
export function startDashboardSearchSessionIntegration(
  this: DashboardContainer,
  searchSessionSettings: DashboardCreationOptions['searchSessionSettings'],
  incomingEmbeddable: DashboardCreationOptions['incomingEmbeddable']
) {
  if (!searchSessionSettings) {
    throw new Error('Cannot start search sessions integration without settings');
  }
  const {
    createSessionRestorationDataProvider,
    sessionIdUrlChangeObservable,
    getSearchSessionIdFromURL,
    removeSessionIdFromUrl,
    sessionIdToRestore,
  } = searchSessionSettings;

  const {
    data: {
      search: { session },
    },
    dashboardCapabilities: { storeSearchSession: canStoreSearchSession },
  } = pluginServices.getServices();

  // if this incoming embeddable has a session, continue it.
  if (incomingEmbeddable?.searchSessionId) {
    session.continue(incomingEmbeddable.searchSessionId);
  }
  if (sessionIdToRestore) {
    session.restore(sessionIdToRestore);
  }
  const existingSession = session.getSessionId();

  const initialSearchSessionId =
    sessionIdToRestore ??
    (existingSession && incomingEmbeddable ? existingSession : session.start());

  session.enableStorage(createSessionRestorationDataProvider(this), {
    isDisabled: () =>
      canStoreSearchSession
        ? { disabled: false }
        : {
            disabled: true,
            reasonText: noSearchSessionStorageCapabilityMessage,
          },
  });

  let searchSessionIdChangeSubscription: Subscription | undefined;
  let checkForSessionChangeSubscription: Subscription | undefined;
  this.untilInitialized().then(() => {
    // force refresh when the session id in the URL changes. This will also fire off the "handle search session change" below.
    searchSessionIdChangeSubscription = sessionIdUrlChangeObservable
      ?.pipe(skip(1))
      .subscribe(() => this.forceRefresh());

    // listen to and compare states to determine when to launch a new session.
    this.getInput$()
      .pipe(pairwise(), debounceTime(CHANGE_CHECK_DEBOUNCE))
      .subscribe(async (states) => {
        const [previous, current] = states as DashboardContainerByValueInput[];
        const changes = await getUnsavedChanges.bind(this)(previous, current, refetchKeys);
        const shouldRefetch = Object.keys(changes).length > 0;
        if (!shouldRefetch) return;

        const {
          getState,
          dispatch,
          actions: { setSearchSessionId },
        } = this.getReduxEmbeddableTools();
        const currentSearchSessionId = getState().explicitInput.searchSessionId;

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
          dispatch(setSearchSessionId(updatedSearchSessionId));
        }
      });
  });

  return {
    initialSearchSessionId,
    stopSyncingDashboardSearchSessions: () => {
      checkForSessionChangeSubscription?.unsubscribe();
      searchSessionIdChangeSubscription?.unsubscribe();
    },
  };
}
