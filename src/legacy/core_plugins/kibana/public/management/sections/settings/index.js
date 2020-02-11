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

import { management } from 'ui/management';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import { capabilities } from 'ui/capabilities';
import { I18nContext } from 'ui/i18n';
import indexTemplate from './index.html';

import React from 'react';
import { AdvancedSettings } from './advanced_settings';
import { i18n } from '@kbn/i18n';
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

const AdvancedSettingsApp = ({ query = '' }) => {
  return (
    <I18nContext>
      <AdvancedSettings queryText={query} enableSaving={capabilities.get().advancedSettings.save} />
    </I18nContext>
  );
};

uiModules.get('apps/management').directive('kbnManagementAdvancedReact', function(reactDirective) {
  return reactDirective(AdvancedSettingsApp, [['query', { watchDepth: 'reference' }]]);
});

management.getSection('kibana').register('settings', {
  display: i18n.translate('kbn.management.settings.sectionLabel', {
    defaultMessage: 'Advanced Settings',
  }),
  order: 20,
  url: '#/management/kibana/settings',
});
