/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Routes, Route, Navigate, Params } from 'react-router-dom';

import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';

import { LocationDescriptor } from 'history';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { url } from '@kbn/kibana-utils-plugin/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { StartServicesAccessor } from '@kbn/core/public';

import { AdvancedSettings, QUERY } from './advanced_settings';
import { ComponentRegistry } from '../types';

import './index.scss';

const title = i18n.translate('advancedSettings.advancedSettingsLabel', {
  defaultMessage: 'Advanced Settings',
});
const crumb = [{ text: title }];

const readOnlyBadge = {
  text: i18n.translate('advancedSettings.badge.readOnly.text', {
    defaultMessage: 'Read only',
  }),
  tooltip: i18n.translate('advancedSettings.badge.readOnly.tooltip', {
    defaultMessage: 'Unable to save advanced settings',
  }),
  iconType: 'glasses',
};

const redirectUrl = ({
  match,
  location,
}: {
  location: Location;
  match: { params: Params };
}): LocationDescriptor => {
  const search = url.addQueryParam(location.search, QUERY, match?.params[QUERY]);

  return {
    pathname: '/',
    search,
  };
};

export async function mountManagementSection(
  getStartServices: StartServicesAccessor,
  params: ManagementAppMountParams,
  componentRegistry: ComponentRegistry['start'],
  usageCollection?: UsageCollectionSetup
) {
  const [{ chrome, uiSettings, notifications, docLinks, application }] = await getStartServices();

  params.setBreadcrumbs(crumb);

  const canSave = application.capabilities.advancedSettings.save as boolean;
  const trackUiMetric = usageCollection?.reportUiCounter.bind(usageCollection, 'advanced_settings');

  if (!canSave) {
    chrome.setBadge(readOnlyBadge);
  }

  chrome.docTitle.change(title);

  const App = () => {
    return (
      <KibanaThemeProvider theme$={params.theme$}>
        <I18nProvider>
          <Router navigator={params.history} location={params.history.location}>
            <Routes>
              {/* TODO: remove route param (`query`) in 7.13 */}
              <Route
                path={`/:${QUERY}`}
                element={(props: any) => <Navigate to={redirectUrl(props)} />}
              />

              <Route
                path="/"
                element={
                  <AdvancedSettings
                    history={params.history}
                    enableSaving={canSave}
                    toasts={notifications.toasts}
                    docLinks={docLinks.links}
                    uiSettings={uiSettings}
                    theme={params.theme$}
                    componentRegistry={componentRegistry}
                    trackUiMetric={trackUiMetric}
                  />
                }
              />
            </Routes>
          </Router>
        </I18nProvider>
      </KibanaThemeProvider>
    );
  };

  ReactDOM.render(<App />, params.element);
  return () => {
    chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(params.element);
  };
}
