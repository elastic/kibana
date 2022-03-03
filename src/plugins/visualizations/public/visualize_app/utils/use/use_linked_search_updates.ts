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

import { Filter } from '@kbn/es-query';
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
    if (appState && visInstance && visInstance.savedSearch && visInstance.vis.data.searchSource) {
      const { savedSearch } = visInstance;
      // SearchSource is a promise-based stream of search results that can inherit from other search sources.
      const { searchSource } = visInstance.vis.data;

      const unlinkFromSavedSearch = () => {
        const searchSourceParent = savedSearch.searchSource;
        const searchSourceGrandparent = searchSourceParent?.getParent();
        const currentIndex = searchSourceParent?.getField('index');

        searchSource.setField('index', currentIndex);
        searchSource.setParent(searchSourceGrandparent);

        appState.transitions.unlinkSavedSearch({
          query: searchSourceParent?.getField('query'),
          parentFilters: (searchSourceParent?.getOwnField('filter') as Filter[]) || [],
        });

        services.toastNotifications.addSuccess(
          i18n.translate('visualizations.linkedToSearch.unlinkSuccessNotificationText', {
            defaultMessage: `Unlinked from saved search '{searchTitle}'`,
            values: {
              searchTitle: savedSearch.title,
            },
          })
        );
      };

      eventEmitter.on('unlinkFromSavedSearch', unlinkFromSavedSearch);

      return () => {
        eventEmitter.off('unlinkFromSavedSearch', unlinkFromSavedSearch);
      };
    }
  }, [appState, eventEmitter, visInstance, services.toastNotifications]);
};
