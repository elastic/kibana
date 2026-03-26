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
import type { ShareActionIntents } from '@kbn/share-plugin/public/types';
import { shareService } from '../../../services/kibana_services';
import type { DashboardApi } from '../../../dashboard_api/types';
import {
  buildDashboardShareOptions,
  getExportObjectTypeMeta,
  buildExportSharingData,
  buildShareableUrlLocatorParams,
  mapExportIntegrationToMetaData,
} from './share_options_utils';

interface Props {
  dashboardApi: DashboardApi;
  objectId?: string;
  isDirty: boolean;
  dashboardTitle?: string;
}

export const useDashboardExportItems = ({
  objectId,
  isDirty,
  dashboardTitle,
}: Props): AppMenuPopoverItem[] => {
  const intl = useI18n();

  return useMemo(() => {
    if (!shareService) return [];

    const { locatorParams, shareableUrl, allowShortUrl, title } = buildDashboardShareOptions({
      objectId,
      dashboardTitle,
    });

    const baseOptions = {
      objectType: 'dashboard' as const,
      objectId,
      isDirty,
      allowShortUrl,
      shareableUrl,
      objectTypeMeta: getExportObjectTypeMeta(),
      sharingData: buildExportSharingData(title, locatorParams),
      shareableUrlLocatorParams: buildShareableUrlLocatorParams(locatorParams),
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
          ...mapExportIntegrationToMetaData(item.id),
          id: item.id,
          run: async () => {
            const handler = await shareService?.getExportHandler(baseOptions, item.id, intl);
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
        ...mapExportIntegrationToMetaData(item.id),
        id: item.id,
        run: async () => {
          const handler = await shareService?.getExportDerivativeHandler(baseOptions, item.id);
          await handler?.();
        },
      }));

    return [...exportItems, ...derivativeItems];
  }, [intl, objectId, isDirty, dashboardTitle]);
};
