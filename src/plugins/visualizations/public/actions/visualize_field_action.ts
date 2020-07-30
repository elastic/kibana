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
import { createAction } from '../../../ui_actions/public';
import { getApplication, getUISettings, getIndexPatterns } from '../services';
import { AGGS_TERMS_SIZE_SETTING } from '../../common/constants';
import { KBN_FIELD_TYPES } from '../../../data/public';
// import { VisualizeConstants } from '../application/visualize_constants';

export const ACTION_VISUALIZE_FIELD = 'ACTION_VISUALIZE_FIELD';

export interface VisualizeFieldContext {
  fieldName: string;
  indexPatternId: string;
}

export const visualizeFieldAction = createAction<typeof ACTION_VISUALIZE_FIELD>({
  type: ACTION_VISUALIZE_FIELD,
  getDisplayName: () => 'Visualize Field',
  execute: async (context) => {
    const indexPattern = await getIndexPatterns().get(context.indexPatternId);
    const field = indexPattern.fields.find((fld) => fld.name === context.fieldName);
    const aggsTermSize = getUISettings().get(AGGS_TERMS_SIZE_SETTING);
    const isGeoPoint = field?.type === KBN_FIELD_TYPES.GEO_POINT;
    const type = isGeoPoint ? 'tile_map' : 'histogram';
    let agg;

    // If we're visualizing a date field, and our index is time based (and thus has a time filter),
    // then run a date histogram
    if (field?.type === 'date' && indexPattern.timeFieldName === context.fieldName) {
      agg = {
        type: 'date_histogram',
        schema: 'segment',
        params: {
          field: context.fieldName,
          interval: 'auto',
        },
      };
    } else if (isGeoPoint) {
      agg = {
        type: 'geohash_grid',
        schema: 'segment',
        params: {
          field: context.fieldName,
          precision: 3,
        },
      };
    } else {
      agg = {
        type: 'terms',
        schema: 'segment',
        params: {
          field: context.fieldName,
          size: parseInt(aggsTermSize, 10),
          orderBy: '1',
        },
      };
    }

    const linkUrlParams = {
      indexPattern: context.indexPatternId,
      type,
      _a: rison.encode({
        vis: {
          type,
          aggs: [{ schema: 'metric', type: 'count', id: '1' }, agg],
        },
      } as any),
    };

    getApplication().navigateToApp('visualize', {
      path: `#/create?${stringify(linkUrlParams)}`,
    });
  },
});

// export const createVisualizeFieldAction = (application) =>
//   createAction<typeof ACTION_VISUALIZE_FIELD>({
//     type: ACTION_VISUALIZE_FIELD,
//     getDisplayName: () => 'Visualize Field',
//     execute: async (context) => {
//       application.navigateToApp('visualize', { path: VisualizeConstants.LANDING_PAGE_PATH });
//       // console.log(context.field);
//     },
//   });
