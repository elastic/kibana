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
  const key = Object.keys(filter.geo_polygon).filter(k => k !== 'ignore_unmapped')[0];
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
