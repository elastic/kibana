/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './index.scss';
import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { parse, ParsedQuery } from 'query-string';
import { render, unmountComponentAtNode } from 'react-dom';
import { Switch, Route, RouteComponentProps, HashRouter, Redirect } from 'react-router-dom';

import { first } from 'rxjs/operators';
import { DashboardListing } from './listing';
import { DashboardApp } from './dashboard_app';
import { addHelpMenuToAppChrome, DashboardPanelStorage } from './lib';
import { createDashboardListingFilterUrl } from '../dashboard_constants';
import { getDashboardPageTitle, dashboardReadonlyBadge } from '../dashboard_strings';
import { createDashboardEditUrl, DashboardConstants } from '../dashboard_constants';
import { DashboardAppServices, DashboardEmbedSettings, RedirectToProps } from './types';
import {
  DashboardFeatureFlagConfig,
  DashboardSetupDependencies,
  DashboardStart,
  DashboardStartDependencies,
} from '../plugin';

import { createKbnUrlStateStorage, withNotifyOnErrors } from '../services/kibana_utils';
import { KibanaContextProvider } from '../services/kibana_react';

import {
  AppMountParameters,
  CoreSetup,
  PluginInitializerContext,
  ScopedHistory,
} from '../services/core';
import { DashboardNoMatch } from './listing/dashboard_no_match';

export const dashboardUrlParams = {
  showTopMenu: 'show-top-menu',
  showQueryInput: 'show-query-input',
  showTimeFilter: 'show-time-filter',
  hideFilterBar: 'hide-filter-bar',
};

export interface DashboardMountProps {
  appUnMounted: () => void;
  restorePreviousUrl: () => void;

  scopedHistory: ScopedHistory<unknown>;
  element: AppMountParameters['element'];
  initializerContext: PluginInitializerContext;
  onAppLeave: AppMountParameters['onAppLeave'];
  core: CoreSetup<DashboardStartDependencies, DashboardStart>;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  usageCollection: DashboardSetupDependencies['usageCollection'];
}

export async function mountApp({
  core,
  element,
  onAppLeave,
  appUnMounted,
  scopedHistory,
  usageCollection,
  initializerContext,
  restorePreviousUrl,
  setHeaderActionMenu,
}: DashboardMountProps) {
  const [coreStart, pluginsStart, dashboardStart] = await core.getStartServices();

  const {
    navigation,
    savedObjects,
    urlForwarding,
    data: dataStart,
    share: shareStart,
    embeddable: embeddableStart,
    kibanaLegacy: { dashboardConfig },
    savedObjectsTaggingOss,
    visualizations,
    presentationUtil,
  } = pluginsStart;

  const spacesApi = pluginsStart.spacesOss?.isSpacesAvailable ? pluginsStart.spacesOss : undefined;
  const activeSpaceId =
    spacesApi && (await spacesApi.getActiveSpace$().pipe(first()).toPromise())?.id;
  let globalEmbedSettings: DashboardEmbedSettings | undefined;

  const dashboardServices: DashboardAppServices = {
    navigation,
    onAppLeave,
    savedObjects,
    urlForwarding,
    usageCollection,
    core: coreStart,
    data: dataStart,
    share: shareStart,
    initializerContext,
    restorePreviousUrl,
    setHeaderActionMenu,
    chrome: coreStart.chrome,
    embeddable: embeddableStart,
    uiSettings: coreStart.uiSettings,
    scopedHistory: () => scopedHistory,
    indexPatterns: dataStart.indexPatterns,
    savedQueryService: dataStart.query.savedQueries,
    savedObjectsClient: coreStart.savedObjects.client,
    dashboardPanelStorage: new DashboardPanelStorage(
      core.notifications.toasts,
      activeSpaceId || 'default'
    ),
    savedDashboards: dashboardStart.getSavedDashboardLoader(),
    savedObjectsTagging: savedObjectsTaggingOss?.getTaggingApi(),
    allowByValueEmbeddables: initializerContext.config.get<DashboardFeatureFlagConfig>()
      .allowByValueEmbeddables,
    dashboardCapabilities: {
      hideWriteControls: dashboardConfig.getHideWriteControls(),
      show: Boolean(coreStart.application.capabilities.dashboard.show),
      saveQuery: Boolean(coreStart.application.capabilities.dashboard.saveQuery),
      createNew: Boolean(coreStart.application.capabilities.dashboard.createNew),
      mapsCapabilities: { save: Boolean(coreStart.application.capabilities.maps?.save) },
      createShortUrl: Boolean(coreStart.application.capabilities.dashboard.createShortUrl),
      visualizeCapabilities: { save: Boolean(coreStart.application.capabilities.visualize?.save) },
      storeSearchSession: Boolean(coreStart.application.capabilities.dashboard.storeSearchSession),
    },
    visualizations,
  };

  const getUrlStateStorage = (history: RouteComponentProps['history']) =>
    createKbnUrlStateStorage({
      history,
      useHash: coreStart.uiSettings.get('state:storeInSessionStorage'),
      ...withNotifyOnErrors(core.notifications.toasts),
    });

  const redirect = (routeProps: RouteComponentProps, redirectTo: RedirectToProps) => {
    const historyFunction = redirectTo.useReplace
      ? routeProps.history.replace
      : routeProps.history.push;
    let destination;
    if (redirectTo.destination === 'dashboard') {
      destination = redirectTo.id
        ? createDashboardEditUrl(redirectTo.id, redirectTo.editMode)
        : DashboardConstants.CREATE_NEW_DASHBOARD_URL;
    } else {
      destination = createDashboardListingFilterUrl(redirectTo.filter);
    }
    historyFunction(destination);
  };

  const getDashboardEmbedSettings = (
    routeParams: ParsedQuery<string>
  ): DashboardEmbedSettings | undefined => {
    return {
      forceShowTopNavMenu: Boolean(routeParams[dashboardUrlParams.showTopMenu]),
      forceShowQueryInput: Boolean(routeParams[dashboardUrlParams.showQueryInput]),
      forceShowDatePicker: Boolean(routeParams[dashboardUrlParams.showTimeFilter]),
      forceHideFilterBar: Boolean(routeParams[dashboardUrlParams.hideFilterBar]),
    };
  };

  const renderDashboard = (routeProps: RouteComponentProps<{ id?: string }>) => {
    const routeParams = parse(routeProps.history.location.search);
    if (routeParams.embed && !globalEmbedSettings) {
      globalEmbedSettings = getDashboardEmbedSettings(routeParams);
    }
    return (
      <DashboardApp
        history={routeProps.history}
        embedSettings={globalEmbedSettings}
        savedDashboardId={routeProps.match.params.id}
        redirectTo={(props: RedirectToProps) => redirect(routeProps, props)}
      />
    );
  };

  const renderListingPage = (routeProps: RouteComponentProps) => {
    coreStart.chrome.docTitle.change(getDashboardPageTitle());
    const routeParams = parse(routeProps.history.location.search);
    const title = (routeParams.title as string) || undefined;
    const filter = (routeParams.filter as string) || undefined;

    return (
      <DashboardListing
        initialFilter={filter}
        title={title}
        kbnUrlStateStorage={getUrlStateStorage(routeProps.history)}
        redirectTo={(props: RedirectToProps) => redirect(routeProps, props)}
      />
    );
  };

  const renderNoMatch = (routeProps: RouteComponentProps) => {
    return <DashboardNoMatch history={routeProps.history} />;
  };

  const hasEmbeddableIncoming = Boolean(
    dashboardServices.embeddable
      .getStateTransfer()
      .getIncomingEmbeddablePackage(DashboardConstants.DASHBOARDS_ID, false)
  );
  if (!hasEmbeddableIncoming) {
    dataStart.indexPatterns.clearCache();
  }

  // dispatch synthetic hash change event to update hash history objects
  // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
  const unlistenParentHistory = scopedHistory.listen(() => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  const app = (
    <I18nProvider>
      <KibanaContextProvider services={dashboardServices}>
        <presentationUtil.ContextProvider>
          <HashRouter>
            <Switch>
              <Route
                path={[
                  DashboardConstants.CREATE_NEW_DASHBOARD_URL,
                  `${DashboardConstants.VIEW_DASHBOARD_URL}/:id`,
                ]}
                render={renderDashboard}
              />
              <Route exact path={DashboardConstants.LANDING_PAGE_PATH} render={renderListingPage} />
              <Route exact path="/">
                <Redirect to={DashboardConstants.LANDING_PAGE_PATH} />
              </Route>
              <Route render={renderNoMatch} />
            </Switch>
          </HashRouter>
        </presentationUtil.ContextProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );

  addHelpMenuToAppChrome(dashboardServices.chrome, coreStart.docLinks);
  if (dashboardServices.dashboardCapabilities.hideWriteControls) {
    coreStart.chrome.setBadge({
      text: dashboardReadonlyBadge.getText(),
      tooltip: dashboardReadonlyBadge.getTooltip(),
      iconType: 'glasses',
    });
  }
  render(app, element);
  return () => {
    unlistenParentHistory();
    unmountComponentAtNode(element);
    appUnMounted();
  };
}
