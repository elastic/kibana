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

import {
  CustomFilter,
  ExistsFilter,
  GeoBoundingBoxFilter,
  GeoPolygonFilter,
  MetaFilter,
  PhraseFilter,
  PhrasesFilter,
  QueryFilter,
  RangeFilter,
} from '../index';
import { getCustomFilterViews } from './custom_filter_views';
import { getExistsFilterViews } from './exists_filter_views';
import { getGeoBoundingBoxFilterViews } from './geo_bounding_box_filter_views';
import { getGeoPolygonFilterViews } from './geo_polygon_filter_views';
import { getPhraseFilterViews } from './phrase_filter_views';
import { getPhrasesFilterViews } from './phrases_filter_views';
import { getQueryFilterViews } from './query_filter_views';
import { getRangeFilterViews } from './range_filter_views';

export interface FilterViews {
  getDisplayText: () => string;
}

export function getFilterDisplayText(filter: MetaFilter): string {
  if (filter.meta.alias !== null) {
    return filter.meta.alias;
  }
  const prefix = filter.meta.negate ? 'NOT ' : '';
  const filterText = getViewsForType(filter).getDisplayText();
  return `${prefix}${filterText}`;
}

function getViewsForType(filter: MetaFilter) {
  switch (filter.meta.type) {
    case 'exists':
      return getExistsFilterViews(filter as ExistsFilter);
    case 'geo_bounding_box':
      return getGeoBoundingBoxFilterViews(filter as GeoBoundingBoxFilter);
    case 'geo_polygon':
      return getGeoPolygonFilterViews(filter as GeoPolygonFilter);
    case 'phrase':
      return getPhraseFilterViews(filter as PhraseFilter);
    case 'phrases':
      return getPhrasesFilterViews(filter as PhrasesFilter);
    case 'query_string':
      return getQueryFilterViews(filter as QueryFilter);
    case 'range':
      return getRangeFilterViews(filter as RangeFilter);
    default:
      return getCustomFilterViews(filter as CustomFilter);
  }
}
