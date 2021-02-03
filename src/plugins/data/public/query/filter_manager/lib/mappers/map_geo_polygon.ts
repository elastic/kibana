/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  FilterValueFormatter,
  GeoPolygonFilter,
  FILTERS,
  Filter,
  isGeoPolygonFilter,
} from '../../../../../common';

const POINTS_SEPARATOR = ', ';

const getFormattedValueFn = (points: string[]) => {
  return (formatter?: FilterValueFormatter) => {
    return points
      .map((point: string) => (formatter ? formatter.convert(point) : JSON.stringify(point)))
      .join(POINTS_SEPARATOR);
  };
};

function getParams(filter: GeoPolygonFilter) {
  const key = Object.keys(filter.geo_polygon).filter((k) => k !== 'ignore_unmapped')[0];
  const params = filter.geo_polygon[key];

  return {
    key,
    params,
    type: FILTERS.GEO_POLYGON,
    value: getFormattedValueFn(params.points || []),
  };
}

export function mapGeoPolygon(filter: Filter) {
  if (!isGeoPolygonFilter(filter)) {
    throw filter;
  }
  return getParams(filter);
}
