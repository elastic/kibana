/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ViewMode } from '../../services/embeddable';
import { TopNavIds } from './top_nav_ids';
import { NavAction } from '../../types';
import { TopNavMenuData } from '../../../../navigation/public';

/**
 * @param actions - A mapping of TopNavIds to an action function that should run when the
 * corresponding top nav is clicked.
 * @param hideWriteControls if true, does not include any controls that allow editing or creating objects.
 * @return an array of objects for a top nav configuration, based on the mode.
 */
export function getTopNavConfig(
  dashboardMode: ViewMode,
  actions: { [key: string]: NavAction },
  options: {
    hideWriteControls: boolean;
    isNewDashboard: boolean;
    isDirty: boolean;
    isSaveInProgress?: boolean;
  }
) {
  switch (dashboardMode) {
    case ViewMode.VIEW:
      return options.hideWriteControls
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
      const disableButton = options.isSaveInProgress;
      const navItems: TopNavMenuData[] = [
        getOptionsConfig(actions[TopNavIds.OPTIONS], disableButton),
        getShareConfig(actions[TopNavIds.SHARE], disableButton),
      ];
      if (!options.isNewDashboard) {
        navItems.push(
          getSaveConfig(actions[TopNavIds.SAVE], options.isNewDashboard, disableButton)
        );
        navItems.push(getViewConfig(actions[TopNavIds.EXIT_EDIT_MODE], disableButton));
        navItems.push(getQuickSave(actions[TopNavIds.QUICK_SAVE], disableButton, options.isDirty));
      } else {
        navItems.push(getViewConfig(actions[TopNavIds.EXIT_EDIT_MODE], true));
        navItems.push(
          getSaveConfig(actions[TopNavIds.SAVE], options.isNewDashboard, disableButton)
        );
      }
      return navItems;
    default:
      return [];
  }
}

function getSaveButtonLabel() {
  return i18n.translate('dashboard.topNave.saveButtonAriaLabel', {
    defaultMessage: 'save',
  });
}

function getSaveAsButtonLabel() {
  return i18n.translate('dashboard.topNave.saveAsButtonAriaLabel', {
    defaultMessage: 'save as',
  });
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
function getQuickSave(action: NavAction, isLoading?: boolean, isDirty?: boolean) {
  return {
    isLoading,
    disableButton: !isDirty,
    id: 'quick-save',
    iconType: 'save',
    emphasize: true,
    label: getSaveButtonLabel(),
    description: i18n.translate('dashboard.topNave.saveConfigDescription', {
      defaultMessage: 'Quick save your dashboard without any prompts',
    }),
    testId: 'dashboardQuickSaveMenuItem',
    run: action,
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getSaveConfig(action: NavAction, isNewDashboard = false, disableButton?: boolean) {
  return {
    disableButton,
    id: 'save',
    label: isNewDashboard ? getSaveButtonLabel() : getSaveAsButtonLabel(),
    iconType: isNewDashboard ? 'save' : undefined,
    description: i18n.translate('dashboard.topNave.saveAsConfigDescription', {
      defaultMessage: 'Save as a new dashboard',
    }),
    testId: 'dashboardSaveMenuItem',
    run: action,
    emphasize: isNewDashboard,
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getViewConfig(action: NavAction, disableButton?: boolean) {
  return {
    disableButton,
    id: 'cancel',
    label: i18n.translate('dashboard.topNave.cancelButtonAriaLabel', {
      defaultMessage: 'Switch to view mode',
    }),
    description: i18n.translate('dashboard.topNave.viewConfigDescription', {
      defaultMessage: 'Switch to view-only mode',
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
function getShareConfig(action: NavAction | undefined, disableButton?: boolean) {
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
    disableButton: !action || disableButton,
  };
}

/**
 * @returns {kbnTopNavConfig}
 */
function getOptionsConfig(action: NavAction, disableButton?: boolean) {
  return {
    disableButton,
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
