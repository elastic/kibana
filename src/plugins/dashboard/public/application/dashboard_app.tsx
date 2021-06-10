/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { History } from 'history';
import React, { useEffect, useMemo } from 'react';

import { useDashboardSelector } from './state';
import { useDashboardAppState } from './hooks';
import { useKibana } from '../../../kibana_react/public';
import {
  getDashboardBreadcrumb,
  getDashboardTitle,
  leaveConfirmStrings,
} from '../dashboard_strings';
import { EmbeddableRenderer } from '../services/embeddable';
import { DashboardTopNav, isCompleteDashboardAppState } from './top_nav/dashboard_top_nav';
import { DashboardAppServices, DashboardEmbedSettings, DashboardRedirect } from '../types';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '../services/kibana_utils';
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
  } = useKibana<DashboardAppServices>().services;

  const kbnUrlStateStorage = useMemo(
    () =>
      createKbnUrlStateStorage({
        history,
        useHash: uiSettings.get('state:storeInSessionStorage'),
        ...withNotifyOnErrors(core.notifications.toasts),
      }),
    [core.notifications.toasts, history, uiSettings]
  );

  const dashboardState = useDashboardSelector((state) => state.dashboardStateReducer);
  const dashboardAppState = useDashboardAppState({
    history,
    redirectTo,
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

  return (
    <>
      {isCompleteDashboardAppState(dashboardAppState) && (
        <>
          <DashboardTopNav
            redirectTo={redirectTo}
            embedSettings={embedSettings}
            dashboardAppState={dashboardAppState}
          />
          <div className="dashboardViewport">
            <EmbeddableRenderer embeddable={dashboardAppState.dashboardContainer} />
          </div>
        </>
      )}
    </>
  );
}
