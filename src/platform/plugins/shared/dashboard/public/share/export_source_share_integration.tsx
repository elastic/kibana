/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  createAsCodeExportShareIntegration,
  type AsCodeExportFormat,
  type ExportShare,
  type RegisterShareIntegrationArgs,
} from '@kbn/share-plugin/public';
import type { JsonValue } from '@kbn/utility-types';

export interface ExportSourceSharingData {
  title: string;
  exportSource: JsonValue;
}

const jsonFormat: AsCodeExportFormat = {
  label: 'JSON',
  fileExtension: '.json',
  mimeType: 'application/json',
  codeLanguage: 'json',
};

export const exportSourceDashboardShareIntegration =
  (): RegisterShareIntegrationArgs<ExportShare> => {
    return createAsCodeExportShareIntegration<ExportSourceSharingData>({
      id: 'exportSourceDashboard',
      exportType: 'dashboard_export_source',
      icon: 'code',
      label: i18n.translate('dashboard.exportSource.label', {
        defaultMessage: 'JSON',
      }),
      format: jsonFormat,
      getFilenameBase: ({ title }) => title,
      getContent: ({ exportSource }) => JSON.stringify(exportSource, null, 2),
      copyAsset: {
        headingText: i18n.translate('dashboard.exportSource.panelTitle', {
          defaultMessage: 'Dashboard export source',
        }),
        helpText: i18n.translate('dashboard.exportSource.panelDescription', {
          defaultMessage: 'Use this JSON as the source for automated exports.',
        }),
      },
      download: {
        buttonLabel: i18n.translate('dashboard.exportSource.downloadButtonLabel', {
          defaultMessage: 'Download JSON',
        }),
      },
    });
  };
