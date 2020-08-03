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
import rison from 'rison-node';
import { stringify } from 'query-string';
import { i18n } from '@kbn/i18n';
import { createAction } from '../../../ui_actions/public';
import { DiscoverAppState } from '../../../discover/public';
import { createKbnUrlStateStorage, IKbnUrlStateStorage } from '../../../kibana_utils/public';
import { getApplication, getVisualizations } from '../services';

export const ACTION_VISUALIZE_TILEMAP_FIELD = 'ACTION_VISUALIZE_TILEMAP_FIELD';

export const visualizeTilemapFieldAction = createAction<typeof ACTION_VISUALIZE_TILEMAP_FIELD>({
  type: ACTION_VISUALIZE_TILEMAP_FIELD,
  getDisplayName: () =>
    i18n.translate('tileMap.discover.visualizeFieldLabel', {
      defaultMessage: 'Visualize on Coordinate Maps',
    }),
  isCompatible: async () => !getVisualizations().typeIsHidden('tile_map'),
  execute: async (context) => {
    const stateStorage: IKbnUrlStateStorage = createKbnUrlStateStorage();
    const appStateFromUrl: DiscoverAppState | null = stateStorage.get('_a');
    const agg = {
      type: 'geohash_grid',
      schema: 'segment',
      params: {
        field: context.fieldName,
        precision: 3,
      },
    };

    const linkUrlParams = {
      indexPattern: context.indexPatternId,
      type: 'tile_map',
      _a: rison.encode({
        filters: appStateFromUrl?.filters || [],
        query: appStateFromUrl?.query,
        vis: {
          type: 'tile_map',
          aggs: [{ schema: 'metric', type: 'count', id: '1' }, agg],
        },
      } as any),
    };

    getApplication().navigateToApp('visualize', {
      path: `#/create?${stringify(linkUrlParams)}`,
    });
  },
});
