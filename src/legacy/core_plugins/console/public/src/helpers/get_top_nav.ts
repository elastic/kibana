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

import { i18n } from '@kbn/i18n';

import { IScope } from 'angular';
import { showSettingsModal } from './settings_show_modal';

// help
import { showHelpPanel } from './help_show_panel';

export function getTopNavConfig($scope: IScope, toggleHistory: () => {}) {
  return [
    {
      key: 'history',
      label: i18n.translate('console.topNav.historyTabLabel', {
        defaultMessage: 'History',
      }),
      description: i18n.translate('console.topNav.historyTabDescription', {
        defaultMessage: 'History',
      }),
      run: () => {
        $scope.$evalAsync(toggleHistory);
      },
      testId: 'consoleHistoryButton',
    },
    {
      key: 'settings',
      label: i18n.translate('console.topNav.settingsTabLabel', {
        defaultMessage: 'Settings',
      }),
      description: i18n.translate('console.topNav.settingsTabDescription', {
        defaultMessage: 'Settings',
      }),
      run: () => {
        showSettingsModal();
      },
      testId: 'consoleSettingsButton',
    },
    {
      key: 'help',
      label: i18n.translate('console.topNav.helpTabLabel', {
        defaultMessage: 'Help',
      }),
      description: i18n.translate('console.topNav.helpTabDescription', {
        defaultMessage: 'Help',
      }),
      run: () => {
        const hideHelpPanel = showHelpPanel();
        $scope.$on('$destroy', () => {
          hideHelpPanel();
        });
      },
      testId: 'consoleHelpButton',
    },
  ];
}
