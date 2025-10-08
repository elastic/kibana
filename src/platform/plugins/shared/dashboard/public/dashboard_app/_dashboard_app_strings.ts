/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ViewMode } from '@kbn/presentation-publishing';

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
  getDuplicateButtonAriaLabel: () =>
    i18n.translate('dashboard.managedContentPopoverFooterText', {
      defaultMessage: 'Click here to duplicate this dashboard',
    }),
  getBadgeAriaLabel: () =>
    i18n.translate('dashboard.managedContentBadge.ariaLabel', {
      defaultMessage: 'Elastic manages this dashboard. Duplicate it to make changes.',
    }),
};

/**
 * @param title {string} the current title of the dashboard
 * @param viewMode {DashboardViewMode} the current mode. If in editing state, prepends 'Editing ' to the title.
 * @returns {string} A title to display to the user based on the above parameters.
 */
export function getDashboardTitle(
  title: string | undefined,
  viewMode: ViewMode,
  isNew: boolean
): string {
  const isEditMode = viewMode === 'edit';
  const dashboardTitle = isNew || !Boolean(title) ? getNewDashboardTitle() : (title as string);
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
};

export const getCreateVisualizationButtonTitle = () =>
  i18n.translate('dashboard.solutionToolbar.addPanelButtonLabel', {
    defaultMessage: 'Visualization',
  });

export const getQuickCreateButtonGroupLegend = () =>
  i18n.translate('dashboard.solutionToolbar.quickCreateButtonGroupLegend', {
    defaultMessage: 'Shortcuts to popular visualization types',
  });

export const getNewDashboardTitle = () =>
  i18n.translate('dashboard.savedDashboard.newDashboardTitle', {
    defaultMessage: 'New Dashboard',
  });

export const getPanelAddedSuccessString = (savedObjectName?: string) =>
  savedObjectName
    ? i18n.translate('dashboard.addPanel.newEmbeddableAddedSuccessMessageTitle', {
        defaultMessage: '{savedObjectName} was added',
        values: {
          savedObjectName,
        },
      })
    : i18n.translate('dashboard.addPanel.newEmbeddableWithNoTitleAddedSuccessMessageTitle', {
        defaultMessage: 'A panel was added',
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
  getDraftSharePanelChangesWarning: () =>
    i18n.translate('dashboard.snapshotShare.panelChangesWarning', {
      defaultMessage:
        'You are about to share a dashboard with unsaved changes, and the link may not work properly. Save the dashboard first to create a permanent link.',
    }),
  getEmbedSharePanelChangesWarning: () =>
    i18n.translate('dashboard.embedShare.draftWarning', {
      defaultMessage:
        'You are about to create an embedded dashboard with unsaved changes, and the embed code may not work properly. Save the dashboard first to create a permanent embedded dashboard.',
    }),
  getDraftShareWarning: (shareType: 'embed' | 'link') =>
    i18n.translate('dashboard.snapshotShare.draftWarning', {
      defaultMessage:
        'This dashboard has unsaved changes. Consider saving your dashboard before generating the {shareType}.',
      values: { shareType: shareType === 'embed' ? 'embed code' : 'link' },
    }),
};

/*
  Dashboard Top Nav
*/
export const getDashboardBreadcrumb = () =>
  i18n.translate('dashboard.dashboardAppBreadcrumbsTitle', {
    defaultMessage: 'Dashboards',
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
  editModeInteractiveSave: {
    label: i18n.translate('dashboard.topNave.editModeInteractiveSaveButtonAriaLabel', {
      defaultMessage: 'save as',
    }),
    description: i18n.translate('dashboard.topNave.editModeInteractiveSaveConfigDescription', {
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
      defaultMessage: 'Exit edit',
    }),
    description: i18n.translate('dashboard.topNave.viewConfigDescription', {
      defaultMessage: 'Switch to view-only mode',
    }),
  },
  export: {
    label: i18n.translate('dashboard.topNave.exportButtonAriaLabel', {
      defaultMessage: 'Export',
    }),
    description: i18n.translate('dashboard.topNave.exportConfigDescription', {
      defaultMessage: 'Export dashboard',
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
  viewModeInteractiveSave: {
    label: i18n.translate('dashboard.topNave.viewModeInteractiveSaveButtonAriaLabel', {
      defaultMessage: 'duplicate',
    }),
    description: i18n.translate('dashboard.topNave.viewModeInteractiveSaveConfigDescription', {
      defaultMessage: 'Create a copy of your dashboard',
    }),
  },
  add: {
    label: i18n.translate('dashboard.topNave.addButtonAriaLabel', {
      defaultMessage: 'add',
    }),
    description: i18n.translate('dashboard.topNave.addConfigDescription', {
      defaultMessage: 'Add content to your dashboard',
    }),
  },
  backgroundSearch: {
    label: i18n.translate('dashboard.topNave.backgroundSearchButtonAriaLabel', {
      defaultMessage: 'Background searches',
    }),
    description: i18n.translate('dashboard.topNave.backgroundSearchConfigDescription', {
      defaultMessage: 'Open background searches',
    }),
  },
};

export const getControlButtonTitle = () =>
  i18n.translate('dashboard.editingToolbar.controlsButtonTitle', {
    defaultMessage: 'Controls',
  });

export const getAddControlButtonTitle = () =>
  i18n.translate('dashboard.editingToolbar.addControlButtonTitle', {
    defaultMessage: 'Control',
  });

export const getAddESQLControlButtonTitle = () =>
  i18n.translate('dashboard.editingToolbar.addESQLControlButtonTitle', {
    defaultMessage: 'Variable control',
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
    defaultMessage: 'Time slider control',
  });
