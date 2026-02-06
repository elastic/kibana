/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCallOut, EuiCodeBlock, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { downloadFileAs } from '../../../../share/public';
import type { ExportShare, RegisterShareIntegrationArgs } from '../../../../share/public/types';
import type { DashboardReadResponseBody } from '../../../server';
import type { DashboardApi } from '../../dashboard_api/types';
import { dashboardClient } from '../../dashboard_client';

const EMPTY_DASHBOARD_ID = '';

export interface DashboardExportSharingData {
  title: string;
  dashboardApi: DashboardApi;
}

export const dashboardExportProvider = (): RegisterShareIntegrationArgs<ExportShare> => ({
  id: 'dashboardJsonExport',
  groupId: 'export',
  getShareIntegrationConfig: async ({ sharingData }) => {
    const { title, dashboardApi } = sharingData as DashboardExportSharingData;
    const exportLabel = i18n.translate('dashboard.shareIntegration.exportDashboardJsonTitle', {
      defaultMessage: 'JSON',
    });

    const getDashboardContent = async (): Promise<DashboardReadResponseBody> => {
      const content = dashboardApi.getSerializedState();
      const dashboardId = dashboardApi.savedObjectId$.getValue();
      const mergedData = dashboardId
        ? {
            ...(await dashboardClient.get(dashboardId)).data,
            ...content.attributes,
          }
        : content.attributes;

      return {
        id: dashboardId ?? EMPTY_DASHBOARD_ID,
        data: mergedData,
        meta: {
          outcome: 'exactMatch',
        },
      };
    };

    const getDashboardContentJson = async () => {
      const dashboardContent = await getDashboardContent();
      return `${JSON.stringify(dashboardContent, null, 2)}\n`;
    };

    const DashboardJsonCodeBlock = () => {
      const [savedObjectId, viewMode, hasUnsavedChanges] = useBatchedPublishingSubjects(
        dashboardApi.savedObjectId$,
        dashboardApi.viewMode$,
        dashboardApi.hasUnsavedChanges$
      );
      const [contentState, setContentState] = React.useState<{
        loading: boolean;
        content: string | null;
        error: Error | null;
      }>({
        loading: true,
        content: null,
        error: null,
      });

      React.useEffect(() => {
        let isMounted = true;
        setContentState({ loading: true, content: null, error: null });
        getDashboardContentJson()
          .then((value) => {
            if (isMounted) {
              setContentState({ loading: false, content: value, error: null });
            }
          })
          .catch((error) => {
            if (isMounted) {
              setContentState({
                loading: false,
                content: null,
                error: error instanceof Error ? error : new Error(String(error)),
              });
            }
          });

        return () => {
          isMounted = false;
        };
      }, [hasUnsavedChanges, savedObjectId, viewMode]);

      if (contentState.loading) {
        return (
          <EuiEmptyPrompt
            data-test-subj="dashboardJsonExportLoading"
            icon={<EuiLoadingSpinner size="l" />}
          />
        );
      }

      if (contentState.error) {
        return (
          <EuiCallOut
            title={i18n.translate('dashboard.shareIntegration.exportDashboardJsonErrorTitle', {
              defaultMessage: 'Unable to load dashboard JSON',
            })}
            color="danger"
            iconType="alert"
          >
            {contentState.error.message}
          </EuiCallOut>
        );
      }

      if (!contentState.content) {
        return null;
      }

      return (
        <EuiCodeBlock language="json" isCopyable overflowHeight="100%" isVirtualized>
          {contentState.content}
        </EuiCodeBlock>
      );
    };

    return {
      label: exportLabel,
      icon: 'document',
      exportType: 'dashboardJson',
      requiresSavedState: false,
      generateAssetComponent: <DashboardJsonCodeBlock />,
      generateAssetExport: async () => {
        const dashboardContent = await getDashboardContentJson();
        await downloadFileAs(`${title}.json`, {
          content: dashboardContent,
          type: 'application/json',
        });
      },
    };
  },
});
