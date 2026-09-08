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
  getFilePickerLabel: () =>
    i18n.translate('dashboard.importJson.flyout.filePickerLabel', {
      defaultMessage: 'Select a JSON file',
    }),
  getImportButtonLabel: () =>
    i18n.translate('dashboard.importJson.flyout.importButton', {
      defaultMessage: 'Import',
    }),
  getCancelButtonLabel: () =>
    i18n.translate('dashboard.importJson.flyout.cancelButton', {
      defaultMessage: 'Cancel',
    }),
  getInvalidJsonError: () =>
    i18n.translate('dashboard.importJson.flyout.invalidJsonError', {
      defaultMessage: 'The selected file does not contain valid JSON.',
    }),
  getServerValidationError: () =>
    i18n.translate('dashboard.importJson.flyout.serverValidationError', {
      defaultMessage:
        'The file could not be imported. Make sure it was exported from the Dashboard export feature.',
    }),
  getServerErrorShowDetails: () =>
    i18n.translate('dashboard.importJson.flyout.serverErrorShowDetails', {
      defaultMessage: 'Show details',
    }),
  getServerErrorHideDetails: () =>
    i18n.translate('dashboard.importJson.flyout.serverErrorHideDetails', {
      defaultMessage: 'Hide details',
    }),
  getWarningsTitle: () =>
    i18n.translate('dashboard.importJson.flyout.warningsTitle', {
      defaultMessage: 'Import warnings',
    }),
  getWarningsBody: () =>
    i18n.translate('dashboard.importJson.flyout.warningsBody', {
      defaultMessage:
        'Some panels could not be imported as configured. They will be imported in a degraded state.',
    }),
  getSuccessToast: (title: string) =>
    i18n.translate('dashboard.importJson.successToast', {
      defaultMessage: 'Dashboard "{title}" imported successfully.',
      values: { title },
    }),
  getImportingLabel: () =>
    i18n.translate('dashboard.importJson.flyout.importing', {
      defaultMessage: 'Importing…',
    }),
};
