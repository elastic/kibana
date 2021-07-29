/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import type { FieldFilter, Filter, FilterMeta, LatLon } from './types';

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

/**
 * @param filter
 * @returns `true` if a filter is an `GeoBoundingBoxFilter`
 *
 * @public
 */
export const isGeoBoundingBoxFilter = (filter: FieldFilter): filter is GeoBoundingBoxFilter =>
  get(filter, 'geo_bounding_box');

/**
 * @internal
 */
export const getGeoBoundingBoxFilterField = (filter: GeoBoundingBoxFilter) => {
  return (
    filter.geo_bounding_box &&
    Object.keys(filter.geo_bounding_box).find((key) => key !== 'ignore_unmapped')
  );
};
