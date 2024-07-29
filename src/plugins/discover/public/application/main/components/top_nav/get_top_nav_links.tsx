/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TopNavMenuData } from '@kbn/navigation-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { omit } from 'lodash';
import { copyToClipboard } from '@elastic/eui';
import { useState } from 'react';
import type { DiscoverAppLocatorParams } from '../../../../../common';
import { showOpenSearchPanel } from './show_open_search_panel';
import { getSharingData, showPublicUrlSwitch } from '../../../../utils/get_sharing_data';
import { DiscoverServices } from '../../../../build_services';
import { onSaveSearch } from './on_save_search';
import { DiscoverStateContainer } from '../../state_management/discover_state';
import { openAlertsPopover } from './open_alerts_popover';
import type { TopNavCustomization } from '../../../../customizations';

/**
 * Helper function to build the top nav links
 */
export const useTopNavLinks = ({
  dataView,
  services,
  state,
  onOpenInspector,
  isEsqlMode,
  adHocDataViews,
  topNavCustomization,
}: {
  dataView: DataView | undefined;
  services: DiscoverServices;
  state: DiscoverStateContainer;
  onOpenInspector: () => void;
  isEsqlMode: boolean;
  adHocDataViews: DataView[];
  topNavCustomization: TopNavCustomization | undefined;
}): TopNavMenuData[] => {
  const [linkCopied, setLinkCopied] = useState(false);
  const alerts = {
    id: 'alerts',
    label: i18n.translate('discover.localMenu.localMenu.alertsTitle', {
      defaultMessage: 'Alerts',
    }),
    description: i18n.translate('discover.localMenu.alertsDescription', {
      defaultMessage: 'Alerts',
    }),
    run: async (anchorElement: HTMLElement) => {
      openAlertsPopover({
        anchorElement,
        services,
        stateContainer: state,
        adHocDataViews,
        isEsqlMode,
      });
    },
    testId: 'discoverAlertsButton',
  };

  const newSearch = {
    id: 'new',
    label: i18n.translate('discover.localMenu.localMenu.newSearchTitle', {
      defaultMessage: 'New',
    }),
    description: i18n.translate('discover.localMenu.newSearchDescription', {
      defaultMessage: 'New Search',
    }),
    run: () => services.locator.navigate({}),
    testId: 'discoverNewButton',
  };

  const saveSearch = {
    id: 'save',
    label: i18n.translate('discover.localMenu.saveTitle', {
      defaultMessage: 'Save',
    }),
    description: i18n.translate('discover.localMenu.saveSearchDescription', {
      defaultMessage: 'Save Search',
    }),
    testId: 'discoverSaveButton',
    iconType: 'save',
    emphasize: true,
    run: (anchorElement: HTMLElement) => {
      onSaveSearch({
        savedSearch: state.savedSearchState.getState(),
        services,
        state,
        onClose: () => {
          anchorElement?.focus();
        },
      });
    },
  };
  const getShareLink = async () => {
    const savedSearch = state.savedSearchState.getState();
    const searchSourceSharingData = await getSharingData(
      savedSearch.searchSource,
      state.appState.getState(),
      services,
      isEsqlMode
    );

    const { locator } = services;
    const appState = state.appState.getState();
    const { timefilter } = services.data.query.timefilter;
    const timeRange = timefilter.getTime();
    const refreshInterval = timefilter.getRefreshInterval();
    const filters = services.filterManager.getFilters();

    // Share -> Get links -> Snapshot
    const params: DiscoverAppLocatorParams = {
      ...omit(appState, 'dataSource'),
      ...(savedSearch.id ? { savedSearchId: savedSearch.id } : {}),
      ...(dataView?.isPersisted()
        ? { dataViewId: dataView?.id }
        : { dataViewSpec: dataView?.toMinimalSpec() }),
      filters,
      timeRange,
      refreshInterval,
    };
    const relativeUrl = locator.getRedirectUrl(params);

    // This logic is duplicated from `relativeToAbsolute` (for bundle size reasons). Ultimately, this should be
    // replaced when https://github.com/elastic/kibana/issues/153323 is implemented.
    const link = document.createElement('a');
    link.setAttribute('href', relativeUrl);
    const shareableUrl = link.href;

    // Share -> Get links -> Saved object
    let shareableUrlForSavedObject = await locator.getUrl(
      { savedSearchId: savedSearch.id },
      { absolute: true }
    );
    // UrlPanelContent forces a '_g' parameter in the saved object URL:
    // https://github.com/elastic/kibana/blob/a30508153c1467b1968fb94faf1debc5407f61ea/src/plugins/share/public/components/url_panel_content.tsx#L230
    // Since our locator doesn't add the '_g' parameter if it's not needed, UrlPanelContent
    // will interpret it as undefined and add '?_g=' to the URL, which is invalid in Discover,
    // so instead we add an empty object for the '_g' parameter to the URL.
    shareableUrlForSavedObject = setStateToKbnUrl('_g', {}, undefined, shareableUrlForSavedObject);

    return {
      shareableUrl,
      shareableUrlForSavedObject,
      locator,
      savedSearch,
      searchSourceSharingData,
      params,
    };
  };

  const openSearch = {
    id: 'open',
    label: i18n.translate('discover.localMenu.openTitle', {
      defaultMessage: 'Open',
    }),
    description: i18n.translate('discover.localMenu.openSavedSearchDescription', {
      defaultMessage: 'Open Saved Search',
    }),
    testId: 'discoverOpenButton',
    run: () =>
      showOpenSearchPanel({
        onOpenSavedSearch: state.actions.onOpenSavedSearch,
        services,
      }),
  };

  const shareSearch = {
    id: 'share',
    label: i18n.translate('discover.localMenu.shareTitle', {
      defaultMessage: 'Share',
    }),
    description: i18n.translate('discover.localMenu.shareSearchDescription', {
      defaultMessage: 'Share Search',
    }),
    testId: 'shareTopNavButton',
    run: async (anchorElement: HTMLElement) => {
      if (!services.share) return;
      const {
        shareableUrl,
        shareableUrlForSavedObject,
        locator,
        params,
        savedSearch,
        searchSourceSharingData,
      } = await getShareLink();

      services.share.toggleShareContextMenu({
        anchorElement,
        allowEmbed: false,
        allowShortUrl: !!services.capabilities.discover.createShortUrl,
        shareableUrl,
        shareableUrlForSavedObject,
        shareableUrlLocatorParams: { locator, params },
        objectId: savedSearch.id,
        objectType: 'search',
        objectTypeMeta: {
          title: i18n.translate('discover.share.shareModal.title', {
            defaultMessage: 'Share this search',
          }),
        },
        sharingData: {
          isTextBased: isEsqlMode,
          locatorParams: [{ id: locator.id, params }],
          ...searchSourceSharingData,
          // CSV reports can be generated without a saved search so we provide a fallback title
          title:
            savedSearch.title ||
            i18n.translate('discover.localMenu.fallbackReportTitle', {
              defaultMessage: 'Untitled discover search',
            }),
        },
        isDirty: !savedSearch.id || state.appState.hasChanged(),
        showPublicUrlSwitch,
        onClose: () => {
          anchorElement?.focus();
        },
        toasts: services.notifications.toasts,
      });
    },
  };

  const shareSearchBtn = {
    id: 'shareBtn',
    label: i18n.translate('discover.localMenu.shareTitle', {
      defaultMessage: 'Copy link',
    }),
    description: linkCopied
      ? i18n.translate('discover.localMenu.shareSearchDescriptionCopied', {
          defaultMessage: 'Permalink copied to clipboard',
        })
      : i18n.translate('discover.localMenu.shareSearchDescription', {
          defaultMessage: 'Copy permalink to clipboard',
        }),
    tooltip: linkCopied
      ? i18n.translate('discover.localMenu.shareSearchDescriptionCopied', {
          defaultMessage: 'Permalink copied to clipboard',
        })
      : i18n.translate('discover.localMenu.shareSearchDescription', {
          defaultMessage: 'Copy permalink to clipboard',
        }),
    iconType: linkCopied ? 'check' : 'link',
    emphasize: true,
    hideLabel: true,
    testId: 'shareTopNavButtonSm',
    run: async () => {
      if (!services.share) return;
      const audioContext = new AudioContext();
      const gainNode = audioContext.createGain();
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = 30;
      oscillator.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.005);
      const channels = 1;
      const sampleRate = audioContext.sampleRate;
      const frameCount = sampleRate * 3;
      const arrayBuffer = audioContext.createBuffer(channels, frameCount, sampleRate);

      // getChannelData allows us to access and edit the buffer data and change.
      const bufferData = arrayBuffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) {
        // if the sample lies between 0 and 0.4 seconds, or 0.6 and 1 second, we want it to be on.
        if (
          (i / sampleRate > 0 && i / sampleRate < 0.4) ||
          (i / sampleRate > 0.6 && i / sampleRate < 1.0)
        ) {
          bufferData[i] = 0.25;
        }
      }

      const ringerLFOBuffer = arrayBuffer;
      const ringerLFOSource = audioContext.createBufferSource();
      ringerLFOSource.buffer = ringerLFOBuffer;
      ringerLFOSource.loop = true;
      // connect the ringerLFOSource to the gain Node audio param
      ringerLFOSource.connect(gainNode.gain);
      ringerLFOSource.start(0);

      getShareLink().then(async (res) => {
        let link = '';
        if (!services.share) return;
        if (services.capabilities.discover.createShortUrl) {
          const shortUrls = services.share.url.shortUrls.get(null);
          const shortUrl = await shortUrls.createWithLocator({
            locator: res.locator,
            params: { url: res.shareableUrl },
          });
          link = await shortUrl.locator.getUrl(shortUrl.params, { absolute: true });
          copyToClipboard(link);
        } else {
          copyToClipboard(res.shareableUrl);
        }
        setLinkCopied(true);
        // play a click sound generated with web audio api

        setTimeout(() => setLinkCopied(false), 2000);
      });
    },
  };

  const inspectSearch = {
    id: 'inspect',
    label: i18n.translate('discover.localMenu.inspectTitle', {
      defaultMessage: 'Inspect',
    }),
    description: i18n.translate('discover.localMenu.openInspectorForSearchDescription', {
      defaultMessage: 'Open Inspector for search',
    }),
    testId: 'openInspectorButton',
    run: () => {
      onOpenInspector();
    },
  };

  const defaultMenu = topNavCustomization?.defaultMenu;
  const entries = [...(topNavCustomization?.getMenuItems?.() ?? [])];

  if (!defaultMenu?.newItem?.disabled) {
    entries.push({ data: newSearch, order: defaultMenu?.newItem?.order ?? 100 });
  }

  if (!defaultMenu?.openItem?.disabled) {
    entries.push({ data: openSearch, order: defaultMenu?.openItem?.order ?? 200 });
  }

  if (!defaultMenu?.shareItem?.disabled) {
    entries.push({ data: shareSearch, order: defaultMenu?.shareItem?.order ?? 300 });
  }

  if (
    services.triggersActionsUi &&
    services.capabilities.management?.insightsAndAlerting?.triggersActions &&
    !defaultMenu?.alertsItem?.disabled
  ) {
    entries.push({ data: alerts, order: defaultMenu?.alertsItem?.order ?? 400 });
  }

  if (!defaultMenu?.inspectItem?.disabled) {
    entries.push({ data: inspectSearch, order: defaultMenu?.inspectItem?.order ?? 500 });
  }
  console.log('test1234');

  if (!defaultMenu?.shareItem?.disabled) {
    console.log('test1234');
    entries.push({ data: shareSearchBtn, order: defaultMenu?.shareItem?.order ?? 550 });
  }

  if (services.capabilities.discover.save && !defaultMenu?.saveItem?.disabled) {
    entries.push({ data: saveSearch, order: defaultMenu?.saveItem?.order ?? 600 });
  }

  return entries.sort((a, b) => a.order - b.order).map((entry) => entry.data);
};
