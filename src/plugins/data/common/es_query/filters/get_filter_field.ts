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

import { Filter } from './meta_filter';
import { getExistsFilterField, isExistsFilter } from './exists_filter';
import { getGeoBoundingBoxFilterField, isGeoBoundingBoxFilter } from './geo_bounding_box_filter';
import { getGeoPolygonFilterField, isGeoPolygonFilter } from './geo_polygon_filter';
import { getPhraseFilterField, isPhraseFilter } from './phrase_filter';
import { getPhrasesFilterField, isPhrasesFilter } from './phrases_filter';
import { getRangeFilterField, isRangeFilter } from './range_filter';
import { getMissingFilterField, isMissingFilter } from './missing_filter';

export const getFilterField = (filter: Filter) => {
  if (isExistsFilter(filter)) {
    return getExistsFilterField(filter);
  }
  if (isGeoBoundingBoxFilter(filter)) {
    return getGeoBoundingBoxFilterField(filter);
  }
  if (isGeoPolygonFilter(filter)) {
    return getGeoPolygonFilterField(filter);
  }
  if (isPhraseFilter(filter)) {
    return getPhraseFilterField(filter);
  }
  if (isPhrasesFilter(filter)) {
    return getPhrasesFilterField(filter);
  }
  if (isRangeFilter(filter)) {
    return getRangeFilterField(filter);
  }
  if (isMissingFilter(filter)) {
    return getMissingFilterField(filter);
  }

  return;
};
