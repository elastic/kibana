/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { History } from 'history';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { EmbeddableRenderer, ViewMode } from '@kbn/embeddable-plugin/public';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';

import { useDashboardSelector } from './state';
import { useDashboardAppState } from './hooks';
import {
  dashboardFeatureCatalog,
  getDashboardBreadcrumb,
  getDashboardTitle,
  leaveConfirmStrings,
} from '../dashboard_strings';
import { createDashboardEditUrl } from '../dashboard_constants';
import { DashboardTopNav, isCompleteDashboardAppState } from './top_nav/dashboard_top_nav';
import { DashboardEmbedSettings, DashboardRedirect } from '../types';
import { DashboardAppNoDataPage } from './dashboard_app_no_data';
import { pluginServices } from '../services/plugin_services';
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
  const { onAppLeave } = useDashboardMountContext();
  const {
    chrome: { setBreadcrumbs, setIsVisible },
    coreContext: { executionContext },
    data: { search },
    embeddable: { getStateTransfer },
    notifications: { toasts },
    screenshotMode: { isScreenshotMode },
    settings: { uiSettings },
    spaces: { getLegacyUrlConflict },
  } = pluginServices.getServices();

  const [showNoDataPage, setShowNoDataPage] = useState<boolean>(false);
  const dashboardTitleRef = useRef<HTMLHeadingElement>(null);

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

  const dashboardState = useDashboardSelector((state) => state.dashboardStateReducer);
  const dashboardAppState = useDashboardAppState({
    history,
    showNoDataPage,
    setShowNoDataPage,
    savedDashboardId,
    kbnUrlStateStorage,
    isEmbeddedExternally: Boolean(embedSettings),
  });

  // focus on the top header when title or view mode is changed
  useEffect(() => {
    dashboardTitleRef.current?.focus();
  }, [dashboardState.title, dashboardState.viewMode]);

  const dashboardTitle = useMemo(() => {
    return getDashboardTitle(dashboardState.title, dashboardState.viewMode, !savedDashboardId);
  }, [dashboardState.title, dashboardState.viewMode, savedDashboardId]);

  // Build app leave handler whenever hasUnsavedChanges changes
  useEffect(() => {
    onAppLeave((actions) => {
      if (dashboardAppState.hasUnsavedChanges && !getStateTransfer().isTransferInProgress) {
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
  }, [onAppLeave, getStateTransfer, dashboardAppState.hasUnsavedChanges]);

  // Set breadcrumbs when dashboard's title or view mode changes
  useEffect(() => {
    if (!dashboardState.title && savedDashboardId) return;
    setBreadcrumbs([
      {
        text: getDashboardBreadcrumb(),
        'data-test-subj': 'dashboardListingBreadcrumb',
        onClick: () => {
          redirectTo({ destination: 'listing' });
        },
      },
      {
        text: dashboardTitle,
      },
    ]);
  }, [setBreadcrumbs, dashboardState.title, redirectTo, savedDashboardId, dashboardTitle]);

  // clear search session when leaving dashboard route
  useEffect(() => {
    return () => {
      search.session.clear();
    };
  }, [search.session]);

  const printMode = useMemo(
    () => dashboardAppState.getLatestDashboardState?.().viewMode === ViewMode.PRINT,
    [dashboardAppState]
  );

  useEffect(() => {
    if (!embedSettings) setIsVisible(!printMode);
  }, [setIsVisible, printMode, embedSettings]);

  return (
    <>
      <h1
        id="dashboardTitle"
        className="euiScreenReaderOnly"
        ref={dashboardTitleRef}
        tabIndex={-1}
      >{`${dashboardFeatureCatalog.getTitle()} - ${dashboardTitle}`}</h1>
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
            ? getLegacyUrlConflict?.({
                currentObjectId: dashboardAppState.savedDashboard.id,
                otherObjectId: dashboardAppState.savedDashboard.aliasId,
                otherObjectPath: `#${createDashboardEditUrl(
                  dashboardAppState.savedDashboard.aliasId
                )}${history.location.search}`,
              })
            : null}
          <div
            className={`dashboardViewport ${
              isScreenshotMode() ? 'dashboardViewport--screenshotMode' : ''
            }`}
          >
            <EmbeddableRenderer embeddable={dashboardAppState.dashboardContainer} />
          </div>
        </>
      )}
    </>
  );
}
