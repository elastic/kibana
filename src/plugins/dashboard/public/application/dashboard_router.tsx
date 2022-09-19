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
import { I18nProvider, FormattedRelative } from '@kbn/i18n-react';
import { parse, ParsedQuery } from 'query-string';
import { render, unmountComponentAtNode } from 'react-dom';
import { Switch, Route, RouteComponentProps, HashRouter, Redirect } from 'react-router-dom';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import {
  TableListViewKibanaDependencies,
  TableListViewKibanaProvider,
} from '@kbn/content-management-table-list';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import { AppMountParameters, CoreSetup } from '@kbn/core/public';

import { DashboardListing } from './listing';
import { dashboardStateStore } from './state';
import { DashboardApp } from './dashboard_app';
import { addHelpMenuToAppChrome } from './lib';
import { DashboardNoMatch } from './listing/dashboard_no_match';
import { createDashboardListingFilterUrl } from '../dashboard_constants';
import { createDashboardEditUrl, DashboardConstants } from '../dashboard_constants';
import { dashboardReadonlyBadge, getDashboardPageTitle } from '../dashboard_strings';
import {
  DashboardAppServices,
  DashboardEmbedSettings,
  RedirectToProps,
  DashboardMountContextProps,
} from '../types';
import { DashboardStart, DashboardStartDependencies } from '../plugin';
import { pluginServices } from '../services/plugin_services';
import { DashboardApplicationService } from '../services/application/types';

export const dashboardUrlParams = {
  showTopMenu: 'show-top-menu',
  showQueryInput: 'show-query-input',
  showTimeFilter: 'show-time-filter',
  hideFilterBar: 'hide-filter-bar',
};

export interface DashboardMountProps {
  appUnMounted: () => void;
  element: AppMountParameters['element'];
  core: CoreSetup<DashboardStartDependencies, DashboardStart>;
  mountContext: DashboardMountContextProps;
}

// because the type of `application.capabilities.advancedSettings` is so generic, the provider
// requiring the `save` key to be part of it is causing type issues - so, creating a custom type
type TableListViewApplicationService = DashboardApplicationService & {
  capabilities: { advancedSettings: { save: boolean } };
};

export async function mountApp({ core, element, appUnMounted, mountContext }: DashboardMountProps) {
  const [, , dashboardStart] = await core.getStartServices(); // TODO: Remove as part of https://github.com/elastic/kibana/pull/138774
  const { DashboardMountContext } = await import('./hooks/dashboard_mount_context');

  const {
    application,
    chrome: { setBadge, docTitle },
    dashboardCapabilities: { showWriteControls },
    data: dataStart,
    embeddable,
    notifications,
    savedObjectsTagging,
    settings: { uiSettings },
  } = pluginServices.getServices();

  let globalEmbedSettings: DashboardEmbedSettings | undefined;
  let routerHistory: History;

  // TODO: Remove as part of https://github.com/elastic/kibana/pull/138774
  const dashboardServices: DashboardAppServices = {
    savedDashboards: dashboardStart.getSavedDashboardLoader(),
  };

  const getUrlStateStorage = (history: RouteComponentProps['history']) =>
    createKbnUrlStateStorage({
      history,
      useHash: uiSettings.get('state:storeInSessionStorage'),
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
    docTitle.change(getDashboardPageTitle());
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
    embeddable
      .getStateTransfer()
      .getIncomingEmbeddablePackage(DashboardConstants.DASHBOARDS_ID, false)
  );
  if (!hasEmbeddableIncoming) {
    dataStart.dataViews.clearCache();
  }

  // dispatch synthetic hash change event to update hash history objects
  // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
  const unlistenParentHistory = mountContext.scopedHistory().listen(() => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  const app = (
    // TODO: Remove KibanaContextProvider as part of https://github.com/elastic/kibana/pull/138774
    <I18nProvider>
      <Provider store={dashboardStateStore}>
        <KibanaContextProvider services={dashboardServices}>
          <DashboardMountContext.Provider value={mountContext}>
            <KibanaThemeProvider theme$={core.theme.theme$}>
              <TableListViewKibanaProvider
                {...{
                  core: {
                    application: application as TableListViewApplicationService,
                    notifications,
                  },
                  toMountPoint,
                  savedObjectsTagging: savedObjectsTagging.hasApi // TODO: clean up this logic once https://github.com/elastic/kibana/issues/140433 is resolved
                    ? ({
                        ui: savedObjectsTagging,
                      } as TableListViewKibanaDependencies['savedObjectsTagging'])
                    : undefined,
                  FormattedRelative,
                }}
              >
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
              </TableListViewKibanaProvider>
            </KibanaThemeProvider>
          </DashboardMountContext.Provider>
        </KibanaContextProvider>
      </Provider>
    </I18nProvider>
  );

  addHelpMenuToAppChrome();

  if (!showWriteControls) {
    setBadge({
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
