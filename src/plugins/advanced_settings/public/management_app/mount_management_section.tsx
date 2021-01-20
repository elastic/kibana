/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Switch, Route } from 'react-router-dom';

import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { StartServicesAccessor } from 'src/core/public';

import { AdvancedSettings } from './advanced_settings';
import { ManagementAppMountParams } from '../../../management/public';
import { ComponentRegistry } from '../types';

import './index.scss';
import { UsageCollectionSetup } from '../../../usage_collection/public';

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

export async function mountManagementSection(
  getStartServices: StartServicesAccessor,
  params: ManagementAppMountParams,
  componentRegistry: ComponentRegistry['start'],
  usageCollection?: UsageCollectionSetup
) {
  params.setBreadcrumbs(crumb);
  const [{ uiSettings, notifications, docLinks, application, chrome }] = await getStartServices();

  const canSave = application.capabilities.advancedSettings.save as boolean;
  const trackUiMetric = usageCollection?.reportUiCounter.bind(usageCollection, 'advanced_settings');

  if (!canSave) {
    chrome.setBadge(readOnlyBadge);
  }

  ReactDOM.render(
    <I18nProvider>
      <Router history={params.history}>
        <Switch>
          <Route path={['/:query', '/']}>
            <AdvancedSettings
              enableSaving={canSave}
              toasts={notifications.toasts}
              dockLinks={docLinks.links}
              uiSettings={uiSettings}
              componentRegistry={componentRegistry}
              trackUiMetric={trackUiMetric}
            />
          </Route>
        </Switch>
      </Router>
    </I18nProvider>,
    params.element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
}
