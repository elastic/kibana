/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AppMenuActionId,
  type DiscoverAppMenuItemType,
  type DiscoverAppMenuPopoverItem,
} from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import type { IntlShape } from '@kbn/i18n-react';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { ShareActionIntents, ShareIntegration } from '@kbn/share-plugin/public/types';
import type { DataTotalHitsMsg } from '../../../state_management/discover_data_state_container';
import type { DiscoverServices } from '../../../../../build_services';
import type {
  DiscoverInternalState,
  RuntimeStateManager,
  TabState,
} from '../../../state_management/redux';
import type { AppMenuDiscoverParams } from './types';
import { buildShareOptions } from './get_share';
import { getDiscoverSessionExportJson } from './get_discover_session_export_json';

interface GetExportAppMenuItemParams {
  discoverParams: AppMenuDiscoverParams;
  services: DiscoverServices;
  currentTab: TabState;
  runtimeStateManager: RuntimeStateManager;
  persistedDiscoverSession: DiscoverSession | undefined;
  totalHitsState: DataTotalHitsMsg;
  hasUnsavedChanges: boolean;
  getState: () => DiscoverInternalState;
  intl: IntlShape;
}

/**
 * Maps a share integration id to its Export menu presentation
 */
const getExportItemMeta = (integrationId: string) => {
  if (integrationId === 'exportJson') {
    return {
      label: i18n.translate('discover.localMenu.export.jsonConfigLabel', {
        defaultMessage: 'Export JSON config',
      }),
      testId: 'exportMenuItem-JSON',
      iconType: 'code',
      order: 3,
    };
  }

  if (integrationId === 'csvReports') {
    return {
      label: i18n.translate('discover.localMenu.export.csvLabel', {
        defaultMessage: 'Export tab in CSV',
      }),
      testId: 'exportMenuItem-CSV',
      iconType: 'table',
      order: 1,
    };
  }

  if (integrationId === 'scheduledReports') {
    return {
      label: i18n.translate('discover.localMenu.export.scheduleExportLabel', {
        defaultMessage: 'Schedule CSV export',
      }),
      testId: 'exportMenuItem-scheduledReports',
      iconType: 'calendar',
      order: 2,
    };
  }

  return {
    label: integrationId,
    testId: `exportMenuItem-${integrationId}`,
    iconType: undefined,
    order: 100,
  };
};

const isShareIntegration = (shareAction: ShareActionIntents): shareAction is ShareIntegration =>
  shareAction.shareType === 'integration';

/**
 * Builds the Export menu item from the share integrations registered for Discover,
 * extending the generic share options with the Discover session JSON producer.
 */
export const getExportAppMenuItem = ({
  discoverParams,
  services,
  currentTab,
  runtimeStateManager,
  persistedDiscoverSession,
  totalHitsState,
  hasUnsavedChanges,
  getState,
  intl,
}: GetExportAppMenuItemParams): DiscoverAppMenuItemType | undefined => {
  const { share } = services;

  if (!share) return undefined;

  const getExportJson = (exportAllTabs: boolean = true) => {
    const title =
      getState().persistedDiscoverSession?.title ||
      i18n.translate('discover.localMenu.fallbackReportTitle', {
        defaultMessage: 'Untitled Discover session',
      });

    const { sessionState, warnings } = getDiscoverSessionExportJson({
      getState,
      runtimeStateManager,
      services,
      tabId: exportAllTabs ? undefined : currentTab.id,
      title,
    });

    return {
      data: sessionState,
      warnings: warnings.map(({ message }) => message),
    };
  };

  const buildExportShareOptions = async () => {
    const shareOptions = await buildShareOptions({
      discoverParams,
      services,
      currentTab,
      runtimeStateManager,
      persistedDiscoverSession,
      totalHitsState,
      hasUnsavedChanges,
    });

    return {
      ...shareOptions,
      sharingData: {
        ...shareOptions.sharingData,
        getExportJson,
      },
    };
  };

  const exportIntegrations: ShareActionIntents[] = share.availableIntegrations('search', 'export');
  const exportItems: DiscoverAppMenuPopoverItem[] = exportIntegrations
    .filter(isShareIntegration)
    .map(({ id }) => ({
      ...getExportItemMeta(id),
      id,
      run: async () => {
        const shareOptions = await buildExportShareOptions();
        const exportHandler = await share.getExportHandler(shareOptions, id, intl);
        await exportHandler?.();
      },
    }));

  const exportDerivatives: ShareActionIntents[] = share.availableIntegrations(
    'search',
    'exportDerivatives'
  );
  const exportDerivativeItems: DiscoverAppMenuPopoverItem[] = exportDerivatives
    .filter(isShareIntegration)
    .map(({ id }) => ({
      ...getExportItemMeta(id),
      id,
      run: async () => {
        const shareOptions = await buildExportShareOptions();
        const exportDerivativeHandler = await share.getExportDerivativeHandler(shareOptions, id);
        await exportDerivativeHandler?.();
      },
    }));

  const items = [...exportItems, ...exportDerivativeItems];

  if (!items.length) return undefined;

  return {
    id: AppMenuActionId.export,
    order: 8,
    label: i18n.translate('discover.localMenu.exportTitle', {
      defaultMessage: 'Export',
    }),
    iconType: 'upload',
    testId: 'exportTopNavButton',
    items,
    popoverTestId: 'exportPopoverPanel',
  };
};
