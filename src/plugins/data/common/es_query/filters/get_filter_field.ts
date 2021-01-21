/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
