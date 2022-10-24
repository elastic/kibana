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

export const dashboardListingErrorStrings = {
  getDashboardLoadError: (message: string) =>
    i18n.translate('dashboard.loadingError.errorMessage', {
      defaultMessage: 'Error encountered while loading saved dashboard: {message}',
      values: { message },
    }),
  getErrorDeletingDashboardToast: () =>
    i18n.translate('dashboard.deleteError.toastDescription', {
      defaultMessage: 'Error encountered while deleting dashboard',
    }),
  getPanelTooOldError: () =>
    i18n.translate('dashboard.loadURLError.PanelTooOld', {
      defaultMessage: 'Cannot load panels from a URL created in a version older than 7.3',
    }),
};

/*
  Dashboard Listing Page
*/
export const dashboardListingTableStrings = {
  getEntityName: () =>
    i18n.translate('dashboard.listing.table.entityName', {
      defaultMessage: 'dashboard',
    }),
  getEntityNamePlural: () =>
    i18n.translate('dashboard.listing.table.entityNamePlural', {
      defaultMessage: 'dashboards',
    }),
  getTableListTitle: () => getDashboardPageTitle(),
};

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

export const dashboardUnsavedListingStrings = {
  getUnsavedChangesTitle: (plural = false) =>
    i18n.translate('dashboard.listing.unsaved.unsavedChangesTitle', {
      defaultMessage: 'You have unsaved changes in the following {dash}:',
      values: {
        dash: plural
          ? dashboardListingTableStrings.getEntityNamePlural()
          : dashboardListingTableStrings.getEntityName(),
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

/*
  Plugin
*/

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

export const getDashboardBreadcrumb = () =>
  i18n.translate('dashboard.dashboardAppBreadcrumbsTitle', {
    defaultMessage: 'Dashboard',
  });
