/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// geohash precision mapping of geohash grid cell dimensions (width x height, in meters) at equator.
// https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-geohashgrid-aggregation.html#_cell_dimensions_at_the_equator
const gridAtEquator: { [key: number]: [number, number] } = {
  1: [5009400, 4992600],
  2: [1252300, 624100],
  3: [156500, 156000],
  4: [39100, 19500],
  5: [4900, 4900],
  6: [1200, 609.4],
  7: [152.9, 152.4],
  8: [38.2, 19],
  9: [4.8, 4.8],
  10: [1.2, 0.595],
  11: [0.149, 0.149],
  12: [0.037, 0.019],
};

export function gridDimensions(precision: number) {
  return gridAtEquator[precision];
}
