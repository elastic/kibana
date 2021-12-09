/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ViewMode } from './services/embeddable';

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

export const unsavedChangesBadge = {
  getUnsavedChangedBadgeText: () =>
    i18n.translate('dashboard.unsavedChangesBadge', {
      defaultMessage: 'Unsaved changes',
    }),
};

export const getMigratedToastText = () =>
  i18n.translate('dashboard.migratedChanges', {
    defaultMessage: 'Some panels have been successfully updated to the latest version.',
  });

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
export const dashboardCopyToDashboardAction = {
  getDisplayName: () =>
    i18n.translate('dashboard.panel.copyToDashboard.title', {
      defaultMessage: 'Copy to dashboard',
    }),
  getCancelButtonName: () =>
    i18n.translate('dashboard.panel.copyToDashboard.cancel', {
      defaultMessage: 'Cancel',
    }),
  getAcceptButtonName: () =>
    i18n.translate('dashboard.panel.copyToDashboard.goToDashboard', {
      defaultMessage: 'Copy and go to dashboard',
    }),
  getNewDashboardOption: () =>
    i18n.translate('dashboard.panel.copyToDashboard.newDashboardOptionLabel', {
      defaultMessage: 'New dashboard',
    }),
  getExistingDashboardOption: () =>
    i18n.translate('dashboard.panel.copyToDashboard.existingDashboardOptionLabel', {
      defaultMessage: 'Existing dashboard',
    }),
  getDescription: () =>
    i18n.translate('dashboard.panel.copyToDashboard.description', {
      defaultMessage: 'Choose the destination dashboard.',
    }),
};

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
export const getNewDashboardTitle = () =>
  i18n.translate('dashboard.savedDashboard.newDashboardTitle', {
    defaultMessage: 'New Dashboard',
  });

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

export const dashboardSaveToastStrings = {
  getSuccessString: (dashTitle: string) =>
    i18n.translate('dashboard.dashboardWasSavedSuccessMessage', {
      defaultMessage: `Dashboard '{dashTitle}' was saved`,
      values: { dashTitle },
    }),
  getFailureString: (dashTitle: string, errorMessage: string) =>
    i18n.translate('dashboard.dashboardWasNotSavedDangerMessage', {
      defaultMessage: `Dashboard '{dashTitle}' was not saved. Error: {errorMessage}`,
      values: {
        dashTitle,
        errorMessage,
      },
    }),
};

/*
  Modals
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

export const leaveEditModeConfirmStrings = {
  getLeaveEditModeTitle: () =>
    i18n.translate('dashboard.changeViewModeConfirmModal.leaveEditModeTitle', {
      defaultMessage: 'You have unsaved changes',
    }),
  getLeaveEditModeSubtitle: () =>
    i18n.translate('dashboard.changeViewModeConfirmModal.description', {
      defaultMessage: `You can keep or discard your changes on return to view mode.  You can't recover discarded changes.`,
    }),
  getLeaveEditModeKeepChangesText: () =>
    i18n.translate('dashboard.changeViewModeConfirmModal.keepUnsavedChangesButtonLabel', {
      defaultMessage: 'Keep changes',
    }),
  getLeaveEditModeDiscardButtonText: () =>
    i18n.translate('dashboard.changeViewModeConfirmModal.confirmButtonLabel', {
      defaultMessage: 'Discard changes',
    }),
  getLeaveEditModeCancelButtonText: () =>
    i18n.translate('dashboard.changeViewModeConfirmModal.cancelButtonLabel', {
      defaultMessage: 'Continue editing',
    }),
};

export const discardConfirmStrings = {
  getDiscardTitle: () =>
    i18n.translate('dashboard.discardChangesConfirmModal.discardChangesTitle', {
      defaultMessage: 'Discard changes to dashboard?',
    }),
  getDiscardSubtitle: () =>
    i18n.translate('dashboard.discardChangesConfirmModal.discardChangesDescription', {
      defaultMessage: `Once you discard your changes, there's no getting them back.`,
    }),
  getDiscardConfirmButtonText: () =>
    i18n.translate('dashboard.discardChangesConfirmModal.confirmButtonLabel', {
      defaultMessage: 'Discard changes',
    }),
  getDiscardCancelButtonText: () =>
    i18n.translate('dashboard.discardChangesConfirmModal.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
};

export const createConfirmStrings = {
  getCreateTitle: () =>
    i18n.translate('dashboard.createConfirmModal.unsavedChangesTitle', {
      defaultMessage: 'New dashboard already in progress',
    }),
  getCreateSubtitle: () =>
    i18n.translate('dashboard.createConfirmModal.unsavedChangesSubtitle', {
      defaultMessage: 'Continue editing or start over with a blank dashboard.',
    }),
  getStartOverButtonText: () =>
    i18n.translate('dashboard.createConfirmModal.confirmButtonLabel', {
      defaultMessage: 'Start over',
    }),
  getContinueButtonText: () =>
    i18n.translate('dashboard.createConfirmModal.continueButtonLabel', {
      defaultMessage: 'Continue editing',
    }),
  getCancelButtonText: () =>
    i18n.translate('dashboard.createConfirmModal.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
};

/*
  Error Messages
*/

export const panelStorageErrorStrings = {
  getPanelsGetError: (message: string) =>
    i18n.translate('dashboard.panelStorageError.getError', {
      defaultMessage: 'Error encountered while fetching unsaved changes: {message}',
      values: { message },
    }),
  getPanelsSetError: (message: string) =>
    i18n.translate('dashboard.panelStorageError.setError', {
      defaultMessage: 'Error encountered while setting unsaved changes: {message}',
      values: { message },
    }),
  getPanelsClearError: (message: string) =>
    i18n.translate('dashboard.panelStorageError.clearError', {
      defaultMessage: 'Error encountered while clearing unsaved changes: {message}',
      values: { message },
    }),
};

export const dashboardLoadingErrorStrings = {
  getDashboardLoadError: (message: string) =>
    i18n.translate('dashboard.loadingError.errorMessage', {
      defaultMessage: 'Error encountered while loading saved dashboard: {message}',
      values: { message },
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
  getHowToStartWorkingOnNewDashboardDescription: () =>
    i18n.translate('dashboard.howToStartWorkingOnNewDashboardDescription', {
      defaultMessage: 'Click edit in the menu bar above to start adding panels.',
    }),
  getHowToStartWorkingOnNewDashboardEditLinkAriaLabel: () =>
    i18n.translate('dashboard.howToStartWorkingOnNewDashboardEditLinkAriaLabel', {
      defaultMessage: 'Edit dashboard',
    }),
  getEmptyWidgetTitle: () =>
    i18n.translate('dashboard.emptyWidget.addPanelTitle', {
      defaultMessage: 'Add your first visualization',
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

export const dashboardUnsavedListingStrings = {
  getUnsavedChangesTitle: (plural = false) =>
    i18n.translate('dashboard.listing.unsaved.unsavedChangesTitle', {
      defaultMessage: 'You have unsaved changes in the following {dash}:',
      values: {
        dash: plural
          ? dashboardListingTable.getEntityNamePlural()
          : dashboardListingTable.getEntityName(),
      },
    }),
  getLoadingTitle: () =>
    i18n.translate('dashboard.listing.unsaved.loading', {
      defaultMessage: 'Loading',
    }),
  getEditAriaLabel: (title: string) =>
    i18n.translate('dashboard.listing.unsaved.editAria', {
      defaultMessage: 'Continue editing {title}',
      values: { title },
    }),
  getEditTitle: () =>
    i18n.translate('dashboard.listing.unsaved.editTitle', {
      defaultMessage: 'Continue editing',
    }),
  getDiscardAriaLabel: (title: string) =>
    i18n.translate('dashboard.listing.unsaved.discardAria', {
      defaultMessage: 'Discard changes to {title}',
      values: { title },
    }),
  getDiscardTitle: () =>
    i18n.translate('dashboard.listing.unsaved.discardTitle', {
      defaultMessage: 'Discard changes',
    }),
};

export const getCreateVisualizationButtonTitle = () =>
  i18n.translate('dashboard.solutionToolbar.addPanelButtonLabel', {
    defaultMessage: 'Create visualization',
  });

export const noItemsStrings = {
  getReadonlyTitle: () =>
    i18n.translate('dashboard.listing.readonlyNoItemsTitle', {
      defaultMessage: 'No dashboards to view',
    }),
  getReadonlyBody: () =>
    i18n.translate('dashboard.listing.readonlyNoItemsBody', {
      defaultMessage: `There are no available dashboards. To change your permissions to view the dashboards in this space, contact your administrator.`,
    }),
  getReadEditTitle: () =>
    i18n.translate('dashboard.listing.createNewDashboard.title', {
      defaultMessage: 'Create your first dashboard',
    }),
  getReadEditInProgressTitle: () =>
    i18n.translate('dashboard.listing.createNewDashboard.inProgressTitle', {
      defaultMessage: 'Dashboard in progress',
    }),
  getReadEditDashboardDescription: () =>
    i18n.translate('dashboard.listing.createNewDashboard.combineDataViewFromKibanaAppDescription', {
      defaultMessage:
        'Analyze all of your Elastic data in one place by creating a dashboard and adding visualizations.',
    }),
  getSampleDataLinkText: () =>
    i18n.translate('dashboard.listing.createNewDashboard.sampleDataInstallLinkText', {
      defaultMessage: `Add some sample data`,
    }),
  getCreateNewDashboardText: () =>
    i18n.translate('dashboard.listing.createNewDashboard.createButtonLabel', {
      defaultMessage: `Create a dashboard`,
    }),
};
