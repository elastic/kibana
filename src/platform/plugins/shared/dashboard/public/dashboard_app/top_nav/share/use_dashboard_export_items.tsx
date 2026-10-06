/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useI18n } from '@kbn/i18n-react';
import type { AppMenuPopoverItem } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import type { ShareActionIntents } from '@kbn/share-plugin/public/types';
import { useDashboardApi } from '../../../dashboard_api/use_dashboard_api';
import { topNavStrings } from '../../_dashboard_app_strings';
import type { useShareOptions } from './use_share_options';
import { shareService } from '../../../services/kibana_services';

export const useDashboardExportItems = (
  shareOptions: ReturnType<typeof useShareOptions>
): AppMenuPopoverItem[] => {
  const intl = useI18n();
  const dashboardApi = useDashboardApi();

  return useMemo(() => {
    if (!shareService) return [];

    const exportShareOptions = {
      ...shareOptions,
      objectTypeMeta: {
        title: i18n.translate('dashboard.share.shareModal.title', {
          defaultMessage: 'Share dashboard',
        }),
        config: {
          integration: {
            export: {
              exportJson: {},
              pdfReports: { draftModeCallOut: true },
              imageReports: { draftModeCallOut: true },
            },
          },
        },
      },
      sharingData: {
        ...shareOptions.sharingData,
        getExportJson: () => {
          const dashboardState = dashboardApi.getSerializedState().attributes;
          return dashboardState.title.length
            ? dashboardState
            : { ...dashboardState, title: shareOptions.sharingData.title };
        },
      },
    };

    const exportIntegrations: ShareActionIntents[] = shareService.availableIntegrations(
      'dashboard',
      'export'
    );
    const exportDerivatives: ShareActionIntents[] = shareService.availableIntegrations(
      'dashboard',
      'exportDerivatives'
    );

    const exportItems = exportIntegrations
      .filter((item) => item.shareType === 'integration')
      .map((item) => {
        return {
          ...getExportItemMeta(item.id),
          id: item.id,
          run: async () => {
            const handler = await shareService?.getExportHandler(exportShareOptions, item.id, intl);
            await handler?.();
          },
        };
      });

    const derivativeItems = exportDerivatives
      .filter(
        (item): item is typeof item & { shareType: 'integration'; id: string } =>
          item.shareType === 'integration' && item.groupId === 'exportDerivatives'
      )
      .map((item) => ({
        ...getExportItemMeta(item.id),
        id: item.id,
        run: async () => {
          const handler = await shareService?.getExportDerivativeHandler(
            exportShareOptions,
            item.id
          );
          await handler?.();
        },
      }));

    return [...exportItems, ...derivativeItems];
  }, [dashboardApi, intl, shareOptions]);
};

export const getExportItemMeta = (integrationId: string) => {
  if (integrationId === 'exportJson') {
    return {
      label: topNavStrings.export.jsonLabel,
      testId: 'exportMenuItem-JSON',
      iconType: 'code',
      order: 0,
    };
  }

  if (integrationId === 'pdfReports') {
    return {
      label: topNavStrings.export.pdfLabel,
      testId: 'exportMenuItem-PDF',
      iconType: 'document',
      order: 1,
    };
  }

  if (integrationId === 'imageReports') {
    return {
      label: topNavStrings.export.pngLabel,
      testId: 'exportMenuItem-PNG',
      iconType: 'image',
      order: 2,
    };
  }

  if (integrationId === 'scheduledReports') {
    return {
      label: topNavStrings.export.scheduleExportLabel,
      testId: 'scheduleExport',
      iconType: 'calendar',
      order: 3,
      separator: 'above' as const,
    };
  }

  return {
    label: integrationId,
    iconType: undefined,
    testId: `exportMenuItem-${integrationId}`,
    order: 100,
  };
};
