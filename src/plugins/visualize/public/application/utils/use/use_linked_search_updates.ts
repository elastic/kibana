/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EventEmitter } from 'events';

import { Filter } from 'src/plugins/data/public';
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
          i18n.translate('visualize.linkedToSearch.unlinkSuccessNotificationText', {
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
