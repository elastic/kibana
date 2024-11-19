/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const DashboardLinkStrings = {
  getType: () =>
    i18n.translate('links.dashboardLink.type', {
      defaultMessage: 'Dashboard link',
    }),
  getDisplayName: () =>
    i18n.translate('links.dashboardLink.displayName', {
      defaultMessage: 'Dashboard',
    }),
  getDescription: () =>
    i18n.translate('links.dashboardLink.description', {
      defaultMessage: 'Go to dashboard',
    }),
  getDashboardPickerPlaceholder: () =>
    i18n.translate('links.dashboardLink.editor.dashboardComboBoxPlaceholder', {
      defaultMessage: 'Search for a dashboard',
    }),
  getDashboardPickerAriaLabel: () =>
    i18n.translate('links.dashboardLink.editor.dashboardPickerAriaLabel', {
      defaultMessage: 'Pick a destination dashboard',
    }),
  getCurrentDashboardLabel: () =>
    i18n.translate('links.dashboardLink.editor.currentDashboardLabel', {
      defaultMessage: 'Current',
    }),
  getLoadingDashboardLabel: () =>
    i18n.translate('links.dashboardLink.editor.loadingDashboardLabel', {
      defaultMessage: 'Loading...',
    }),
  getDashboardErrorLabel: () =>
    i18n.translate('links.dashboardLink.editor.dashboardErrorLabel', {
      defaultMessage: 'Error fetching dashboard',
    }),
};
