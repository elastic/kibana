/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FileStatus } from '@kbn/files-plugin/common';
import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  tableListTitle: i18n.translate('filesManagement.table.title', { defaultMessage: 'Files' }),
  tableListDescription: i18n.translate('filesManagement.table.description', {
    defaultMessage: 'Manage files stored in Kibana.',
  }),
  titleColumnName: i18n.translate('filesManagement.table.titleColumnName', {
    defaultMessage: 'Name',
  }),
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
    defaultMessage: 'Statistics',
  }),
  diagnosticsFlyoutSummarySectionTitle: i18n.translate(
    'filesManagement.diagnostics.summarySectionTitle',
    {
      defaultMessage: 'Summary',
    }
  ),
  failedToFetchDiagnostics: i18n.translate('filesManagement.diagnostics.errorMessage', {
    defaultMessage: 'Could not fetch statistics',
  }),
  diagnosticsSpaceUsed: i18n.translate('filesManagement.diagnostics.spaceUsedLabel', {
    defaultMessage: 'Disk space used',
  }),
  diagnosticsTotalCount: i18n.translate('filesManagement.diagnostics.totalCountLabel', {
    defaultMessage: 'Number of files',
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
  filesFlyoutDownload: i18n.translate('filesManagement.filesFlyout.downloadButtonLabel', {
    defaultMessage: 'Download',
  }),
  filesFlyoutPreview: i18n.translate('filesManagement.filesFlyout.previewSectionTitle', {
    defaultMessage: 'Preview',
  }),
  filesStatus: {
    AWAITING_UPLOAD: i18n.translate('filesManagement.filesFlyout.status.awaitingUpload', {
      defaultMessage: 'Awaiting upload',
    }),
    DELETED: i18n.translate('filesManagement.filesFlyout.status.deleted', {
      defaultMessage: 'Deleted',
    }),
    READY: i18n.translate('filesManagement.filesFlyout.status.ready', {
      defaultMessage: 'Ready to download',
    }),
    UPLOADING: i18n.translate('filesManagement.filesFlyout.status.uploading', {
      defaultMessage: 'Uploading',
    }),
    UPLOAD_ERROR: i18n.translate('filesManagement.filesFlyout.status.uploadError', {
      defaultMessage: 'Upload error',
    }),
  } as Record<FileStatus, string>,
};
