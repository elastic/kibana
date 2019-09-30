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
import { get } from 'lodash';
import { GeoBoundingBoxFilter, Filter, FILTERS, isGeoBoundingBoxFilter } from '@kbn/es-query';
import { IndexPatterns, IndexPattern } from '../../../index_patterns';
import { SavedObjectNotFound } from '../../../../../../../plugins/kibana_utils/public';

const getFormattedValue = (params: any, key: string, indexPattern?: IndexPattern) => {
  const formatter: any =
    indexPattern && key && get(indexPattern, ['fields', 'byName', key, 'format']);

  return formatter
    ? {
        topLeft: formatter.convert(params.top_left),
        bottomRight: formatter.convert(params.bottom_right),
      }
    : {
        topLeft: JSON.stringify(params.top_left),
        bottomRight: JSON.stringify(params.bottom_right),
      };
};

const getParams = (filter: GeoBoundingBoxFilter, indexPattern?: IndexPattern) => {
  const key = Object.keys(filter.geo_bounding_box).filter(k => k !== 'ignore_unmapped')[0];
  const params = filter.geo_bounding_box[key];
  const { topLeft, bottomRight } = getFormattedValue(params, key, indexPattern);

  return {
    key,
    params,
    type: FILTERS.GEO_BOUNDING_BOX,
    value: topLeft + ' to ' + bottomRight,
  };
};

export const mapGeoBoundingBox = (indexPatterns: IndexPatterns) => {
  return async (filter: Filter) => {
    if (!isGeoBoundingBoxFilter(filter)) {
      throw filter;
    }

    try {
      let indexPattern;

      if (filter.meta.index) {
        indexPattern = await indexPatterns.get(filter.meta.index);
      }

      return getParams(filter, indexPattern);
    } catch (error) {
      if (error instanceof SavedObjectNotFound) {
        return getParams(filter);
      }
      throw error;
    }
  };
};
