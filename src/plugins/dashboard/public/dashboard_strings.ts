/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ViewMode } from './services/embeddable';

/**
 * @param title {string} the current title of the dashboard
 * @param viewMode {DashboardViewMode} the current mode. If in editing state, prepends 'Editing ' to the title.
 * @param isDirty {boolean} if the dashboard is in a dirty state. If in dirty state, adds (unsaved) to the
 * end of the title.
 * @returns {string} A title to display to the user based on the above parameters.
 */
export function getDashboardTitle(
  title: string,
  viewMode: ViewMode,
  isDirty: boolean,
  isNew: boolean
): string {
  const isEditMode = viewMode === ViewMode.EDIT;
  let displayTitle: string;
  const newDashboardTitle = i18n.translate('dashboard.savedDashboard.newDashboardTitle', {
    defaultMessage: 'New Dashboard',
  });
  const dashboardTitle = isNew ? newDashboardTitle : title;

  if (isEditMode && isDirty) {
    displayTitle = i18n.translate('dashboard.strings.dashboardUnsavedEditTitle', {
      defaultMessage: 'Editing {title} (unsaved)',
      values: { title: dashboardTitle },
    });
  } else if (isEditMode) {
    displayTitle = i18n.translate('dashboard.strings.dashboardEditTitle', {
      defaultMessage: 'Editing {title}',
      values: { title: dashboardTitle },
    });
  } else {
    displayTitle = dashboardTitle;
  }

  return displayTitle;
}

/*
  Plugin
*/

export const getDashboardBreadcrumb = () =>
  i18n.translate('dashboard.dashboardAppBreadcrumbsTitle', {
    defaultMessage: 'Dashboard',
  });

export const getDashboardPageTitle = () =>
  i18n.translate('dashboard.dashboardPageTitle', {
    defaultMessage: 'Dashboards',
  });

export const dashboardFeatureCatalog = {
  getTitle: () =>
    i18n.translate('dashboard.featureCatalogue.dashboardTitle', {
      defaultMessage: 'Dashboard',
    }),
  getSubtitle: () =>
    i18n.translate('dashboard.featureCatalogue.dashboardSubtitle', {
      defaultMessage: 'Analyze data in dashboards.',
    }),
  getDescription: () =>
    i18n.translate('dashboard.featureCatalogue.dashboardDescription', {
      defaultMessage: 'Display and share a collection of visualizations and saved searches.',
    }),
};

/*
  Actions
*/
export const dashboardAddToLibraryAction = {
  getDisplayName: () =>
    i18n.translate('dashboard.panel.AddToLibrary', {
      defaultMessage: 'Save to library',
    }),
  getSuccessMessage: (panelTitle: string) =>
    i18n.translate('dashboard.panel.addToLibrary.successMessage', {
      defaultMessage: `Panel {panelTitle} was added to the visualize library`,
      values: { panelTitle },
    }),
};

export const dashboardClonePanelAction = {
  getDisplayName: () =>
    i18n.translate('dashboard.panel.clonePanel', {
      defaultMessage: 'Clone panel',
    }),
  getClonedTag: () =>
    i18n.translate('dashboard.panel.title.clonedTag', {
      defaultMessage: 'copy',
    }),
  getSuccessMessage: () =>
    i18n.translate('dashboard.panel.clonedToast', {
      defaultMessage: 'Cloned panel',
    }),
};

export const dashboardExpandPanelAction = {
  getMinimizeTitle: () =>
    i18n.translate('dashboard.actions.toggleExpandPanelMenuItem.expandedDisplayName', {
      defaultMessage: 'Minimize',
    }),
  getMaximizeTitle: () =>
    i18n.translate('dashboard.actions.toggleExpandPanelMenuItem.notExpandedDisplayName', {
      defaultMessage: 'Maximize panel',
    }),
};

export const dashboardExportCsvAction = {
  getDisplayName: () =>
    i18n.translate('dashboard.actions.DownloadCreateDrilldownAction.displayName', {
      defaultMessage: 'Download as CSV',
    }),
  getUntitledFilename: () =>
    i18n.translate('dashboard.actions.downloadOptionsUnsavedFilename', {
      defaultMessage: 'untitled',
    }),
};

export const dashboardUnlinkFromLibraryAction = {
  getDisplayName: () =>
    i18n.translate('dashboard.panel.unlinkFromLibrary', {
      defaultMessage: 'Unlink from library',
    }),
  getSuccessMessage: (panelTitle: string) =>
    i18n.translate('dashboard.panel.unlinkFromLibrary.successMessage', {
      defaultMessage: `Panel {panelTitle} is no longer connected to the visualize library`,
      values: { panelTitle },
    }),
};

export const dashboardLibraryNotification = {
  getDisplayName: () =>
    i18n.translate('dashboard.panel.LibraryNotification', {
      defaultMessage: 'Visualize Library Notification',
    }),
  getTooltip: () =>
    i18n.translate('dashboard.panel.libraryNotification.toolTip', {
      defaultMessage:
        'Editing this panel might affect other dashboards. To change to this panel only, unlink it from the library.',
    }),
  getPopoverAriaLabel: () =>
    i18n.translate('dashboard.panel.libraryNotification.ariaLabel', {
      defaultMessage: 'View library information and unlink this panel',
    }),
};

export const dashboardReplacePanelAction = {
  getDisplayName: () =>
    i18n.translate('dashboard.panel.removePanel.replacePanel', {
      defaultMessage: 'Replace panel',
    }),
  getSuccessMessage: (savedObjectName: string) =>
    i18n.translate('dashboard.addPanel.savedObjectAddedToContainerSuccessMessageTitle', {
      defaultMessage: '{savedObjectName} was added',
      values: {
        savedObjectName,
      },
    }),
  getNoMatchingObjectsMessage: () =>
    i18n.translate('dashboard.addPanel.noMatchingObjectsMessage', {
      defaultMessage: 'No matching objects found.',
    }),
};

/*
  Dashboard Editor
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
};

export const getDashboard60Warning = () =>
  i18n.translate('dashboard.urlWasRemovedInSixZeroWarningMessage', {
    defaultMessage: 'The url "dashboard/create" was removed in 6.0. Please update your bookmarks.',
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

export const leaveConfirmStrings = {
  getLeaveTitle: () =>
    i18n.translate('dashboard.appLeaveConfirmModal.unsavedChangesTitle', {
      defaultMessage: 'Unsaved changes',
    }),
  getLeaveSubtitle: () =>
    i18n.translate('dashboard.appLeaveConfirmModal.unsavedChangesSubtitle', {
      defaultMessage: 'Leave Dashboard with unsaved work?',
    }),
  getDiscardTitle: () =>
    i18n.translate('dashboard.changeViewModeConfirmModal.discardChangesTitle', {
      defaultMessage: 'Discard changes to dashboard?',
    }),
  getDiscardSubtitle: () =>
    i18n.translate('dashboard.changeViewModeConfirmModal.discardChangesDescription', {
      defaultMessage: `Once you discard your changes, there's no getting them back.`,
    }),
  getConfirmButtonText: () =>
    i18n.translate('dashboard.changeViewModeConfirmModal.confirmButtonLabel', {
      defaultMessage: 'Discard changes',
    }),
  getCancelButtonText: () =>
    i18n.translate('dashboard.changeViewModeConfirmModal.cancelButtonLabel', {
      defaultMessage: 'Continue editing',
    }),
};

/*
  Empty Screen
*/
export const emptyScreenStrings = {
  getEmptyDashboardTitle: () =>
    i18n.translate('dashboard.emptyDashboardTitle', {
      defaultMessage: 'This dashboard is empty.',
    }),
  getEmptyDashboardAdditionalPrivilege: () =>
    i18n.translate('dashboard.emptyDashboardAdditionalPrivilege', {
      defaultMessage: 'You need additional privileges to edit this dashboard.',
    }),
  getFillDashboardTitle: () =>
    i18n.translate('dashboard.fillDashboardTitle', {
      defaultMessage: 'This dashboard is empty. Let\u2019s fill it up!',
    }),
  getHowToStartWorkingOnNewDashboardDescription1: () =>
    i18n.translate('dashboard.howToStartWorkingOnNewDashboardDescription1', {
      defaultMessage: 'Click',
    }),
  getHowToStartWorkingOnNewDashboardDescription2: () =>
    i18n.translate('dashboard.howToStartWorkingOnNewDashboardDescription2', {
      defaultMessage: 'in the menu bar above to start adding panels.',
    }),
  getHowToStartWorkingOnNewDashboardEditLinkText: () =>
    i18n.translate('dashboard.howToStartWorkingOnNewDashboardEditLinkText', {
      defaultMessage: 'Edit',
    }),
  getHowToStartWorkingOnNewDashboardEditLinkAriaLabel: () =>
    i18n.translate('dashboard.howToStartWorkingOnNewDashboardEditLinkAriaLabel', {
      defaultMessage: 'Edit dashboard',
    }),
  getEmptyWidgetTitle: () =>
    i18n.translate('dashboard.emptyWidget.addPanelTitle', {
      defaultMessage: 'Add your first panel',
    }),
  getEmptyWidgetDescription: () =>
    i18n.translate('dashboard.emptyWidget.addPanelDescription', {
      defaultMessage: 'Create content that tells a story about your data.',
    }),
};

/*
  Dashboard Listing Page
*/
export const dashboardListingTable = {
  getEntityName: () =>
    i18n.translate('dashboard.listing.table.entityName', {
      defaultMessage: 'dashboard',
    }),
  getEntityNamePlural: () =>
    i18n.translate('dashboard.listing.table.entityNamePlural', {
      defaultMessage: 'dashboards',
    }),
  getTableListTitle: () => getDashboardPageTitle(),
  getTableCaption: () => getDashboardPageTitle(),
  getTitleColumnName: () =>
    i18n.translate('dashboard.listing.table.titleColumnName', {
      defaultMessage: 'Title',
    }),
  getDescriptionColumnName: () =>
    i18n.translate('dashboard.listing.table.descriptionColumnName', {
      defaultMessage: 'Description',
    }),
};
