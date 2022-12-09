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
import { parse, ParsedQuery } from 'query-string';
import { render, unmountComponentAtNode } from 'react-dom';
import { Routes, Route, HashRouter, Params } from 'react-router-dom';

import {
  TableListViewKibanaDependencies,
  TableListViewKibanaProvider,
} from '@kbn/content-management-table-list';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { AppMountParameters, CoreSetup } from '@kbn/core/public';
import { I18nProvider, FormattedRelative } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';

import { DashboardListing } from './listing';
import { dashboardStateStore } from './state';
import { DashboardApp } from './dashboard_app';
import { addHelpMenuToAppChrome } from './lib';
import { pluginServices } from '../services/plugin_services';
import { DashboardNoMatch } from './listing/dashboard_no_match';
import { DashboardStart, DashboardStartDependencies } from '../plugin';
import { createDashboardListingFilterUrl } from '../dashboard_constants';
import { DashboardApplicationService } from '../services/application/types';
import { createDashboardEditUrl, DashboardConstants } from '../dashboard_constants';
import { dashboardReadonlyBadge, getDashboardPageTitle } from '../dashboard_strings';
import { DashboardEmbedSettings, RedirectToProps, DashboardMountContextProps } from '../types';

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
  const { DashboardMountContext } = await import('./hooks/dashboard_mount_context');

  const {
    application,
    chrome: { setBadge, docTitle },
    dashboardCapabilities: { showWriteControls },
    data: dataStart,
    embeddable,
    notifications,
    overlays,
    savedObjectsTagging,
    settings: { uiSettings },
    http,
  } = pluginServices.getServices();

  let globalEmbedSettings: DashboardEmbedSettings | undefined;
  let routerHistory: History;

  const getUrlStateStorage = (history: History) =>
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

  const renderDashboard = (
    routeProps: Location & { history: History; match: { params: Params } }
  ) => {
    const routeParams = parse(location.search);
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

  const renderListingPage = (routeProps: Location & { history: History }) => {
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

  const renderNoMatch = (routeProps: { history: History }) => {
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
    <I18nProvider>
      <Provider store={dashboardStateStore}>
        <DashboardMountContext.Provider value={mountContext}>
          <KibanaThemeProvider theme$={core.theme.theme$}>
            <TableListViewKibanaProvider
              {...{
                core: {
                  application: application as TableListViewApplicationService,
                  notifications,
                  http,
                  overlays,
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
                <Routes>
                  {[
                    DashboardConstants.CREATE_NEW_DASHBOARD_URL,
                    `${DashboardConstants.VIEW_DASHBOARD_URL}/:id`,
                  ].map((path) => (
                    <Route path={path} element={renderDashboard} />
                  ))}

                  {[DashboardConstants.LANDING_PAGE_PATH, '/'].map((path) => (
                    <Route path={path} element={renderListingPage} />
                  ))}

                  <Route element={renderNoMatch} />
                </Routes>
              </HashRouter>
            </TableListViewKibanaProvider>
          </KibanaThemeProvider>
        </DashboardMountContext.Provider>
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
