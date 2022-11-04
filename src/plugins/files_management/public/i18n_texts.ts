/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  titleColumnName: i18n.translate('filesManagement.table.titleColumnName', {
    defaultMessage: 'Name',
  }),
  tableListTitle: i18n.translate('filesManagement.table.title', { defaultMessage: 'Files' }),
  entityName: i18n.translate('filesManagement.entityName.title', { defaultMessage: 'file' }),
  retry: i18n.translate('filesManagement.button.retry', {
    defaultMessage: 'Retry',
  }),
  entityNamePlural: i18n.translate('filesManagement.entityNamePlural.title', {
    defaultMessage: 'files',
  }),
  emptyPromptTitle: i18n.translate('filesManagement.emptyPrompt.title', {
    defaultMessage: 'No files found',
  }),
  emptyPromptDescription: i18n.translate('filesManagement.emptyPrompt.description', {
    defaultMessage: 'Any files created in Kibana will be listed here.',
  }),
  size: i18n.translate('filesManagement.table.sizeColumnName', {
    defaultMessage: 'Size',
  }),
  diagnosticsFlyoutTitle: i18n.translate('filesManagement.diagnostics.flyoutTitle', {
    defaultMessage: 'Diagnostics',
  }),
  failedToFetchDiagnostics: i18n.translate('filesManagement.diagnostics.errorMessage', {
    defaultMessage: 'Could not fetch diagnostics',
  }),
  diagnosticsSpaceUsed: i18n.translate('filesManagement.diagnostics.spaceUsedLabel', {
    defaultMessage: 'Total space used',
  }),
  diagnosticsTotalCount: i18n.translate('filesManagement.diagnostics.totalCountLabel', {
    defaultMessage: 'Total number of files',
  }),
  diagnosticsBreakdownsStatus: i18n.translate('filesManagement.diagnostics.breakdownStatusTitle', {
    defaultMessage: 'Count by status',
  }),
  diagnosticsBreakdownsExtension: i18n.translate(
    'filesManagement.diagnostics.breakdownExtensionTitle',
    {
      defaultMessage: 'Count by extension',
    }
  ),
  filesFlyoutSize: i18n.translate('filesManagement.filesFlyout.sizeLabel', {
    defaultMessage: 'Size',
  }),
  filesFlyoutExtension: i18n.translate('filesManagement.filesFlyout.extensionLabel', {
    defaultMessage: 'Extension',
  }),
  filesFlyoutMimeType: i18n.translate('filesManagement.filesFlyout.mimeTypeLabel', {
    defaultMessage: 'MIME type',
  }),
  filesFlyoutStatus: i18n.translate('filesManagement.filesFlyout.statusLabel', {
    defaultMessage: 'Status',
  }),
  filesFlyoutCreated: i18n.translate('filesManagement.filesFlyout.createdLabel', {
    defaultMessage: 'Created',
  }),
  filesFlyoutUpdated: i18n.translate('filesManagement.filesFlyout.updatedLabel', {
    defaultMessage: 'Updated',
  }),
};
