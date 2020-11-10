/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import './index.scss';
import React from 'react';

import { I18nProvider } from '@kbn/i18n/react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Switch, Route, RouteComponentProps, HashRouter } from 'react-router-dom';
import { parse, ParsedQuery } from 'query-string';
import { isNil } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  createKbnUrlStateStorage,
  Storage,
  withNotifyOnErrors,
} from '../../../kibana_utils/public';
import { KibanaContextProvider } from '../../../kibana_react/public';
import { DashboardListing, Dashboard404 } from './listing';
import {
  DashboardAppServices,
  DashboardEmbedSettings,
  DashboardMountProps,
  RedirectToDashboardProps,
} from './types';
import { DashboardApp } from './dashboard_app';
import { createDashboardListingFilterUrl } from '../dashboard_constants';
import { createDashboardEditUrl, DashboardConstants } from '..';

export enum UrlParams {
  SHOW_TOP_MENU = 'show-top-menu',
  SHOW_QUERY_INPUT = 'show-query-input',
  SHOW_TIME_FILTER = 'show-time-filter',
  SHOW_FILTER_BAR = 'show-filter-bar',
  HIDE_FILTER_BAR = 'hide-filter-bar',
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
    data: dataStart,
    share: shareStart,
    embeddable: embeddableStart,
    kibanaLegacy: { dashboardConfig },
    urlForwarding: { navigateToDefaultApp, navigateToLegacyKibanaUrl },
    savedObjectsTaggingOss,
  } = pluginsStart;

  const dashboardServices: DashboardAppServices = {
    navigation,
    onAppLeave,
    savedObjects,
    usageCollection,
    core: coreStart,
    data: dataStart,
    share: shareStart,
    initializerContext,
    restorePreviousUrl,
    setHeaderActionMenu,
    navigateToDefaultApp,
    chrome: coreStart.chrome,
    navigateToLegacyKibanaUrl,
    embeddable: embeddableStart,
    uiSettings: coreStart.uiSettings,
    scopedHistory: () => scopedHistory,
    indexPatterns: dataStart.indexPatterns,
    savedObjectsTagging: savedObjectsTaggingOss?.getTaggingApi(),
    localStorage: new Storage(localStorage),
    addBasePath: coreStart.http.basePath.prepend,
    savedQueryService: dataStart.query.savedQueries,
    savedObjectsClient: coreStart.savedObjects.client,
    savedDashboards: dashboardStart.getSavedDashboardLoader(),
    dashboardCapabilities: {
      hideWriteControls: dashboardConfig.getHideWriteControls(),
      visualizeCapabilities: { save: Boolean(coreStart.application.capabilities.visualize?.save) },
      mapsCapabilities: { save: Boolean(coreStart.application.capabilities.maps?.save) },
      createNew: Boolean(coreStart.application.capabilities.dashboard.createNew),
      show: Boolean(coreStart.application.capabilities.dashboard.show),
      showWriteControls: Boolean(coreStart.application.capabilities.dashboard.showWriteControls),
      createShortUrl: Boolean(coreStart.application.capabilities.dashboard.createShortUrl),
      saveQuery: Boolean(coreStart.application.capabilities.dashboard.saveQuery),
    },
  };

  const getUrlStateStorage = (history: RouteComponentProps['history']) =>
    createKbnUrlStateStorage({
      history,
      useHash: coreStart.uiSettings.get('state:storeInSessionStorage'),
      ...withNotifyOnErrors(core.notifications.toasts),
    });

  const redirect = (
    routeProps: RouteComponentProps,
    { id, useReplace, listingFilter: filter }: RedirectToDashboardProps
  ) => {
    const historyFunction = useReplace ? routeProps.history.replace : routeProps.history.push;
    const destination = id
      ? createDashboardEditUrl(id)
      : !isNil(filter)
      ? createDashboardListingFilterUrl(filter)
      : DashboardConstants.CREATE_NEW_DASHBOARD_URL;
    historyFunction(destination);
  };

  const getDashboardEmbedSettings = (
    routeParams: ParsedQuery<string>
  ): DashboardEmbedSettings | undefined => {
    if (!routeParams.embed) {
      return undefined;
    }
    return {
      forceShowTopNavMenu: Boolean(routeParams[UrlParams.SHOW_TOP_MENU]),
      forceShowQueryInput: Boolean(routeParams[UrlParams.SHOW_QUERY_INPUT]),
      forceShowDatePicker: Boolean(routeParams[UrlParams.SHOW_TIME_FILTER]),
      forceHideFilterBar: Boolean(routeParams[UrlParams.HIDE_FILTER_BAR]),
    };
  };

  const renderDashboard = (routeProps: RouteComponentProps<{ id?: string }>) => {
    const routeParams = parse(routeProps.history.location.search);
    const embedSettings = getDashboardEmbedSettings(routeParams);
    return (
      <DashboardApp
        history={routeProps.history}
        embedSettings={embedSettings}
        savedDashboardId={routeProps.match.params.id}
        redirectToDashboard={(props: RedirectToDashboardProps) => redirect(routeProps, props)}
      />
    );
  };

  const renderListingPage = (routeProps: RouteComponentProps) => {
    coreStart.chrome.docTitle.change(
      i18n.translate('dashboard.dashboardPageTitle', { defaultMessage: 'Dashboards' })
    );
    const routeParams = parse(routeProps.history.location.search);
    const title = (routeParams.title as string) || undefined;
    const filter = (routeParams.filter as string) || undefined;
    return (
      <DashboardListing
        initialFilter={filter}
        title={title}
        kbnUrlStateStorage={getUrlStateStorage(routeProps.history)}
        redirectToDashboard={(props: RedirectToDashboardProps) => redirect(routeProps, props)}
      />
    );
  };

  // make sure the index pattern list is up to date
  await dataStart.indexPatterns.clearCache();

  const app = (
    <I18nProvider>
      <HashRouter>
        <KibanaContextProvider services={dashboardServices}>
          <Switch>
            <Route
              path={[
                DashboardConstants.CREATE_NEW_DASHBOARD_URL,
                `${DashboardConstants.VIEW_DASHBOARD_URL}/:id`,
              ]}
              render={renderDashboard}
            />
            <Route exact path={DashboardConstants.LANDING_PAGE_PATH} render={renderListingPage} />
            <Dashboard404 />
          </Switch>
        </KibanaContextProvider>
      </HashRouter>
    </I18nProvider>
  );

  render(app, element);
  return () => {
    dataStart.search.session.clear();
    unmountComponentAtNode(element);
    appUnMounted();
  };
}
