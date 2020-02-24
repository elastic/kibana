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
import ReactDOM from 'react-dom';
import { HashRouter, Switch, Route } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { AdvancedSettings } from './advanced_settings';
import { ManagementSetup } from '../../../management/public';
import { CoreSetup } from '../../../../core/public';
import { ComponentRegistry } from '../types';

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

export async function registerAdvSettingsMgmntApp({
  management,
  getStartServices,
  componentRegistry,
}: {
  management: ManagementSetup;
  getStartServices: CoreSetup['getStartServices'];
  componentRegistry: ComponentRegistry['start'];
}) {
  const kibanaSection = management.sections.getSection('kibana');
  if (!kibanaSection) {
    throw new Error('`kibana` management section not found.');
  }

  const advancedSettingsManagementApp = kibanaSection.registerApp({
    id: 'settings',
    title,
    order: 20,
    async mount(params) {
      params.setBreadcrumbs(crumb);
      const [
        { uiSettings, notifications, docLinks, application, chrome },
      ] = await getStartServices();

      const canSave = application.capabilities.advancedSettings.save as boolean;

      if (!canSave) {
        chrome.setBadge(readOnlyBadge);
      }

      ReactDOM.render(
        <I18nProvider>
          <HashRouter basename={params.basePath}>
            <Switch>
              <Route path={['/:query', '/']}>
                <AdvancedSettings
                  enableSaving={canSave}
                  toasts={notifications.toasts}
                  dockLinks={docLinks.links}
                  uiSettings={uiSettings}
                  componentRegistry={componentRegistry}
                />
              </Route>
            </Switch>
          </HashRouter>
        </I18nProvider>,
        params.element
      );
      return () => {
        ReactDOM.unmountComponentAtNode(params.element);
      };
    },
  });
  const [{ application }] = await getStartServices();
  if (!application.capabilities.management.kibana.settings) {
    advancedSettingsManagementApp.disable();
  }
}
