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
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { AdvancedSettings } from './advanced_settings';
import { ManagementSetup } from '../../../management/public';
import { CoreSetup } from '../../../../core/public';
import { ComponentRegistry } from '../types';

export const toBeUsed = {
  text: i18n.translate('advancedSettings.badge.readOnly.text', {
    defaultMessage: 'Read only',
  }),
  tooltip: i18n.translate('advancedSettings.badge.readOnly.tooltip', {
    defaultMessage: 'Unable to save advanced settings',
  }),
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
  const title = i18n.translate('advancedSettings.advancedSettingsLabel', {
    defaultMessage: 'Advanced Settings',
  });

  if (!kibanaSection) {
    throw new Error('`kibana` management section not found.');
  }

  const advancedSettingsManagementApp = kibanaSection.registerApp({
    id: i18n.translate('advancedSettings.sectionLabel', {
      defaultMessage: 'Advanced Settings',
    }),
    title,
    order: 20,
    async mount(params) {
      params.setBreadcrumbs([{ text: title }]);
      const [{ uiSettings, notifications, docLinks, application }] = await getStartServices();
      // todo badge
      ReactDOM.render(
        <I18nProvider>
          <AdvancedSettings
            // todo - is this right?
            /*
            $scope.query = $route.current.params.setting || '';
            $route.updateParams({ setting: null });
            */
            queryText={''}
            enableSaving={application.capabilities.advancedSettings.save as boolean}
            toasts={notifications.toasts}
            dockLinks={docLinks.links}
            uiSettings={uiSettings}
            componentRegistry={componentRegistry}
          />
        </I18nProvider>,
        params.element
      );
      return () => {
        ReactDOM.unmountComponentAtNode(params.element);
      };
    },
  });
  const [{ application }] = await getStartServices();
  // console.log('application.capabilities', application.capabilities);
  if (!application.capabilities.management.kibana.settings) {
    advancedSettingsManagementApp.disable();
  }
}
/*
import { getBreadcrumbs } from './breadcrumbs';

uiRoutes.when('/management/kibana/settings/:setting?', {
  template: indexTemplate,
  k7Breadcrumbs: getBreadcrumbs,
  requireUICapability: 'management.kibana.settings',
  badge: uiCapabilities => {
    if (uiCapabilities.advancedSettings.save) {
      return undefined;
    }

    return {
      text: i18n.translate('kbn.management.advancedSettings.badge.readOnly.text', {
        defaultMessage: 'Read only',
      }),
      tooltip: i18n.translate('kbn.management.advancedSettings.badge.readOnly.tooltip', {
        defaultMessage: 'Unable to save advanced settings',
      }),
      iconType: 'glasses',
    };
  },
});

uiModules.get('apps/management').directive('kbnManagementAdvanced', function($route) {
  return {
    restrict: 'E',
    link: function($scope) {
      $scope.query = $route.current.params.setting || '';
      $route.updateParams({ setting: null });
    },
  };
});


*/
