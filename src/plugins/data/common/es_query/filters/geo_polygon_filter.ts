/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Filter, FilterMeta, LatLon } from './meta_filter';

export type GeoPolygonFilterMeta = FilterMeta & {
  params: {
    points: LatLon[];
  };
};

export type GeoPolygonFilter = Filter & {
  meta: GeoPolygonFilterMeta;
  geo_polygon: any;
};

export const isGeoPolygonFilter = (filter: any): filter is GeoPolygonFilter =>
  filter && filter.geo_polygon;

export const getGeoPolygonFilterField = (filter: GeoPolygonFilter) => {
  return (
    filter.geo_polygon && Object.keys(filter.geo_polygon).find((key) => key !== 'ignore_unmapped')
  );
};
