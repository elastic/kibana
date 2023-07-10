/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const DashboardLinkEmbeddableStrings = {
  getDisplayName: () =>
    i18n.translate('navigationEmbeddable.dashboardLink.displayName', {
      defaultMessage: 'Dashboard',
    }),
  getDescription: () =>
    i18n.translate('navigationEmbeddable.dsahboardLink.description', {
      defaultMessage: 'Go to dashboard',
    }),
  getSearchPlaceholder: () =>
    i18n.translate('navigationEmbeddable.dashboardLink.editor.searchPlaceholder', {
      defaultMessage: 'Search for a dashboard',
    }),
  getDashboardPickerAriaLabel: () =>
    i18n.translate('navigationEmbeddable.dashboardLink.editor.dashboardPickerAriaLabel', {
      defaultMessage: 'Pick a destination dashboard',
    }),
  getCurrentDashboardLabel: () =>
    i18n.translate('navigationEmbeddable.dashboardLink.editor.currentDashboardLabel', {
      defaultMessage: 'Current',
    }),
};
