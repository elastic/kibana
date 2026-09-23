/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';
import { copyToClipboard } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getDiscoverLocatorParams } from '../../utils/get_discover_locator_params';
import {
  selectCurrentProfileLocatorState,
  useCurrentTabSelector,
  useInternalStateSelector,
  useRuntimeStateManager,
} from '../../state_management/redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

/**
 * Copies a flyout link using the absolute time range that produced the current results.
 */
export const useCopyExpandedDocLink = ({ dataView }: { dataView: DataView }) => {
  const services = useDiscoverServices();
  const runtimeStateManager = useRuntimeStateManager();
  const currentTab = useCurrentTabSelector((tab) => tab);
  const persistedDiscoverSession = useInternalStateSelector(
    (state) => state.persistedDiscoverSession
  );
  const isCopyingLinkRef = useRef(false);

  const copyLink = useCallback(async () => {
    const {
      locator,
      share,
      capabilities,
      filterManager,
      data,
      profileStateRegistry,
      toastNotifications,
    } = services;
    const { timefilter } = data.query.timefilter;

    const params = getDiscoverLocatorParams({
      currentTab,
      dataView,
      persistedDiscoverSession,
      filters: filterManager.getFilters(),
      timeRange: currentTab.dataRequestParams.timeRangeAbsolute ?? timefilter.getAbsoluteTime(),
      refreshInterval: timefilter.getRefreshInterval(),
      profileState: selectCurrentProfileLocatorState({
        runtimeStateManager,
        tabId: currentTab.id,
        profileStateMap: currentTab.profileState,
        profileStateRegistry,
      }),
    });

    try {
      let url: string;

      if (capabilities.discover_v2.createShortUrl && share) {
        const shortUrl = await share.url.shortUrls.get(null).createWithLocator({ locator, params });
        url = await shortUrl.locator.getUrl(shortUrl.params, { absolute: true });
      } else {
        const link = document.createElement('a');
        link.setAttribute('href', locator.getRedirectUrl(params));
        url = link.href;
      }

      copyToClipboard(url);
      toastNotifications.addSuccess({
        title: i18n.translate('discover.docViews.flyout.copyLinkSuccessTitle', {
          defaultMessage: 'Link copied to clipboard',
        }),
      });
    } catch (error) {
      toastNotifications.addDanger({
        title: i18n.translate('discover.docViews.flyout.copyLinkErrorTitle', {
          defaultMessage: 'Unable to copy link',
        }),
        text: error instanceof Error ? error.message : String(error),
      });
    }
  }, [currentTab, dataView, persistedDiscoverSession, runtimeStateManager, services]);

  const copyLinkOnce = useCallback(async () => {
    if (isCopyingLinkRef.current) {
      return;
    }

    isCopyingLinkRef.current = true;

    try {
      await copyLink();
    } finally {
      isCopyingLinkRef.current = false;
    }
  }, [copyLink]);

  return copyLinkOnce;
};
