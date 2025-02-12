/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMenuActionPrimary, AppMenuActionId, AppMenuActionType } from '@kbn/discover-utils';
import { omit } from 'lodash';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { i18n } from '@kbn/i18n';
import { DiscoverStateContainer } from '../../../state_management/discover_state';
import { getSharingData, showPublicUrlSwitch } from '../../../../../utils/get_sharing_data';
import { DiscoverAppLocatorParams } from '../../../../../../common/app_locator';
import { AppMenuDiscoverParams } from './types';
import { DiscoverServices } from '../../../../../build_services';

export const getShareAppMenuItem = ({
  discoverParams,
  services,
  stateContainer,
}: {
  discoverParams: AppMenuDiscoverParams;
  services: DiscoverServices;
  stateContainer: DiscoverStateContainer;
}): AppMenuActionPrimary => {
  return {
    id: AppMenuActionId.share,
    type: AppMenuActionType.primary,
    controlProps: {
      label: i18n.translate('discover.localMenu.shareTitle', {
        defaultMessage: 'Share',
      }),
      description: i18n.translate('discover.localMenu.shareSearchDescription', {
        defaultMessage: 'Share Discover session',
      }),
      iconType: 'share',
      testId: 'shareTopNavButton',
      onClick: async ({ anchorElement }) => {
        const { dataView, isEsqlMode } = discoverParams;

        if (!services.share) {
          return;
        }

        const savedSearch = stateContainer.savedSearchState.getState();
        const searchSourceSharingData = await getSharingData(
          savedSearch.searchSource,
          stateContainer.appState.getState(),
          services,
          isEsqlMode
        );

        const { locator, notifications } = services;
        const appState = stateContainer.appState.getState();
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
        shareableUrlForSavedObject = setStateToKbnUrl(
          '_g',
          {},
          undefined,
          shareableUrlForSavedObject
        );

        services.share.toggleShareContextMenu({
          anchorElement,
          allowEmbed: false,
          allowShortUrl: !!services.capabilities.discover_v2.createShortUrl,
          shareableUrl,
          shareableUrlForSavedObject,
          shareableUrlLocatorParams: { locator, params },
          objectId: savedSearch.id,
          objectType: 'search',
          objectTypeMeta: {
            title: i18n.translate('discover.share.shareModal.title', {
              defaultMessage: 'Share this Discover session',
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
                defaultMessage: 'Untitled Discover session',
              }),
          },
          isDirty: !savedSearch.id || stateContainer.appState.hasChanged(),
          showPublicUrlSwitch,
          onClose: () => {
            anchorElement?.focus();
          },
          toasts: notifications.toasts,
        });
      },
    },
  };
};
