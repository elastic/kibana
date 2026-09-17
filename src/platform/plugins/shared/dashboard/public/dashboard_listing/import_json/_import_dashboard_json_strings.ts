/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const importDashboardJsonStrings = {
  getFlyoutTitle: () =>
    i18n.translate('dashboard.importJson.flyout.title', {
      defaultMessage: 'Import dashboard',
    }),
  getServerValidationErrorTitle: () =>
    i18n.translate('dashboard.importJson.flyout.serverValidationErrorTitle', {
      defaultMessage: 'The file could not be imported.',
    }),
  getServerValidationErrorText: () =>
    i18n.translate('dashboard.importJson.flyout.serverValidationErrorText', {
      defaultMessage:
        'Make sure it contains the full dashboard definition and was exported from the "Export JSON" dashboard option.',
    }),
  getWarningsBody: (count: number) =>
    i18n.translate('dashboard.importJson.flyout.warningsSummary', {
      defaultMessage:
        '{count} item{count, plural, one {} other {s}} removed from the imported dashboard.',
      values: { count },
    }),
  getSuccessToast: (title: string) =>
    i18n.translate('dashboard.importJson.successToast', {
      defaultMessage: 'Dashboard "{title}" imported successfully.',
      values: { title },
    }),
};
