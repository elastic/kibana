/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { History } from 'history';
import React, { useEffect, useMemo, useState } from 'react';

import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';

import { DASHBOARD_APP_ID } from '../dashboard_constants';
import { pluginServices } from '../services/plugin_services';
import { DashboardTopNav } from './top_nav/dashboard_top_nav';
import type { DashboardContainer } from '../dashboard_container';
import { DashboardAppNoDataPage } from './dashboard_app_no_data';
import { type DashboardEmbedSettings, DashboardRedirect } from './types';
import { useDashboardOutcomeValidation } from './hooks/use_dashboard_outcome_validation';
import DashboardContainerRenderer from '../dashboard_container/dashboard_container_renderer';
import type { DashboardCreationOptions } from '../dashboard_container/embeddable/dashboard_container_factory';
import { loadDashboardHistoryLocationState } from './locator/load_dashboard_history_location_state';
import { useDashboardMountContext } from './hooks/dashboard_mount_context';

export interface DashboardAppProps {
  history: History;
  savedDashboardId?: string;
  redirectTo: DashboardRedirect;
  embedSettings?: DashboardEmbedSettings;
}

export function DashboardApp({
  savedDashboardId,
  embedSettings,
  redirectTo,
  history,
}: DashboardAppProps) {
  const [showNoDataPage, setShowNoDataPage] = useState<boolean>(false);
  const [dashboardContainer, setDashboardContainer] = useState<DashboardContainer | undefined>(
    undefined
  );

  const { scopedHistory: getScopedHistory } = useDashboardMountContext();
  const scopedHistory = getScopedHistory?.();

  /**
   * Unpack dashboard services
   */
  const {
    screenshotMode: { isScreenshotMode },
    coreContext: { executionContext },
    embeddable: { getStateTransfer },
    notifications: { toasts },
    settings: { uiSettings },
    data: { search },
  } = pluginServices.getServices();

  const incomingEmbeddable = getStateTransfer().getIncomingEmbeddablePackage(
    DASHBOARD_APP_ID,
    true
  );

  const DashboardReduxWrapper = useMemo(
    () => dashboardContainer?.getReduxEmbeddableTools().Wrapper,
    [dashboardContainer]
  );

  const kbnUrlStateStorage = useMemo(
    () =>
      createKbnUrlStateStorage({
        history,
        useHash: uiSettings.get('state:storeInSessionStorage'),
        ...withNotifyOnErrors(toasts),
      }),
    [toasts, history, uiSettings]
  );

  useExecutionContext(executionContext, {
    type: 'application',
    page: 'app',
    id: savedDashboardId || 'new',
  });

  // clear search session when leaving dashboard route
  useEffect(() => {
    return () => {
      search.session.clear();
    };
  }, [search.session]);

  const { validateOutcome, getLegacyConflictWarning } = useDashboardOutcomeValidation({
    redirectTo,
  });

  // create settings to pass into the dashboard renderer
  const creationOptions: DashboardCreationOptions = useMemo(() => {
    return {
      unifiedSearchSettings: {
        kbnUrlStateStorage,
      },
      overrideInput: {
        ...loadDashboardHistoryLocationState(scopedHistory),
      }, // override input loaded from dashboard saved object with locator and URL input
      incomingEmbeddable,
      backupStateToSessionStorage: true,
      validateLoadedSavedObject: validateOutcome,
    };
  }, [incomingEmbeddable, kbnUrlStateStorage, validateOutcome, scopedHistory]);

  return (
    <>
      {showNoDataPage && (
        <DashboardAppNoDataPage onDataViewCreated={() => setShowNoDataPage(false)} />
      )}
      {!showNoDataPage && (
        <>
          {DashboardReduxWrapper && (
            <DashboardReduxWrapper>
              <DashboardTopNav redirectTo={redirectTo} embedSettings={embedSettings} />
            </DashboardReduxWrapper>
          )}

          {getLegacyConflictWarning?.()}
          <div
            className={`dashboardViewport ${
              isScreenshotMode() ? 'dashboardViewport--screenshotMode' : ''
            }`}
          >
            <DashboardContainerRenderer
              savedObjectId={savedDashboardId}
              onDashboardContainerLoaded={(finishedContainer) => {
                setDashboardContainer(finishedContainer);
              }}
              getInitialInput={() => {
                return { savedObjectId: savedDashboardId };
              }}
              getCreationOptions={async () => creationOptions}
            />
          </div>
        </>
      )}
    </>
  );
}
