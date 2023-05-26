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
  getEmptyDashboardTitle: () =>
    i18n.translate('dashboard.emptyDashboardTitle', {
      defaultMessage: 'Start adding visualizations',
    }),
  getEmptyDashboardAdditionalPrivilege: () =>
    i18n.translate('dashboard.emptyDashboardAdditionalPrivilege', {
      defaultMessage: 'You need additional privileges to edit this dashboard.',
    }),
  getHowToStartWorkingOnNewDashboardDescription: () =>
    i18n.translate('dashboard.howToStartWorkingOnNewDashboardDescription', {
      defaultMessage: 'To add visualizations, use edit mode.',
    }),
  getEditLinkTitle: () =>
    i18n.translate('dashboard.howToStartWorkingOnNewDashboardEditLinkAriaLabel', {
      defaultMessage: 'Edit dashboard',
    }),
  getEmptyWidgetTitle: () =>
    i18n.translate('dashboard.emptyWidget.addPanelTitle', {
      defaultMessage: 'Add your first visualization',
    }),
  getEmptyWidgetDescription: () =>
    i18n.translate('dashboard.emptyWidget.addPanelDescription', {
      defaultMessage: 'Create a visualization of your data, or add one from the Visualize Library.',
    }),
  getAddFromLibraryButtonTitle: () =>
    i18n.translate('dashboard.emptyWidget.addFromLibrary', {
      defaultMessage: 'Add from library',
    }),
  getCreateVisualizationButtonTitle: () =>
    i18n.translate('dashboard.emptyWidget.createVisualization', {
      defaultMessage: 'Create visualization',
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
