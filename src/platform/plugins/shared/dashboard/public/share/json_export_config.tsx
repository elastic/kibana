/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBetaBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { downloadFileAs, type ExportShare } from '@kbn/share-plugin/public';
import type { ShareContext } from '@kbn/share-plugin/public/types';
import type { DashboardState } from '../../server';
import { getSanitizedExportSource } from './dashboard_export_source_client';
import { ExportSourceAssetPanel } from './export_source_asset_panel';
import { buildExportSourceFilename } from './export_source_share_utils';

export interface ExportSourceSharingData {
  title: string;
  exportSource: DashboardState;
}

export const getShareMenuItems =
  () =>
  ({
    sharingData,
  }: ShareContext): ReturnType<ExportShare['config']> extends Promise<infer R> ? R : never => {
    const typedSharingData = sharingData as unknown as ExportSourceSharingData;

    return {
      icon: 'code',
      label: i18n.translate('dashboard.exportSource.label', {
        defaultMessage: 'JSON',
      }),
      exportType: 'dashboard_export_source',
      flyoutHeaderContent: (
        <EuiBetaBadge
          label={i18n.translate('dashboard.exportSource.technicalPreviewBadgeLabel', {
            defaultMessage: 'TECHNICAL PREVIEW',
          })}
          tooltipContent={i18n.translate('dashboard.exportSource.technicalPreviewBadgeTooltip', {
            defaultMessage:
              'This functionality is experimental and not supported. It may change or be removed at any time.',
          })}
          size="s"
          data-test-subj="dashboardExportJsonTechnicalPreviewBadge"
        />
      ),
      generateExportButtonLabel: i18n.translate('dashboard.exportSource.downloadButtonLabel', {
        defaultMessage: 'Download JSON',
      }),
      generateAssetComponent: (
        <ExportSourceAssetPanel dashboardState={typedSharingData.exportSource} />
      ),
      generateAssetExport: async (_opts) => {
        const data = await getSanitizedExportSource(typedSharingData.exportSource)
          .then((result) => result.data)
          .catch(() => typedSharingData.exportSource);
        const filename = buildExportSourceFilename(typedSharingData.title, '.json');
        const content = JSON.stringify(data, null, 2);
        await downloadFileAs(filename, { content, type: 'application/json' });
      },
    };
  };
