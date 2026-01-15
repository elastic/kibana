/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMenuActionId } from '@kbn/discover-utils';
import { omit } from 'lodash';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { AppMenuItemType, AppMenuPopoverItem } from '@kbn/core-chrome-app-menu-components';
import type { ShowShareMenuOptions } from '@kbn/share-plugin/public';
import type { IntlShape } from '@kbn/i18n-react';
import type { DiscoverStateContainer } from '../../../state_management/discover_state';
import type { DataTotalHitsMsg } from '../../../state_management/discover_data_state_container';
import { getSharingData, showPublicUrlSwitch } from '../../../../../utils/get_sharing_data';
import type { DiscoverAppLocatorParams } from '../../../../../../common/app_locator';
import type { AppMenuDiscoverParams } from './types';
import type { DiscoverServices } from '../../../../../build_services';
import type { TabState } from '../../../state_management/redux/types';

/**
 * Builds share options for both share modal and export integrations
 */
const buildShareOptions = async ({
  discoverParams,
  services,
  stateContainer,
  currentTab,
  persistedDiscoverSession,
  totalHitsState,
  hasUnsavedChanges,
}: {
  discoverParams: AppMenuDiscoverParams;
  services: DiscoverServices;
  stateContainer: DiscoverStateContainer;
  currentTab: TabState;
  persistedDiscoverSession: DiscoverSession | undefined;
  totalHitsState: DataTotalHitsMsg;
  hasUnsavedChanges: boolean;
}): Promise<Omit<ShowShareMenuOptions, 'anchorElement' | 'asExport'>> => {
  const { dataView, isEsqlMode } = discoverParams;

  const searchSourceSharingData = await getSharingData(
    stateContainer.savedSearchState.getState().searchSource,
    currentTab.appState,
    services,
    isEsqlMode
  );

  const { locator, discoverFeatureFlags } = services;
  const { timefilter } = services.data.query.timefilter;
  const timeRange = timefilter.getTime();
  const refreshInterval = timefilter.getRefreshInterval();
  const filters = services.filterManager.getFilters();

  // Share -> Get links -> Snapshot
  const params: DiscoverAppLocatorParams & { timeRange: TimeRange | undefined } = {
    ...omit(currentTab.appState, 'dataSource'),
    ...(persistedDiscoverSession?.id ? { savedSearchId: persistedDiscoverSession.id } : {}),
    ...(dataView?.isPersisted()
      ? { dataViewId: dataView?.id }
      : { dataViewSpec: dataView?.toMinimalSpec() }),
    filters,
    timeRange: timeRange ?? undefined,
    refreshInterval,
  };

  const tabsEnabled = discoverFeatureFlags.getTabsEnabled();

  if (tabsEnabled && currentTab) {
    params.tab = {
      id: currentTab.id,
      label: currentTab.label,
    };
  }

  const relativeUrl = locator.getRedirectUrl(params);

  // This logic is duplicated from `relativeToAbsolute` (for bundle size reasons). Ultimately, this should be
  // replaced when https://github.com/elastic/kibana/issues/153323 is implemented.
  const link = document.createElement('a');
  link.setAttribute('href', relativeUrl);
  const shareableUrl = link.href;

  // Share -> Get links -> Saved object
  let shareableUrlForSavedObject = await locator.getUrl(
    { savedSearchId: persistedDiscoverSession?.id },
    { absolute: true }
  );

  // UrlPanelContent forces a '_g' parameter in the saved object URL:
  // https://github.com/elastic/kibana/blob/a30508153c1467b1968fb94faf1debc5407f61ea/src/plugins/share/public/components/url_panel_content.tsx#L230
  // Since our locator doesn't add the '_g' parameter if it's not needed, UrlPanelContent
  // will interpret it as undefined and add '?_g=' to the URL, which is invalid in Discover,
  // so instead we add an empty object for the '_g' parameter to the URL.
  shareableUrlForSavedObject = setStateToKbnUrl('_g', {}, undefined, shareableUrlForSavedObject);

  return {
    allowShortUrl: !!services.capabilities.discover_v2.createShortUrl,
    shareableUrl,
    shareableUrlForSavedObject,
    shareableUrlLocatorParams: { locator, params },
    objectId: persistedDiscoverSession?.id,
    objectType: 'search',
    objectTypeAlias: i18n.translate('discover.share.objectTypeAlias', {
      defaultMessage: 'Discover session',
    }),
    objectTypeMeta: {
      title: i18n.translate('discover.share.shareModal.title', {
        defaultMessage: 'Share this Discover session',
      }),
      config: {
        embed: {
          disabled: true,
          showPublicUrlSwitch,
        },
        integration: {
          export: {
            csvReports: {
              draftModeCallOut: true,
            },
          },
        },
        link: {
          draftModeCallOut: tabsEnabled,
        },
      },
    },
    sharingData: {
      isTextBased: isEsqlMode,
      locatorParams: [{ id: locator.id, params }],
      ...searchSourceSharingData,
      // CSV reports can be generated without a saved search so we provide a fallback title
      title:
        persistedDiscoverSession?.title ||
        i18n.translate('discover.localMenu.fallbackReportTitle', {
          defaultMessage: 'Untitled Discover session',
        }),
      totalHits: totalHitsState.result || 0,
    },
    isDirty: !persistedDiscoverSession?.id || hasUnsavedChanges,
  };
};

/**
 * Generates export menu items from available share integrations
 */
const getExportItems = (
  buildShareOptionsParams: {
    discoverParams: AppMenuDiscoverParams;
    services: DiscoverServices;
    stateContainer: DiscoverStateContainer;
    currentTab: TabState;
    persistedDiscoverSession: DiscoverSession | undefined;
    totalHitsState: DataTotalHitsMsg;
    hasUnsavedChanges: boolean;
  },
  intl: IntlShape
): AppMenuPopoverItem[] => {
  const { services } = buildShareOptionsParams;

  if (!services.share) return [];

  const exportIntegrations = services.share.availableIntegrations('search', 'export');
  const exportDerivatives = services.share.availableIntegrations('search', 'exportDerivatives');

  const mapIntegrationToMetaData = (integrationId: string) => {
    switch (integrationId) {
      case 'csvReports':
        return {
          label: i18n.translate('discover.localMenu.export.csvLabel', {
            defaultMessage: 'CSV',
          }),
          testId: 'exportMenuItem-CSV',
          iconType: 'tableDensityNormal' as const,
          order: 1,
        };
      case 'scheduledReports':
        return {
          label: i18n.translate('discover.localMenu.export.scheduleExportLabel', {
            defaultMessage: 'Schedule export',
          }),
          testId: 'exportMenuItem-scheduledReports',
          iconType: 'calendar' as const,
          order: 2,
        };
      default:
        return {
          label: integrationId,
          testId: `exportMenuItem-${integrationId}`,
          order: Number.MAX_SAFE_INTEGER,
        };
    }
  };

  const exportItems: AppMenuPopoverItem[] = exportIntegrations
    .filter((item) => item.shareType === 'integration')
    .map((item) => ({
      ...mapIntegrationToMetaData(item.id),
      id: item.id,
      run: async () => {
        const shareOptions = await buildShareOptions(buildShareOptionsParams);
        const handler = await services.share?.getExportHandler(shareOptions, item.id, intl);
        await handler?.();
      },
    }));

  const derivativeItems: AppMenuPopoverItem[] = exportDerivatives
    .filter(
      (item): item is typeof item & { shareType: 'integration'; id: string } =>
        item.shareType === 'integration' && item.groupId === 'exportDerivatives'
    )
    .map((item) => ({
      ...mapIntegrationToMetaData(item.id),
      id: item.id,
      run: async () => {
        const shareOptions = await buildShareOptions(buildShareOptionsParams);
        const handler = await services.share?.getExportDerivativeHandler(shareOptions, item.id);
        await handler?.();
      },
    }));

  return [...exportItems, ...derivativeItems];
};

export const getShareAppMenuItem = ({
  discoverParams,
  services,
  stateContainer,
  hasIntegrations,
  hasUnsavedChanges,
  currentTab,
  persistedDiscoverSession,
  totalHitsState,
  intl,
}: {
  discoverParams: AppMenuDiscoverParams;
  services: DiscoverServices;
  stateContainer: DiscoverStateContainer;
  hasIntegrations: boolean;
  hasUnsavedChanges: boolean;
  currentTab: TabState;
  persistedDiscoverSession: DiscoverSession | undefined;
  totalHitsState: DataTotalHitsMsg;
  intl: IntlShape;
}): AppMenuItemType[] => {
  if (!services.share) {
    return [];
  }

  const shareExecutor = async () => {
    const shareOptions = await buildShareOptions({
      discoverParams,
      services,
      stateContainer,
      currentTab,
      persistedDiscoverSession,
      totalHitsState,
      hasUnsavedChanges,
    });
    services.share?.toggleShareContextMenu(shareOptions);
  };

  const menuItems: AppMenuItemType[] = [
    {
      id: AppMenuActionId.share,
      order: 3,
      label: i18n.translate('discover.localMenu.shareTitle', {
        defaultMessage: 'Share',
      }),
      iconType: 'share',
      testId: 'shareTopNavButton',
      run: () => {
        shareExecutor();
      },
    },
  ];

  if (hasIntegrations) {
    const exportItems = getExportItems(
      {
        discoverParams,
        services,
        stateContainer,
        currentTab,
        persistedDiscoverSession,
        totalHitsState,
        hasUnsavedChanges,
      },
      intl
    );

    menuItems.unshift({
      id: AppMenuActionId.export,
      order: 8,
      label: i18n.translate('discover.localMenu.exportTitle', {
        defaultMessage: 'Export',
      }),
      iconType: 'exportAction',
      testId: 'exportTopNavButton',
      items: exportItems,
    });
  }

  return menuItems;
};
