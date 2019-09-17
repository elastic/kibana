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
import { GeoPolygonFilter } from '@kbn/es-query';
import { SavedObjectNotFound } from '../../../../../../../plugins/kibana_utils/public';
import { IndexPatterns, IndexPattern } from '../../../index_patterns';

const TYPE = 'geo_polygon';
const POINTS_SEPARATOR = ', ';

const getFormattedValue = (value: any, key: string, indexPattern?: IndexPattern) => {
  const formatter: any =
    indexPattern && key && get(indexPattern, ['fields', 'byName', key, 'format']);

  return formatter ? formatter.convert(value) : JSON.stringify(value);
};

function getParams(filter: GeoPolygonFilter, indexPattern?: IndexPattern) {
  const key = Object.keys(filter.geo_polygon).filter(k => k !== 'ignore_unmapped')[0];
  const params = filter.geo_polygon[key];

  return {
    key,
    params,
    type: TYPE,
    value: (params.points || [])
      .map((point: string) => getFormattedValue(point, key, indexPattern))
      .join(POINTS_SEPARATOR),
  };
}

export function mapGeoPolygon(indexPatterns: IndexPatterns) {
  return async function(filter: GeoPolygonFilter) {
    if (!filter.geo_polygon) {
      throw filter;
    }

    try {
      const index = filter.meta.index || '';
      const indexPattern = await indexPatterns.get(index);

      return getParams(filter, indexPattern);
    } catch (error) {
      if (error instanceof SavedObjectNotFound) {
        return getParams(filter);
      }
      throw error;
    }
  };
}
