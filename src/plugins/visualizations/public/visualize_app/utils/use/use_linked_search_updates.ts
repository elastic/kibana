/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EventEmitter } from 'events';

import { Filter, Query } from '@kbn/es-query';
import {
  VisualizeServices,
  VisualizeAppStateContainer,
  VisualizeEditorVisInstance,
} from '../../types';

export const useLinkedSearchUpdates = (
  services: VisualizeServices,
  eventEmitter: EventEmitter,
  appState: VisualizeAppStateContainer | null,
  visInstance: VisualizeEditorVisInstance | undefined
) => {
  useEffect(() => {
    if (appState && visInstance && visInstance.vis.data.savedSearchId) {
      const { savedSearch: savedSearchService } = services;
      // SearchSource is a promise-based stream of search results that can inherit from other search sources.

      const unlinkFromSavedSearch = async (showToast: boolean = true) => {
        const { searchSource } = visInstance.vis.data;
        const savedSearch = await savedSearchService.get(visInstance.vis.data.savedSearchId!);
        const searchSourceParent = savedSearch.searchSource;
        const searchSourceGrandparent = searchSourceParent?.getParent();
        const currentIndex = searchSourceParent?.getField('index');
        visInstance.vis.data.savedSearchId = undefined;

        searchSource!.setField('index', currentIndex);
        searchSource!.setParent(searchSourceGrandparent);

        appState.transitions.unlinkSavedSearch({
          query: searchSourceParent?.getField('query') as Query,
          parentFilters: (searchSourceParent?.getOwnField('filter') as Filter[]) || [],
        });

        if (showToast) {
          services.toastNotifications.addSuccess(
            i18n.translate('visualizations.linkedToSearch.unlinkSuccessNotificationText', {
              defaultMessage: `Unlinked from saved search ''{searchTitle}''`,
              values: {
                searchTitle: savedSearch.title,
              },
            })
          );
        }
      };

      eventEmitter.on('unlinkFromSavedSearch', unlinkFromSavedSearch);

      return () => {
        eventEmitter.off('unlinkFromSavedSearch', unlinkFromSavedSearch);
      };
    }
  }, [appState, eventEmitter, visInstance, services.toastNotifications, services]);
};
