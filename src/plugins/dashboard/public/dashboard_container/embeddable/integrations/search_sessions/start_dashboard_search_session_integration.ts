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
import { DashboardCreationOptions } from '../../dashboard_container_factory';

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
  const { createSessionRestorationDataProvider, sessionIdToRestore, sessionIdChangeObservable } =
    searchSessionSettings;

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

  const searchSessionIdChangeSubscription = sessionIdChangeObservable?.subscribe(() =>
    this.forceRefresh()
  );

  return {
    initialSearchSessionId,
    stopSyncingDashboardSearchSessions: () => searchSessionIdChangeSubscription?.unsubscribe(),
  };
}
