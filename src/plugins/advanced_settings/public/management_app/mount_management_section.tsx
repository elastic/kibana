/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Redirect, RouteChildrenProps } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';

import { i18n } from '@kbn/i18n';

import { LocationDescriptor } from 'history';
import { url } from '@kbn/kibana-utils-plugin/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { StartServicesAccessor } from '@kbn/core/public';
import type { SectionRegistryStart } from '@kbn/management-settings-section-registry';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

import { QUERY } from './advanced_settings';
import { Settings } from './settings';

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

type RedirectUrlProps = RouteChildrenProps<{ [QUERY]: string }>;

const redirectUrl = ({ match, location }: RedirectUrlProps): LocationDescriptor => {
  const search = url.addQueryParam(location.search, QUERY, match?.params[QUERY]);

  return {
    pathname: '/',
    search,
  };
};

export async function mountManagementSection(
  getStartServices: StartServicesAccessor,
  params: ManagementAppMountParams,
  sectionRegistry: SectionRegistryStart,
  usageCollection?: UsageCollectionSetup
) {
  params.setBreadcrumbs(crumb);
  const [{ settings, notifications, docLinks, application, chrome, i18n: i18nStart, theme }] =
    await getStartServices();

  const { advancedSettings, globalSettings } = application.capabilities;
  const canSaveAdvancedSettings = advancedSettings.save as boolean;
  const canSaveGlobalSettings = globalSettings.save as boolean;
  const canShowGlobalSettings = globalSettings.show as boolean;
  const trackUiMetric = usageCollection?.reportUiCounter.bind(usageCollection, 'advanced_settings');
  if (!canSaveAdvancedSettings || (!canSaveGlobalSettings && canShowGlobalSettings)) {
    chrome.setBadge(readOnlyBadge);
  }

  chrome.docTitle.change(title);

  ReactDOM.render(
    <KibanaRenderContextProvider {...{ i18n: i18nStart, theme }}>
      <Router history={params.history}>
        <Routes>
          {/* TODO: remove route param (`query`) in 7.13 */}
          <Route path={`/:${QUERY}`}>
            {(props: RedirectUrlProps) => <Redirect to={redirectUrl(props)} />}
          </Route>
          <Route path="/">
            <Settings
              history={params.history}
              enableSaving={{
                namespace: canSaveAdvancedSettings,
                global: canSaveGlobalSettings,
              }}
              enableShowing={{ namespace: true, global: canShowGlobalSettings }}
              toasts={notifications.toasts}
              docLinks={docLinks.links}
              settingsService={settings}
              theme={params.theme$}
              sectionRegistry={sectionRegistry}
              trackUiMetric={trackUiMetric}
            />
          </Route>
        </Routes>
      </Router>
    </KibanaRenderContextProvider>,
    params.element
  );
  return () => {
    chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(params.element);
  };
}
