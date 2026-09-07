/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
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
import { buildDiscoverSessionExportRequest } from '../export_discover_session/build_discover_session_export_request';
import { ExportDiscoverSessionJsonFlyout } from '../export_discover_session/json_flyout';
import { sanitizeDiscoverSession } from '../export_discover_session/sanitize_discover_session';

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
 * Maps a Share integration id to its Export menu item props.
 */
const getShareExportMenuItemProps = (integrationId: string) => {
  if (integrationId === 'csvReports') {
    return {
      label: i18n.translate('discover.localMenu.export.csvLabel', {
        defaultMessage: 'Tab results as CSV',
      }),
      testId: 'exportMenuItem-CSV',
      iconType: 'table',
      order: 1,
    };
  }

  if (integrationId === 'scheduledReports') {
    return {
      label: i18n.translate('discover.localMenu.export.scheduleExportLabel', {
        defaultMessage: 'Schedule export',
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
 * Builds the Export menu item from the local JSON export and registered Share integrations.
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

  // Share supplies the reporting actions and Console locator used by the Export menu.
  if (!share) return undefined;

  const getDiscoverSessionTitle = () =>
    getState().persistedDiscoverSession?.title ||
    i18n.translate('discover.localMenu.fallbackReportTitle', {
      defaultMessage: 'Untitled Discover session',
    });

  const getExportJson = (exportCurrentTab: boolean, includeCurrentTimeSettings: boolean) => {
    const title = getDiscoverSessionTitle();

    return buildDiscoverSessionExportRequest({
      getState,
      runtimeStateManager,
      services,
      includeCurrentTimeSettings: persistedDiscoverSession ? undefined : includeCurrentTimeSettings,
      tabId: exportCurrentTab ? currentTab.id : undefined,
      title,
    });
  };

  const shareOptionsParams = {
    discoverParams,
    services,
    currentTab,
    runtimeStateManager,
    persistedDiscoverSession,
    totalHitsState,
    hasUnsavedChanges,
  };

  const exportJsonItem: DiscoverAppMenuPopoverItem = {
    id: 'exportJson',
    label: i18n.translate('discover.localMenu.export.jsonConfigLabel', {
      defaultMessage: 'Export JSON',
    }),
    testId: 'exportMenuItem-JSON',
    iconType: 'code',
    order: 3,
    render: ({ context: { onFinishAction } }) => (
      <ExportDiscoverSessionJsonFlyout
        canShowDevTools={Boolean(services.capabilities.dev_tools?.show)}
        closeFlyout={onFinishAction}
        getExportJson={getExportJson}
        sanitizeExportJson={(state) => sanitizeDiscoverSession(services.http, state)}
        showIncludeCurrentTimeSettings={!persistedDiscoverSession}
        title={getDiscoverSessionTitle()}
        useConsoleUrl={share.url.locators.useUrl}
      />
    ),
  };

  const exportItems: DiscoverAppMenuPopoverItem[] = share
    .availableIntegrations('search', 'export')
    .filter(isShareIntegration)
    .map(({ id: integrationId }: ShareIntegration) => ({
      ...getShareExportMenuItemProps(integrationId),
      id: integrationId,
      run: async () => {
        const shareOptions = await buildShareOptions(shareOptionsParams);
        const exportHandler = await share.getExportHandler(shareOptions, integrationId, intl);
        await exportHandler?.();
      },
    }));

  const exportDerivativeItems: DiscoverAppMenuPopoverItem[] = share
    .availableIntegrations('search', 'exportDerivatives')
    .filter(isShareIntegration)
    .map(({ id: integrationId }: ShareIntegration) => ({
      ...getShareExportMenuItemProps(integrationId),
      id: integrationId,
      run: async () => {
        const shareOptions = await buildShareOptions(shareOptionsParams);
        const exportDerivativeHandler = await share.getExportDerivativeHandler(
          shareOptions,
          integrationId
        );
        await exportDerivativeHandler?.();
      },
    }));

  const items = [...exportItems, ...exportDerivativeItems, exportJsonItem];

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
