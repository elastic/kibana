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
import { DashboardViewMode } from '../dashboard_view_mode';
import { TopNavIds } from './top_nav_ids';

/**
 * @param {DashboardMode} dashboardMode.
 * @param actions {Object} - A mapping of TopNavIds to an action function that should run when the
 * corresponding top nav is clicked.
 * @param hideWriteControls {boolean} if true, does not include any controls that allow editing or creating objects.
 * @return {Array<kbnTopNavConfig>} - Returns an array of objects for a top nav configuration, based on the
 * mode.
 */
export function getTopNavConfig(dashboardMode, actions, hideWriteControls) {
  switch (dashboardMode) {
    case DashboardViewMode.VIEW:
      return (
        hideWriteControls ?
          [
            getFullScreenConfig(actions[TopNavIds.FULL_SCREEN])
          ]
          : [
            getFullScreenConfig(actions[TopNavIds.FULL_SCREEN]),
            getShareConfig(actions[TopNavIds.SHARE]),
            getCloneConfig(actions[TopNavIds.CLONE]),
            getEditConfig(actions[TopNavIds.ENTER_EDIT_MODE])
          ]
      );
    case DashboardViewMode.EDIT:
      return [
        getSaveConfig(actions[TopNavIds.SAVE]),
        getViewConfig(actions[TopNavIds.EXIT_EDIT_MODE]),
        getAddConfig(actions[TopNavIds.ADD]),
        getOptionsConfig(actions[TopNavIds.OPTIONS]),
        getShareConfig(actions[TopNavIds.SHARE])];
    default:
      return [];
  }
}

function getFullScreenConfig(action) {
  return {
    key: 'full screen',
    description: i18n.translate('kbn.dashboard.topNave.fullScreenConfigDescription', {
      defaultMessage: 'Full Screen Mode',
    }),
    testId: 'dashboardFullScreenMode',
    run: action
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getEditConfig(action) {
  return {
    key: 'edit',
    description: i18n.translate('kbn.dashboard.topNave.editConfigDescription', {
      defaultMessage: 'Switch to edit mode',
    }),
    testId: 'dashboardEditMode',
    run: action
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getSaveConfig(action) {
  return {
    key: TopNavIds.SAVE,
    description: i18n.translate('kbn.dashboard.topNave.saveConfigDescription', {
      defaultMessage: 'Save your dashboard',
    }),
    testId: 'dashboardSaveMenuItem',
    run: action
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getViewConfig(action) {
  return {
    key: 'cancel',
    description: i18n.translate('kbn.dashboard.topNave.viewConfigDescription', {
      defaultMessage: 'Cancel editing and switch to view-only mode',
    }),
    testId: 'dashboardViewOnlyMode',
    run: action
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getCloneConfig(action) {
  return {
    key: TopNavIds.CLONE,
    description: i18n.translate('kbn.dashboard.topNave.cloneConfigDescription', {
      defaultMessage: 'Create a copy of your dashboard',
    }),
    testId: 'dashboardClone',
    run: action
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getAddConfig(action) {
  return {
    key: TopNavIds.ADD,
    description: i18n.translate('kbn.dashboard.topNave.addConfigDescription', {
      defaultMessage: 'Add a panel to the dashboard',
    }),
    testId: 'dashboardAddPanelButton',
    run: action
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getShareConfig(action) {
  return {
    key: TopNavIds.SHARE,
    description: i18n.translate('kbn.dashboard.topNave.shareConfigDescription', {
      defaultMessage: 'Share Dashboard',
    }),
    testId: 'shareTopNavButton',
    run: action,
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getOptionsConfig(action) {
  return {
    key: TopNavIds.OPTIONS,
    description: i18n.translate('kbn.dashboard.topNave.optionsConfigDescription', {
      defaultMessage: 'Options',
    }),
    testId: 'dashboardOptionsButton',
    run: action,
  };
}
