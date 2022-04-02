/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ISearchSource } from 'src/plugins/data/public';
import type { DataView } from 'src/plugins/data_views/public';
import { showOpenSearchPanel } from './show_open_search_panel';
import { getSharingData, showPublicUrlSwitch } from '../../../../utils/get_sharing_data';
import { unhashUrl } from '../../../../../../kibana_utils/public';
import { DiscoverServices } from '../../../../build_services';
import { SavedSearch } from '../../../../services/saved_searches';
import { onSaveSearch } from './on_save_search';
import { GetStateReturn } from '../../services/discover_state';
import { openOptionsPopover } from './open_options_popover';
import type { TopNavMenuData } from '../../../../../../navigation/public';
import { openAlertsPopover } from './open_alerts_popover';

/**
 * Helper function to build the top nav links
 */
export const getTopNavLinks = ({
  indexPattern,
  navigateTo,
  savedSearch,
  services,
  state,
  onOpenInspector,
  searchSource,
  onOpenSavedSearch,
}: {
  indexPattern: DataView;
  navigateTo: (url: string) => void;
  savedSearch: SavedSearch;
  services: DiscoverServices;
  state: GetStateReturn;
  onOpenInspector: () => void;
  searchSource: ISearchSource;
  onOpenSavedSearch: (id: string) => void;
}): TopNavMenuData[] => {
  const options = {
    id: 'options',
    label: i18n.translate('discover.localMenu.localMenu.optionsTitle', {
      defaultMessage: 'Options',
    }),
    description: i18n.translate('discover.localMenu.optionsDescription', {
      defaultMessage: 'Options',
    }),
    run: (anchorElement: HTMLElement) =>
      openOptionsPopover({
        I18nContext: services.core.i18n.Context,
        anchorElement,
        theme$: services.core.theme.theme$,
        services,
      }),
    testId: 'discoverOptionsButton',
  };

  const alerts = {
    id: 'alerts',
    label: i18n.translate('discover.localMenu.localMenu.alertsTitle', {
      defaultMessage: 'Alerts',
    }),
    description: i18n.translate('discover.localMenu.alertsDescription', {
      defaultMessage: 'Alerts',
    }),
    run: (anchorElement: HTMLElement) => {
      openAlertsPopover({
        I18nContext: services.core.i18n.Context,
        anchorElement,
        searchSource: savedSearch.searchSource,
        services,
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
    run: () => navigateTo('/'),
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
    run: () => onSaveSearch({ savedSearch, services, indexPattern, navigateTo, state }),
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
        onOpenSavedSearch,
        I18nContext: services.core.i18n.Context,
        theme$: services.core.theme.theme$,
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
      if (!services.share) {
        return;
      }
      const sharingData = await getSharingData(
        searchSource,
        state.appStateContainer.getState(),
        services
      );

      services.share.toggleShareContextMenu({
        anchorElement,
        allowEmbed: false,
        allowShortUrl: !!services.capabilities.discover.createShortUrl,
        shareableUrl: unhashUrl(window.location.href),
        objectId: savedSearch.id,
        objectType: 'search',
        sharingData: {
          ...sharingData,
          // CSV reports can be generated without a saved search so we provide a fallback title
          title:
            savedSearch.title ||
            i18n.translate('discover.localMenu.fallbackReportTitle', {
              defaultMessage: 'Untitled discover search',
            }),
        },
        isDirty: !savedSearch.id || state.isAppStateDirty(),
        showPublicUrlSwitch,
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

  return [
    ...(services.capabilities.advancedSettings.save ? [options] : []),
    newSearch,
    openSearch,
    ...(services.triggersActionsUi ? [alerts] : []),
    shareSearch,
    inspectSearch,
    ...(services.capabilities.discover.save ? [saveSearch] : []),
  ];
};
