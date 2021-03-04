/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { showOpenSearchPanel } from './show_open_search_panel';
import { getSharingData, showPublicUrlSwitch } from '../../helpers/get_sharing_data';
import { unhashUrl } from '../../../../../kibana_utils/public';
import { DiscoverServices } from '../../../build_services';
import { Adapters } from '../../../../../inspector/common/adapters';
import { SavedSearch } from '../../../saved_searches';
import { onSaveSearch } from './on_save_search';
import { GetStateReturn } from '../../angular/discover_state';
import { IndexPattern, ISearchSource } from '../../../kibana_services';

/**
 * Helper function to build the top nav links
 */
export const getTopNavLinks = ({
  getFieldCounts,
  indexPattern,
  inspectorAdapters,
  navigateTo,
  savedSearch,
  services,
  state,
  onOpenInspector,
  searchSource,
}: {
  getFieldCounts: () => Promise<Record<string, number>>;
  indexPattern: IndexPattern;
  inspectorAdapters: Adapters;
  navigateTo: (url: string) => void;
  savedSearch: SavedSearch;
  services: DiscoverServices;
  state: GetStateReturn;
  onOpenInspector: () => void;
  searchSource: ISearchSource;
}) => {
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
        makeUrl: (searchId) => `#/view/${encodeURIComponent(searchId)}`,
        I18nContext: services.core.i18n.Context,
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
        services.uiSettings,
        getFieldCounts
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
          title: savedSearch.title,
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
      services.inspector.open(inspectorAdapters, {
        title: savedSearch.title,
      });
    },
  };

  return [
    newSearch,
    ...(services.capabilities.discover.save ? [saveSearch] : []),
    openSearch,
    shareSearch,
    inspectSearch,
  ];
};
