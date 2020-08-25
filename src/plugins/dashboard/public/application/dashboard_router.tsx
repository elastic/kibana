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
import { AppMountParameters, CoreSetup, ScopedHistory } from 'kibana/public';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router, Switch, Route, RouteComponentProps } from 'react-router-dom';
import { Storage } from '../../../kibana_utils/public';
import { DashboardStartDependencies, DashboardStart, DashboardSetupDependencies } from '../plugin';
import { DashboardServices } from './application';
import { KibanaContextProvider } from '../../../kibana_react/public';
import { DashboardListing } from './listing/dashboard_listing';
import { DashboardConstants } from '..';

export async function mountApp(
  core: CoreSetup<DashboardStartDependencies, DashboardStart>,
  usageCollection: DashboardSetupDependencies['usageCollection'],
  element: AppMountParameters['element'],
  scopedHistory: ScopedHistory<unknown>,
  restorePreviousUrl: () => void
) {
  const [coreStart, pluginsStart, dashboardStart] = await core.getStartServices();

  const {
    embeddable: embeddableStart,
    navigation,
    share: shareStart,
    data: dataStart,
    kibanaLegacy: { dashboardConfig, navigateToDefaultApp, navigateToLegacyKibanaUrl },
    savedObjects,
  } = pluginsStart;

  const dashboardServices: DashboardServices = {
    core: coreStart,
    dashboardConfig,
    navigateToDefaultApp,
    navigateToLegacyKibanaUrl,
    navigation,
    share: shareStart,
    data: dataStart,
    savedObjectsClient: coreStart.savedObjects.client,
    savedDashboards: dashboardStart.getSavedDashboardLoader(),
    chrome: coreStart.chrome,
    addBasePath: coreStart.http.basePath.prepend,
    uiSettings: coreStart.uiSettings,
    savedQueryService: dataStart.query.savedQueries,
    embeddable: embeddableStart,
    dashboardCapabilities: coreStart.application.capabilities.dashboard,
    embeddableCapabilities: {
      visualizeCapabilities: coreStart.application.capabilities.visualize,
      mapsCapabilities: coreStart.application.capabilities.maps,
    },
    localStorage: new Storage(localStorage),
    usageCollection,
    scopedHistory: () => scopedHistory,
    savedObjects,
    restorePreviousUrl,
  };

  const renderDashboard = (routeProps: RouteComponentProps<{ id?: string }>) => {
    return <h1>This will be a dashboard</h1>;
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
                `${DashboardConstants.EDIT_DASHBOARD_URL}/:id`,
              ]}
              render={renderDashboard}
            />
            <Route exact path={DashboardConstants.LANDING_PAGE_PATH} component={DashboardListing} />
          </Switch>
        </KibanaContextProvider>
      </Router>
    </I18nProvider>
  );

  render(app, element);
  return () => unmountComponentAtNode(element);
}
