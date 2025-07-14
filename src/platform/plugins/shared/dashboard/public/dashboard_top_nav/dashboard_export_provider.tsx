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
import type { ExportShare, SharePluginSetup } from '@kbn/share-plugin/public';
import { ContentSourceLoader } from '@kbn/content-management-content-source';
import type { DashboardApi } from '../dashboard_api/types';
import { coreServices, untilPluginStartServicesReady } from '../services/kibana_services';
import { DASHBOARD_APP_ID } from '../../common/constants';

export interface DashboardSharingData {
  getSerializedState: DashboardApi['getSerializedState'];
}

export const registerDashboardExportIntegration = async (shareSetup: SharePluginSetup) => {
  await untilPluginStartServicesReady();
  // Only register the export integration if the feature flag is enabled
  const dashboardJsonEnabled = coreServices.featureFlags.getBooleanValue(
    'dashboardPlugin.dashboardJsonExport',
    false
  );
  if (dashboardJsonEnabled) {
    shareSetup.registerShareIntegration<ExportShare>(DASHBOARD_APP_ID, dashboardExportProvider());
  }
};

const dashboardExportProvider = (): ExportShare => {
  return {
    id: 'dashboardJsonExport',
    shareType: 'integration',
    groupId: 'export',
    config: ({ sharingData }) => {
      const { getSerializedState } = sharingData as unknown as DashboardSharingData;
      return {
        name: i18n.translate('dashboard.shareIntegration.exportDashboardJsonTitle', {
          defaultMessage: 'JSON',
        }),
        icon: 'document',
        label: 'JSON',
        exportType: 'dashboardJson',
        renderCopyURIButton: true,
        generateAssetExport: async () => {
          // @ts-expect-error - untyped library
          const { saveAs } = await import('@elastic/filesaver');
          const json = getSerializedState();
          saveAs(
            new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }),
            'dashboard.json'
          );
        },
        generateAssetComponent: (
          <ContentSourceLoader getContent={async () => getSerializedState()} />
        ),
      };
    },
  };
};
