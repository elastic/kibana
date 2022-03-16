/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './index.scss';
import React from 'react';
import { History } from 'history';
import { Provider } from 'react-redux';
import { first } from 'rxjs/operators';
import { I18nProvider } from '@kbn/i18n-react';
import { parse, ParsedQuery } from 'query-string';
import { render, unmountComponentAtNode } from 'react-dom';
import { Switch, Route, RouteComponentProps, HashRouter, Redirect } from 'react-router-dom';

import { DashboardListing } from './listing';
import { dashboardStateStore } from './state';
import { DashboardApp } from './dashboard_app';
import { DashboardNoMatch } from './listing/dashboard_no_match';
import { KibanaContextProvider, KibanaThemeProvider } from '../services/kibana_react';
import { addHelpMenuToAppChrome, DashboardSessionStorage } from './lib';
import { createDashboardListingFilterUrl } from '../dashboard_constants';
import { createDashboardEditUrl, DashboardConstants } from '../dashboard_constants';
import { getDashboardPageTitle, dashboardReadonlyBadge } from '../dashboard_strings';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '../services/kibana_utils';
import { DashboardAppServices, DashboardEmbedSettings, RedirectToProps } from '../types';
import {
  DashboardFeatureFlagConfig,
  DashboardSetupDependencies,
  DashboardStart,
  DashboardStartDependencies,
} from '../plugin';
import {
  AppMountParameters,
  CoreSetup,
  PluginInitializerContext,
  ScopedHistory,
} from '../services/core';

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
    spaces: spacesApi,
    embeddable: embeddableStart,
    savedObjectsTaggingOss,
    visualizations,
    presentationUtil,
    screenshotMode,
  } = pluginsStart;

  const activeSpaceId =
    spacesApi && (await spacesApi.getActiveSpace$().pipe(first()).toPromise())?.id;
  let globalEmbedSettings: DashboardEmbedSettings | undefined;
  let routerHistory: History;

  const dashboardServices: DashboardAppServices = {
    navigation,
    onAppLeave,
    savedObjects,
    urlForwarding,
    visualizations,
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
    screenshotModeService: screenshotMode,
    dataViews: dataStart.dataViews,
    savedQueryService: dataStart.query.savedQueries,
    savedObjectsClient: coreStart.savedObjects.client,
    savedDashboards: dashboardStart.getSavedDashboardLoader(),
    savedObjectsTagging: savedObjectsTaggingOss?.getTaggingApi(),
    allowByValueEmbeddables:
      initializerContext.config.get<DashboardFeatureFlagConfig>().allowByValueEmbeddables,
    dashboardCapabilities: {
      show: Boolean(coreStart.application.capabilities.dashboard.show),
      saveQuery: Boolean(coreStart.application.capabilities.dashboard.saveQuery),
      createNew: Boolean(coreStart.application.capabilities.dashboard.createNew),
      mapsCapabilities: { save: Boolean(coreStart.application.capabilities.maps?.save) },
      createShortUrl: Boolean(coreStart.application.capabilities.dashboard.createShortUrl),
      showWriteControls: Boolean(coreStart.application.capabilities.dashboard.showWriteControls),
      visualizeCapabilities: { save: Boolean(coreStart.application.capabilities.visualize?.save) },
      storeSearchSession: Boolean(coreStart.application.capabilities.dashboard.storeSearchSession),
    },
    dashboardSessionStorage: new DashboardSessionStorage(
      core.notifications.toasts,
      activeSpaceId || 'default'
    ),
    spacesService: spacesApi,
  };

  const getUrlStateStorage = (history: RouteComponentProps['history']) =>
    createKbnUrlStateStorage({
      history,
      useHash: coreStart.uiSettings.get('state:storeInSessionStorage'),
      ...withNotifyOnErrors(core.notifications.toasts),
    });

  const redirect = (redirectTo: RedirectToProps) => {
    if (!routerHistory) return;
    const historyFunction = redirectTo.useReplace ? routerHistory.replace : routerHistory.push;
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
    if (!routerHistory) {
      routerHistory = routeProps.history;
    }
    return (
      <DashboardApp
        history={routeProps.history}
        embedSettings={globalEmbedSettings}
        savedDashboardId={routeProps.match.params.id}
        redirectTo={redirect}
      />
    );
  };

  const renderListingPage = (routeProps: RouteComponentProps) => {
    coreStart.chrome.docTitle.change(getDashboardPageTitle());
    const routeParams = parse(routeProps.history.location.search);
    const title = (routeParams.title as string) || undefined;
    const filter = (routeParams.filter as string) || undefined;
    if (!routerHistory) {
      routerHistory = routeProps.history;
    }
    return (
      <DashboardListing
        initialFilter={filter}
        title={title}
        kbnUrlStateStorage={getUrlStateStorage(routeProps.history)}
        redirectTo={redirect}
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
    dataStart.dataViews.clearCache();
  }

  // dispatch synthetic hash change event to update hash history objects
  // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
  const unlistenParentHistory = scopedHistory.listen(() => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  const app = (
    <I18nProvider>
      <Provider store={dashboardStateStore}>
        <KibanaContextProvider services={dashboardServices}>
          <presentationUtil.ContextProvider>
            <KibanaThemeProvider theme$={core.theme.theme$}>
              <HashRouter>
                <Switch>
                  <Route
                    path={[
                      DashboardConstants.CREATE_NEW_DASHBOARD_URL,
                      `${DashboardConstants.VIEW_DASHBOARD_URL}/:id`,
                    ]}
                    render={renderDashboard}
                  />
                  <Route
                    exact
                    path={DashboardConstants.LANDING_PAGE_PATH}
                    render={renderListingPage}
                  />
                  <Route exact path="/">
                    <Redirect to={DashboardConstants.LANDING_PAGE_PATH} />
                  </Route>
                  <Route render={renderNoMatch} />
                </Switch>
              </HashRouter>
            </KibanaThemeProvider>
          </presentationUtil.ContextProvider>
        </KibanaContextProvider>
      </Provider>
    </I18nProvider>
  );

  addHelpMenuToAppChrome(dashboardServices.chrome, coreStart.docLinks);
  if (!dashboardServices.dashboardCapabilities.showWriteControls) {
    coreStart.chrome.setBadge({
      text: dashboardReadonlyBadge.getText(),
      tooltip: dashboardReadonlyBadge.getTooltip(),
      iconType: 'glasses',
    });
  }
  render(app, element);
  return () => {
    dataStart.search.session.clear();
    unlistenParentHistory();
    unmountComponentAtNode(element);
    appUnMounted();
  };
}
