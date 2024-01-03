/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

/*
  Empty Screen
*/
export const emptyScreenStrings = {
  // Edit mode
  getEditModeTitle: () =>
    i18n.translate('dashboard.emptyScreen.editModeTitle', {
      defaultMessage: 'This dashboard is empty. Let\u2019s fill it up!',
    }),
  getEditModeSubtitle: () =>
    i18n.translate('dashboard.emptyScreen.editModeSubtitle', {
      defaultMessage: 'Create a visualization of your data, or add one from the library.',
    }),
  getAddFromLibraryButtonTitle: () =>
    i18n.translate('dashboard.emptyScreen.addFromLibrary', {
      defaultMessage: 'Add from library',
    }),
  getCreateVisualizationButtonTitle: () =>
    i18n.translate('dashboard.emptyScreen.createVisualization', {
      defaultMessage: 'Create visualization',
    }),

  // View Mode with permissions
  getViewModeWithPermissionsTitle: () =>
    i18n.translate('dashboard.emptyScreen.viewModeTitle', {
      defaultMessage: 'Add visualizations to your dashboard',
    }),
  getViewModeWithPermissionsSubtitle: () =>
    i18n.translate('dashboard.emptyScreen.viewModeSubtitle', {
      defaultMessage: 'Enter edit mode, and then start adding your visualizations.',
    }),
  getEditLinkTitle: () =>
    i18n.translate('dashboard.emptyScreen.editDashboard', {
      defaultMessage: 'Edit dashboard',
    }),

  // View Mode without permissions
  getViewModeWithoutPermissionsTitle: () =>
    i18n.translate('dashboard.emptyScreen.noPermissionsTitle', {
      defaultMessage: 'This dashboard is empty.',
    }),
  getViewModeWithoutPermissionsSubtitle: () =>
    i18n.translate('dashboard.emptyScreen.noPermissionsSubtitle', {
      defaultMessage: 'You need additional privileges to edit this dashboard.',
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

export const dashboardSavedObjectErrorStrings = {
  getDashboardGridError: (message: string) =>
    i18n.translate('dashboard.loadingError.dashboardGridErrorMessage', {
      defaultMessage: 'Unable to load dashboard: {message}',
      values: { message },
    }),
  getErrorDeletingDashboardToast: () =>
    i18n.translate('dashboard.deleteError.toastDescription', {
      defaultMessage: 'Error encountered while deleting dashboard',
    }),
};

export const backupServiceStrings = {
  viewModeStorageError: (message: string) =>
    i18n.translate('dashboard.viewmodeBackup.error', {
      defaultMessage: 'Error encountered while backing up view mode: {message}',
      values: { message },
    }),
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
