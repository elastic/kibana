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
import type { ExportShare, RegisterShareIntegrationArgs } from '@kbn/share-plugin/public/types';
import { ExportSourcePanel } from '@kbn/as-code-export-source';
import type { JsonValue } from '@kbn/utility-types';

export interface ExportSourceSharingData {
  title: string;
  exportSource: JsonValue;
}

export const exportSourceDashboardShareIntegration =
  (): RegisterShareIntegrationArgs<ExportShare> => {
    return {
      id: 'exportSourceDashboard',
      groupId: 'export',
      getShareIntegrationConfig: async ({ sharingData }) => {
        const { exportSource } = sharingData as unknown as ExportSourceSharingData;

        return {
          id: 'exportSourceDashboard',
          name: 'exportSourceDashboard',
          icon: 'code',
          label: i18n.translate('dashboard.exportSource.label', {
            defaultMessage: 'Export source',
          }),
          exportType: 'dashboard_export_source',
          generateAssetExport: () => Promise.resolve(),
          generateAssetComponent: (
            <ExportSourcePanel
              title={i18n.translate('dashboard.exportSource.panelTitle', {
                defaultMessage: 'Dashboard export source',
              })}
              description={i18n.translate('dashboard.exportSource.panelDescription', {
                defaultMessage: 'Use this JSON as the source for automated exports.',
              })}
              source={exportSource}
              dataTestSubj="dashboardExportSourcePanel"
            />
          ),
        };
      },
    };
  };
