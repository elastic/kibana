/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  downloadFileAs,
  type ExportShare,
  type RegisterShareIntegrationArgs,
} from '@kbn/share-plugin/public';
import type { DashboardState } from '../../server';
import { getSanitizedExportSource } from './dashboard_export_source_client';
import { ExportSourceAssetPanel } from './export_source_asset_panel';

export interface ExportSourceSharingData {
  title: string;
  exportSource: DashboardState;
}

const jsonMimeType = 'application/json';
const jsonFileExtension = '.json';
const DEFAULT_FILENAME_BASE = 'export';

function normalizeExtension(ext: string): string {
  const trimmed = ext.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

function sanitizeFilenameBase(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_FILENAME_BASE;

  const withoutControlChars = trimmed.replace(/[\u0000-\u001F\u007F]/g, '');
  const withoutInvalidChars = withoutControlChars.replace(/[\\/:*?"<>|]/g, '_');
  const collapsedWhitespace = withoutInvalidChars.replace(/\s+/g, ' ').trim();
  return (collapsedWhitespace || DEFAULT_FILENAME_BASE).slice(0, 180);
}

function getFileName(filenameBase: string) {
  return `${sanitizeFilenameBase(filenameBase)}${normalizeExtension(jsonFileExtension)}`;
}

export const exportSourceDashboardShareIntegration =
  (): RegisterShareIntegrationArgs<ExportShare> => {
    return {
      id: 'exportSourceDashboard',
      groupId: 'export',
      getShareIntegrationConfig: async ({ sharingData }) => {
        const typedSharingData = sharingData as unknown as ExportSourceSharingData;

        return {
          id: 'exportSourceDashboard',
          name: 'exportSourceDashboard',
          icon: 'code',
          label: i18n.translate('dashboard.exportSource.label', {
            defaultMessage: 'JSON',
          }),
          exportType: 'dashboard_export_source',
          generateExportButtonLabel: i18n.translate('dashboard.exportSource.downloadButtonLabel', {
            defaultMessage: 'Download JSON',
          }),
          generateAssetComponent: (
            <ExportSourceAssetPanel
              dashboardState={typedSharingData.exportSource}
            />
          ),
          generateAssetExport: async (_opts) => {
            const data = await getSanitizedExportSource(typedSharingData.exportSource)
              .then((result) => result.data)
              .catch(() => typedSharingData.exportSource);
            const filename = getFileName(typedSharingData.title);
            const content = JSON.stringify(data, null, 2);
            await downloadFileAs(filename, { content, type: jsonMimeType });
          },
        };
      },
    };
  };
