/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { noSearchSessionStorageCapabilityMessage } from '@kbn/data-plugin/public';

import { DashboardContainer } from '../../dashboard_container';
import { pluginServices } from '../../../../services/plugin_services';
import { DashboardContainerByValueInput } from '../../../../../common';
import { DashboardCreationOptions } from '../../dashboard_container_factory';

/**
 * input keys that will not cause a new session to be created.
 */
const noRefetchKeys: Readonly<Array<keyof DashboardContainerByValueInput>> = [
  'title',
  'panels',
  'viewMode',
  'useMargins',
  'description',
  'searchSessionId', // ignoring search session ID because this function will change it
  'isEmbeddedExternally',
] as const;

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

  // force refresh when the session id in the URL changes.
  const searchSessionIdChangeSubscription = sessionIdUrlChangeObservable?.subscribe(() =>
    this.forceRefresh()
  );

  const handleSearchSessionChange = (changedKeys: Array<keyof DashboardContainerByValueInput>) => {
    const {
      getState,
      dispatch,
      actions: { setSearchSessionId },
    } = this.getReduxEmbeddableTools();
    const currentSearchSessionId = getState().explicitInput.searchSessionId;

    const shouldRefetch = changedKeys.some((changeKey) => !noRefetchKeys.includes(changeKey));
    if (!shouldRefetch) return;

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
  };

  return {
    initialSearchSessionId,
    handleSearchSessionChange,
    stopSyncingDashboardSearchSessions: () => {
      searchSessionIdChangeSubscription?.unsubscribe();
    },
  };
}
