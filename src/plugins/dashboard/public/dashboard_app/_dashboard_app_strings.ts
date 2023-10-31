/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ViewMode } from '@kbn/embeddable-plugin/public';

export const getDashboardPageTitle = () =>
  i18n.translate('dashboard.dashboardPageTitle', {
    defaultMessage: 'Dashboards',
  });

export const dashboardReadonlyBadge = {
  getText: () =>
    i18n.translate('dashboard.badge.readOnly.text', {
      defaultMessage: 'Read only',
    }),
  getTooltip: () =>
    i18n.translate('dashboard.badge.readOnly.tooltip', {
      defaultMessage: 'Unable to save dashboards',
    }),
};

export const dashboardManagedBadge = {
  getText: () =>
    i18n.translate('dashboard.badge.managed.text', {
      defaultMessage: 'Managed',
    }),
  getTooltip: () =>
    i18n.translate('dashboard.badge.managed.tooltip', {
      defaultMessage: 'This dashboard is system managed. Clone this dashboard to make changes.',
    }),
};

/**
 * @param title {string} the current title of the dashboard
 * @param viewMode {DashboardViewMode} the current mode. If in editing state, prepends 'Editing ' to the title.
 * @returns {string} A title to display to the user based on the above parameters.
 */
export function getDashboardTitle(title: string, viewMode: ViewMode, isNew: boolean): string {
  const isEditMode = viewMode === ViewMode.EDIT;
  const dashboardTitle = isNew ? getNewDashboardTitle() : title;
  return isEditMode
    ? i18n.translate('dashboard.strings.dashboardEditTitle', {
        defaultMessage: 'Editing {title}',
        values: { title: dashboardTitle },
      })
    : dashboardTitle;
}

export const unsavedChangesBadgeStrings = {
  getUnsavedChangedBadgeText: () =>
    i18n.translate('dashboard.unsavedChangesBadge', {
      defaultMessage: 'Unsaved changes',
    }),
  getUnsavedChangedBadgeToolTipContent: () =>
    i18n.translate('dashboard.unsavedChangesBadgeToolTipContent', {
      defaultMessage:
        ' You have unsaved changes in this dashboard. To remove this label, save the dashboard.',
    }),
  getHasRunMigrationsText: () =>
    i18n.translate('dashboard.hasRunMigrationsBadge', {
      defaultMessage: 'Save recommended',
    }),
  getHasRunMigrationsToolTipContent: () =>
    i18n.translate('dashboard.hasRunMigrationsBadgeToolTipContent', {
      defaultMessage:
        'One or more panels on this dashboard have been updated to a new version. Save the dashboard so it loads faster next time.',
    }),
};

export const leaveConfirmStrings = {
  getLeaveTitle: () =>
    i18n.translate('dashboard.appLeaveConfirmModal.unsavedChangesTitle', {
      defaultMessage: 'Unsaved changes',
    }),
  getLeaveSubtitle: () =>
    i18n.translate('dashboard.appLeaveConfirmModal.unsavedChangesSubtitle', {
      defaultMessage: 'Leave Dashboard with unsaved work?',
    }),
  getLeaveCancelButtonText: () =>
    i18n.translate('dashboard.appLeaveConfirmModal.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
};

export const getCreateVisualizationButtonTitle = () =>
  i18n.translate('dashboard.solutionToolbar.addPanelButtonLabel', {
    defaultMessage: 'Create visualization',
  });

export const getQuickCreateButtonGroupLegend = () =>
  i18n.translate('dashboard.solutionToolbar.quickCreateButtonGroupLegend', {
    defaultMessage: 'Shortcuts to popular visualization types',
  });

export const getNewDashboardTitle = () =>
  i18n.translate('dashboard.savedDashboard.newDashboardTitle', {
    defaultMessage: 'New Dashboard',
  });

export const getPanelAddedSuccessString = (savedObjectName: string) =>
  i18n.translate('dashboard.addPanel.newEmbeddableAddedSuccessMessageTitle', {
    defaultMessage: '{savedObjectName} was added',
    values: {
      savedObjectName,
    },
  });

export const getPanelTooOldErrorString = () =>
  i18n.translate('dashboard.loadURLError.PanelTooOld', {
    defaultMessage: 'Cannot load panels from a URL created in a version older than 7.3',
  });

/*
  Share Modal
*/
export const shareModalStrings = {
  getTopMenuCheckbox: () =>
    i18n.translate('dashboard.embedUrlParamExtension.topMenu', {
      defaultMessage: 'Top menu',
    }),
  getQueryCheckbox: () =>
    i18n.translate('dashboard.embedUrlParamExtension.query', {
      defaultMessage: 'Query',
    }),
  getTimeFilterCheckbox: () =>
    i18n.translate('dashboard.embedUrlParamExtension.timeFilter', {
      defaultMessage: 'Time filter',
    }),
  getFilterBarCheckbox: () =>
    i18n.translate('dashboard.embedUrlParamExtension.filterBar', {
      defaultMessage: 'Filter bar',
    }),
  getCheckboxLegend: () =>
    i18n.translate('dashboard.embedUrlParamExtension.include', {
      defaultMessage: 'Include',
    }),
  getSnapshotShareWarning: () =>
    i18n.translate('dashboard.snapshotShare.longUrlWarning', {
      defaultMessage:
        'One or more panels on this dashboard have changed. Before you generate a snapshot, save the dashboard.',
    }),
};

/*
  Dashboard Top Nav
*/
export const getDashboardBreadcrumb = () =>
  i18n.translate('dashboard.dashboardAppBreadcrumbsTitle', {
    defaultMessage: 'Dashboard',
  });

export const topNavStrings = {
  fullScreen: {
    label: i18n.translate('dashboard.topNave.fullScreenButtonAriaLabel', {
      defaultMessage: 'full screen',
    }),

    description: i18n.translate('dashboard.topNave.fullScreenConfigDescription', {
      defaultMessage: 'Full Screen Mode',
    }),
  },
  labs: {
    label: i18n.translate('dashboard.topNav.labsButtonAriaLabel', {
      defaultMessage: 'labs',
    }),
    description: i18n.translate('dashboard.topNav.labsConfigDescription', {
      defaultMessage: 'Labs',
    }),
  },
  edit: {
    label: i18n.translate('dashboard.topNave.editButtonAriaLabel', {
      defaultMessage: 'edit',
    }),
    description: i18n.translate('dashboard.topNave.editConfigDescription', {
      defaultMessage: 'Switch to edit mode',
    }),
  },
  quickSave: {
    label: i18n.translate('dashboard.topNave.saveButtonAriaLabel', {
      defaultMessage: 'save',
    }),
    description: i18n.translate('dashboard.topNave.saveConfigDescription', {
      defaultMessage: 'Quick save your dashboard without any prompts',
    }),
  },
  saveAs: {
    label: i18n.translate('dashboard.topNave.saveAsButtonAriaLabel', {
      defaultMessage: 'save as',
    }),
    description: i18n.translate('dashboard.topNave.saveAsConfigDescription', {
      defaultMessage: 'Save as a new dashboard',
    }),
  },
  resetChanges: {
    label: i18n.translate('dashboard.topNave.resetChangesButtonAriaLabel', {
      defaultMessage: 'Reset',
    }),
    description: i18n.translate('dashboard.topNave.resetChangesConfigDescription', {
      defaultMessage: 'Reset changes to dashboard',
    }),
  },
  switchToViewMode: {
    label: i18n.translate('dashboard.topNave.cancelButtonAriaLabel', {
      defaultMessage: 'Switch to view mode',
    }),
    description: i18n.translate('dashboard.topNave.viewConfigDescription', {
      defaultMessage: 'Switch to view-only mode',
    }),
  },
  share: {
    label: i18n.translate('dashboard.topNave.shareButtonAriaLabel', {
      defaultMessage: 'share',
    }),
    description: i18n.translate('dashboard.topNave.shareConfigDescription', {
      defaultMessage: 'Share Dashboard',
    }),
  },
  settings: {
    label: i18n.translate('dashboard.topNave.settingsButtonAriaLabel', {
      defaultMessage: 'settings',
    }),
    description: i18n.translate('dashboard.topNave.settingsConfigDescription', {
      defaultMessage: 'Open dashboard settings',
    }),
  },
  clone: {
    label: i18n.translate('dashboard.topNave.cloneButtonAriaLabel', {
      defaultMessage: 'clone',
    }),
    description: i18n.translate('dashboard.topNave.cloneConfigDescription', {
      defaultMessage: 'Create a copy of your dashboard',
    }),
  },
};

export const getControlButtonTitle = () =>
  i18n.translate('dashboard.editingToolbar.controlsButtonTitle', {
    defaultMessage: 'Controls',
  });

export const getAddControlButtonTitle = () =>
  i18n.translate('dashboard.editingToolbar.addControlButtonTitle', {
    defaultMessage: 'Add control',
  });

export const getEditControlGroupButtonTitle = () =>
  i18n.translate('dashboard.editingToolbar.editControlGroupButtonTitle', {
    defaultMessage: 'Settings',
  });

export const getOnlyOneTimeSliderControlMsg = () =>
  i18n.translate('dashboard.editingToolbar.onlyOneTimeSliderControlMsg', {
    defaultMessage: 'Control group already contains time slider control.',
  });

export const getAddTimeSliderControlButtonTitle = () =>
  i18n.translate('dashboard.editingToolbar.addTimeSliderControlButtonTitle', {
    defaultMessage: 'Add time slider control',
  });
