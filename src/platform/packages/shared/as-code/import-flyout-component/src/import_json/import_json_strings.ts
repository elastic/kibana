/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const importJsonFlyoutStrings = {
  getImportButtonLabel: () =>
    i18n.translate('asCodeImport.importJson.importButton', {
      defaultMessage: 'Import',
    }),
  getCancelButtonLabel: () =>
    i18n.translate('asCodeImport.importJson.cancelButton', {
      defaultMessage: 'Cancel',
    }),
  getImportingLabel: () =>
    i18n.translate('asCodeImport.importJson.importing', {
      defaultMessage: 'Importing…',
    }),
  getFilePickerLabel: () =>
    i18n.translate('asCodeImport.importJson.filePickerLabel', {
      defaultMessage: 'Select a JSON file',
    }),
  getInvalidJsonError: () =>
    i18n.translate('asCodeImport.importJson.invalidJsonError', {
      defaultMessage: 'The selected file does not contain valid JSON.',
    }),
  getFileTooLargeError: () =>
    i18n.translate('asCodeImport.importJson.fileTooLargeError', {
      defaultMessage: 'The selected file is too large. The maximum size is 1 MB.',
    }),
  getTechnicalPreviewBadgeLabel: () =>
    i18n.translate('asCodeImport.importJson.technicalPreviewBadgeLabel', {
      defaultMessage: 'TECHNICAL PREVIEW',
    }),
  getTechnicalPreviewBadgeTooltip: () =>
    i18n.translate('asCodeImport.importJson.technicalPreviewBadgeTooltip', {
      defaultMessage:
        'This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
    }),
  getNdjsonNoteLinkLabel: () =>
    i18n.translate('asCodeImport.importJson.ndjsonNoteLink', {
      defaultMessage: 'the Saved Objects page',
    }),
  getReviewWarningsTitle: () =>
    i18n.translate('asCodeImport.importJson.reviewWarningsTitle', {
      defaultMessage: 'Review import warnings',
    }),
  getWarningsTitle: () =>
    i18n.translate('asCodeImport.importJson.warningsTitle', {
      defaultMessage: 'Unsupported properties were removed',
    }),
  getWarningsSummary: (count: number) =>
    i18n.translate('asCodeImport.importJson.warningsSummary', {
      defaultMessage:
        '{count} item{count, plural, one {} other {s}} removed from the imported file.',
      values: { count },
    }),
  getWarningsAccordionShow: () =>
    i18n.translate('asCodeImport.importJson.warningsAccordionShow', {
      defaultMessage: 'Show details',
    }),
  getWarningsAccordionHide: () =>
    i18n.translate('asCodeImport.importJson.warningsAccordionHide', {
      defaultMessage: 'Hide details',
    }),
  getRelatedItemsSummary: (count: number) =>
    i18n.translate('asCodeImport.importJson.relatedItemsSummary', {
      defaultMessage:
        'This import references {count} related item{count, plural, one {} other {s}}. Make sure that these items exist in this cluster or space.',
      values: { count },
    }),
  getRelatedItemsTruncatedSummary: (displayedCount: number) =>
    i18n.translate('asCodeImport.importJson.relatedItemsTruncatedSummary', {
      defaultMessage: 'Showing the first {displayedCount}.',
      values: { displayedCount },
    }),
  getRelatedItemsTypeColumn: () =>
    i18n.translate('asCodeImport.importJson.relatedItemsTypeColumn', {
      defaultMessage: 'Item type',
    }),
  getRelatedItemsIdColumn: () =>
    i18n.translate('asCodeImport.importJson.relatedItemsIdColumn', {
      defaultMessage: 'Item ID',
    }),
  getRelatedItemsTableCaption: () =>
    i18n.translate('asCodeImport.importJson.relatedItemsTableCaption', {
      defaultMessage: 'Related items that should exist in this cluster or space',
    }),
};
