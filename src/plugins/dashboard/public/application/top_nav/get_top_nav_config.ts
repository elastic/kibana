/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ViewMode } from '../../services/embeddable';
import { TopNavIds } from './top_nav_ids';
import { NavAction } from '../../types';

/**
 * @param actions - A mapping of TopNavIds to an action function that should run when the
 * corresponding top nav is clicked.
 * @param hideWriteControls if true, does not include any controls that allow editing or creating objects.
 * @return an array of objects for a top nav configuration, based on the mode.
 */
export function getTopNavConfig(
  dashboardMode: ViewMode,
  actions: { [key: string]: NavAction },
  hideWriteControls: boolean
) {
  switch (dashboardMode) {
    case ViewMode.VIEW:
      return hideWriteControls
        ? [
            getFullScreenConfig(actions[TopNavIds.FULL_SCREEN]),
            getShareConfig(actions[TopNavIds.SHARE]),
          ]
        : [
            getFullScreenConfig(actions[TopNavIds.FULL_SCREEN]),
            getShareConfig(actions[TopNavIds.SHARE]),
            getCloneConfig(actions[TopNavIds.CLONE]),
            getEditConfig(actions[TopNavIds.ENTER_EDIT_MODE]),
          ];
    case ViewMode.EDIT:
      return [
        getOptionsConfig(actions[TopNavIds.OPTIONS]),
        getShareConfig(actions[TopNavIds.SHARE]),
        getAddConfig(actions[TopNavIds.ADD_EXISTING]),
        getViewConfig(actions[TopNavIds.EXIT_EDIT_MODE]),
        getSaveConfig(actions[TopNavIds.SAVE]),
        getCreateNewConfig(actions[TopNavIds.VISUALIZE]),
      ];
    default:
      return [];
  }
}

function getFullScreenConfig(action: NavAction) {
  return {
    id: 'full-screen',
    label: i18n.translate('dashboard.topNave.fullScreenButtonAriaLabel', {
      defaultMessage: 'full screen',
    }),
    description: i18n.translate('dashboard.topNave.fullScreenConfigDescription', {
      defaultMessage: 'Full Screen Mode',
    }),
    testId: 'dashboardFullScreenMode',
    run: action,
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getEditConfig(action: NavAction) {
  return {
    emphasize: true,
    id: 'edit',
    iconType: 'pencil',
    label: i18n.translate('dashboard.topNave.editButtonAriaLabel', {
      defaultMessage: 'edit',
    }),
    description: i18n.translate('dashboard.topNave.editConfigDescription', {
      defaultMessage: 'Switch to edit mode',
    }),
    testId: 'dashboardEditMode',
    // We want to hide the "edit" button on small screens, since those have a responsive
    // layout, which is not tied to the grid anymore, so we cannot edit the grid on that screens.
    className: 'eui-hideFor--s eui-hideFor--xs',
    run: action,
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getSaveConfig(action: NavAction) {
  return {
    id: 'save',
    label: i18n.translate('dashboard.topNave.saveButtonAriaLabel', {
      defaultMessage: 'save',
    }),
    description: i18n.translate('dashboard.topNave.saveConfigDescription', {
      defaultMessage: 'Save your dashboard',
    }),
    testId: 'dashboardSaveMenuItem',
    run: action,
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getViewConfig(action: NavAction) {
  return {
    id: 'cancel',
    label: i18n.translate('dashboard.topNave.cancelButtonAriaLabel', {
      defaultMessage: 'cancel',
    }),
    description: i18n.translate('dashboard.topNave.viewConfigDescription', {
      defaultMessage: 'Cancel editing and switch to view-only mode',
    }),
    testId: 'dashboardViewOnlyMode',
    run: action,
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getCloneConfig(action: NavAction) {
  return {
    id: 'clone',
    label: i18n.translate('dashboard.topNave.cloneButtonAriaLabel', {
      defaultMessage: 'clone',
    }),
    description: i18n.translate('dashboard.topNave.cloneConfigDescription', {
      defaultMessage: 'Create a copy of your dashboard',
    }),
    testId: 'dashboardClone',
    run: action,
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getAddConfig(action: NavAction) {
  return {
    id: 'add',
    label: i18n.translate('dashboard.topNave.addButtonAriaLabel', {
      defaultMessage: 'Library',
    }),
    description: i18n.translate('dashboard.topNave.addConfigDescription', {
      defaultMessage: 'Add an existing visualization to the dashboard',
    }),
    testId: 'dashboardAddPanelButton',
    run: action,
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getCreateNewConfig(action: NavAction) {
  return {
    emphasize: true,
    iconType: 'plusInCircleFilled',
    id: 'addNew',
    label: i18n.translate('dashboard.topNave.addNewButtonAriaLabel', {
      defaultMessage: 'Create panel',
    }),
    description: i18n.translate('dashboard.topNave.addNewConfigDescription', {
      defaultMessage: 'Create a new panel on this dashboard',
    }),
    testId: 'dashboardAddNewPanelButton',
    run: action,
  };
}

// /**
//  * @returns {kbnTopNavConfig}
//  */
function getShareConfig(action: NavAction | undefined) {
  return {
    id: 'share',
    label: i18n.translate('dashboard.topNave.shareButtonAriaLabel', {
      defaultMessage: 'share',
    }),
    description: i18n.translate('dashboard.topNave.shareConfigDescription', {
      defaultMessage: 'Share Dashboard',
    }),
    testId: 'shareTopNavButton',
    run: action ?? (() => {}),
    // disable the Share button if no action specified
    disableButton: !action,
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getOptionsConfig(action: NavAction) {
  return {
    id: 'options',
    label: i18n.translate('dashboard.topNave.optionsButtonAriaLabel', {
      defaultMessage: 'options',
    }),
    description: i18n.translate('dashboard.topNave.optionsConfigDescription', {
      defaultMessage: 'Options',
    }),
    testId: 'dashboardOptionsButton',
    run: action,
  };
}
