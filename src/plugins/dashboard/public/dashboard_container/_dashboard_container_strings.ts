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

export const dashboardSavedObjectErrorStrings = {
  getDashboardLoadError: (message: string) =>
    i18n.translate('dashboard.loadingError.errorMessage', {
      defaultMessage: 'Error encountered while loading saved dashboard: {message}',
      values: { message },
    }),
  getDashboardGridError: (message: string) =>
    i18n.translate('dashboard.loadingError.dashboardGridErrorMessage', {
      defaultMessage: 'Unable to load dashboard: {message}',
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
