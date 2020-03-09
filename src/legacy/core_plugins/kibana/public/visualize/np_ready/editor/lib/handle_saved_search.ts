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

import { i18n } from '@kbn/i18n';

import { ToastsStart } from 'kibana/public';
import { Vis, VisSavedObject } from 'src/legacy/core_plugins/visualizations/public';
import { Filter } from 'src/plugins/data/public';
import {
  IKbnUrlStateStorage,
  ReduxLikeStateContainer,
} from '../../../../../../../../plugins/kibana_utils/public';
import { VisualizeAppStateTransitions, VisualizeAppState } from '../../types';

interface Arguments {
  kbnUrlStateStorage: IKbnUrlStateStorage;
  savedVis: VisSavedObject;
  stateContainer: ReduxLikeStateContainer<VisualizeAppState, VisualizeAppStateTransitions>;
  toastNotifications: ToastsStart;
  vis: Vis;
}

/**
 * Handles changes around linked search to a saved object
 */
export const handleSavedSearch = ({
  kbnUrlStateStorage,
  savedVis,
  stateContainer,
  toastNotifications,
  vis,
}: Arguments) => {
  const { searchSource } = savedVis;
  const searchSourceParent = searchSource.getParent();
  const searchSourceGrandparent = searchSourceParent?.getParent();

  kbnUrlStateStorage.change$<string>('savedSearchId').subscribe(savedSearchId => {
    if (savedSearchId && !savedVis.savedSearchId) {
      savedVis.savedSearchId = savedSearchId;
      vis.savedSearchId = savedSearchId;

      searchSource.setParent(searchSourceParent);
    } else if (!savedSearchId && savedVis.savedSearchId) {
      delete savedVis.savedSearchId;
      delete vis.savedSearchId;
    }
  });

  const unlinkFromSavedSearch = () => {
    if (!searchSourceParent) {
      return;
    }

    const currentIndex = searchSourceParent.getField('index');

    kbnUrlStateStorage.remove('savedSearchId');
    kbnUrlStateStorage.set('indexPattern', currentIndex?.id);

    searchSource.setField('index', currentIndex);
    searchSource.setParent(searchSourceGrandparent);

    stateContainer.transitions.unlinkSavedSearch({
      query: searchSourceParent.getField('query'),
      parentFilters: searchSourceParent.getOwnField('filter') as Filter[],
    });

    toastNotifications.addSuccess(
      i18n.translate('kbn.visualize.linkedToSearch.unlinkSuccessNotificationText', {
        defaultMessage: `Unlinked from saved search '{searchTitle}'`,
        values: {
          searchTitle: savedVis.savedSearch?.title,
        },
      })
    );
  };

  vis.on('unlinkFromSavedSearch', unlinkFromSavedSearch);
};
