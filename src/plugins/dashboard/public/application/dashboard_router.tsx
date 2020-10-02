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

import React from 'react';

import { I18nProvider } from '@kbn/i18n/react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router, Switch, Route, RouteComponentProps } from 'react-router-dom';
import { parse } from 'query-string';
import { Storage } from '../../../kibana_utils/public';
import { KibanaContextProvider } from '../../../kibana_react/public';
import { DashboardListing, Dashboard404 } from './listing';
import { DashboardAppServices, DashboardMountProps } from './types';
import { DashboardSavedObject } from '../saved_dashboards';
import { DashboardApp } from './dashboard_app';
import { createDashboardEditUrl, DashboardConstants } from '..';

export async function mountApp({
  core,
  element,
  scopedHistory,
  usageCollection,
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
  } = pluginsStart;

  const dashboardServices: DashboardAppServices = {
    navigation,
    savedObjects,
    usageCollection,
    core: coreStart,
    dashboardConfig,
    data: dataStart,
    share: shareStart,
    restorePreviousUrl,
    setHeaderActionMenu,
    navigateToDefaultApp,
    chrome: coreStart.chrome,
    navigateToLegacyKibanaUrl,
    embeddable: embeddableStart,
    uiSettings: coreStart.uiSettings,
    scopedHistory: () => scopedHistory,
    indexPatterns: dataStart.indexPatterns,
    localStorage: new Storage(localStorage),
    addBasePath: coreStart.http.basePath.prepend,
    savedQueryService: dataStart.query.savedQueries,
    savedObjectsClient: coreStart.savedObjects.client,
    savedDashboards: dashboardStart.getSavedDashboardLoader(),
    dashboardCapabilities: coreStart.application.capabilities.dashboard,
    embeddableCapabilities: {
      visualizeCapabilities: coreStart.application.capabilities.visualize,
      mapsCapabilities: coreStart.application.capabilities.maps,
    },
  };

  const renderDashboard = (routeProps: RouteComponentProps<{ id?: string }>) => {
    return (
      <DashboardApp history={routeProps.history} savedDashboardId={routeProps.match.params.id} />
    );
  };

  const renderListingPage = (routeProps: RouteComponentProps) => {
    const searchParams = parse(routeProps.history.location.search);
    const title = (searchParams.title as string) || undefined;
    const filter = (searchParams.filter as string) || undefined;
    return (
      <DashboardListing
        initialFilter={filter}
        title={title}
        redirectTo={(id) => routeProps.history.replace(createDashboardEditUrl(id))}
      />
    );
  };

  // make sure the index pattern list is up to date
  await dataStart.indexPatterns.clearCache();

  const app = (
    <I18nProvider>
      <Router history={scopedHistory}>
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
      </Router>
    </I18nProvider>
  );

  render(app, element);
  return () => unmountComponentAtNode(element);
}
