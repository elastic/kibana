/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { History } from 'history';
import React, { useEffect, useMemo, useState } from 'react';

import { useKibana, useExecutionContext } from '@kbn/kibana-react-plugin/public';

import { useDashboardSelector } from './state';
import { useDashboardAppState } from './hooks';
import {
  getDashboardBreadcrumb,
  getDashboardTitle,
  leaveConfirmStrings,
} from '../dashboard_strings';
import { createDashboardEditUrl } from '../dashboard_constants';
import { EmbeddableRenderer, ViewMode } from '../services/embeddable';
import { DashboardTopNav, isCompleteDashboardAppState } from './top_nav/dashboard_top_nav';
import { DashboardAppServices, DashboardEmbedSettings, DashboardRedirect } from '../types';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '../services/kibana_utils';
import { DashboardAppNoDataPage } from './dashboard_app_no_data';
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
  const {
    core,
    chrome,
    embeddable,
    onAppLeave,
    uiSettings,
    data,
    spacesService,
    screenshotModeService,
  } = useKibana<DashboardAppServices>().services;

  const [showNoDataPage, setShowNoDataPage] = useState<boolean>(false);

  const kbnUrlStateStorage = useMemo(
    () =>
      createKbnUrlStateStorage({
        history,
        useHash: uiSettings.get('state:storeInSessionStorage'),
        ...withNotifyOnErrors(core.notifications.toasts),
      }),
    [core.notifications.toasts, history, uiSettings]
  );

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'app',
    id: savedDashboardId || 'new',
  });

  const dashboardState = useDashboardSelector((state) => state.dashboardStateReducer);
  const dashboardAppState = useDashboardAppState({
    history,
    showNoDataPage,
    setShowNoDataPage,
    savedDashboardId,
    kbnUrlStateStorage,
    isEmbeddedExternally: Boolean(embedSettings),
  });

  // Build app leave handler whenever hasUnsavedChanges changes
  useEffect(() => {
    onAppLeave((actions) => {
      if (
        dashboardAppState.hasUnsavedChanges &&
        !embeddable.getStateTransfer().isTransferInProgress
      ) {
        return actions.confirm(
          leaveConfirmStrings.getLeaveSubtitle(),
          leaveConfirmStrings.getLeaveTitle()
        );
      }
      return actions.default();
    });
    return () => {
      // reset on app leave handler so leaving from the listing page doesn't trigger a confirmation
      onAppLeave((actions) => actions.default());
    };
  }, [onAppLeave, embeddable, dashboardAppState.hasUnsavedChanges]);

  // Set breadcrumbs when dashboard's title or view mode changes
  useEffect(() => {
    if (!dashboardState.title && savedDashboardId) return;
    chrome.setBreadcrumbs([
      {
        text: getDashboardBreadcrumb(),
        'data-test-subj': 'dashboardListingBreadcrumb',
        onClick: () => {
          redirectTo({ destination: 'listing' });
        },
      },
      {
        text: getDashboardTitle(dashboardState.title, dashboardState.viewMode, !savedDashboardId),
      },
    ]);
  }, [chrome, dashboardState.title, dashboardState.viewMode, redirectTo, savedDashboardId]);

  // clear search session when leaving dashboard route
  useEffect(() => {
    return () => {
      data.search.session.clear();
    };
  }, [data.search.session]);

  const printMode = useMemo(
    () => dashboardAppState.getLatestDashboardState?.().viewMode === ViewMode.PRINT,
    [dashboardAppState]
  );

  useEffect(() => {
    if (!embedSettings) chrome.setIsVisible(!printMode);
  }, [chrome, printMode, embedSettings]);

  return (
    <>
      {showNoDataPage && (
        <DashboardAppNoDataPage onDataViewCreated={() => setShowNoDataPage(false)} />
      )}
      {!showNoDataPage && isCompleteDashboardAppState(dashboardAppState) && (
        <>
          <DashboardTopNav
            printMode={printMode}
            redirectTo={redirectTo}
            embedSettings={embedSettings}
            dashboardAppState={dashboardAppState}
          />

          {dashboardAppState.savedDashboard.outcome === 'conflict' &&
          dashboardAppState.savedDashboard.id &&
          dashboardAppState.savedDashboard.aliasId
            ? spacesService?.ui.components.getLegacyUrlConflict({
                currentObjectId: dashboardAppState.savedDashboard.id,
                otherObjectId: dashboardAppState.savedDashboard.aliasId,
                otherObjectPath: `#${createDashboardEditUrl(
                  dashboardAppState.savedDashboard.aliasId
                )}${history.location.search}`,
              })
            : null}
          <div
            className={`dashboardViewport ${
              screenshotModeService && screenshotModeService.isScreenshotMode()
                ? 'dashboardViewport--screenshotMode'
                : ''
            }`}
          >
            <EmbeddableRenderer embeddable={dashboardAppState.dashboardContainer} />
          </div>
        </>
      )}
    </>
  );
}
