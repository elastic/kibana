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

import { DashboardContainer } from '../dashboard_container';
import { pluginServices } from '../services/plugin_services';
import { DashboardTopNav } from './top_nav/dashboard_top_nav';
import { DashboardAppNoDataPage } from './dashboard_app_no_data';
import { DashboardEmbedSettings, DashboardRedirect } from './types';
import DashboardContainerRenderer from '../dashboard_container/dashboard_container_renderer';
import { DASHBOARD_APP_ID } from '../dashboard_constants';
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

          {/* TODO CONFLICT WARNING {dashboardAppState.createConflictWarning?.()} */}
          <div
            className={`dashboardViewport ${
              isScreenshotMode() ? 'dashboardViewport--screenshotMode' : ''
            }`}
          >
            <DashboardContainerRenderer
              onDashboardContainerLoaded={(finishedContainer) =>
                setDashboardContainer(finishedContainer)
              }
              getInitialInput={() => {
                return { savedObjectId: savedDashboardId };
              }}
              getCreationOptions={async () => {
                return {
                  incomingEmbeddable,
                };
              }}
            />
          </div>
        </>
      )}
    </>
  );
}
