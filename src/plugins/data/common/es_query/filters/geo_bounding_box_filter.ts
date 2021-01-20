/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Filter, FilterMeta, LatLon } from './meta_filter';

export type GeoBoundingBoxFilterMeta = FilterMeta & {
  params: {
    bottom_right: LatLon;
    top_left: LatLon;
  };
};

export type GeoBoundingBoxFilter = Filter & {
  meta: GeoBoundingBoxFilterMeta;
  geo_bounding_box: any;
};

export const isGeoBoundingBoxFilter = (filter: any): filter is GeoBoundingBoxFilter =>
  filter && filter.geo_bounding_box;

export const getGeoBoundingBoxFilterField = (filter: GeoBoundingBoxFilter) => {
  return (
    filter.geo_bounding_box &&
    Object.keys(filter.geo_bounding_box).find((key) => key !== 'ignore_unmapped')
  );
};
