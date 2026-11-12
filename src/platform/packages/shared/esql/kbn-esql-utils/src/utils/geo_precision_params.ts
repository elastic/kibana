/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getGeohashPrecision,
  getGeohexPrecision,
  getGeotilePrecision,
  type GRID_RESOLUTION,
} from '@kbn/geo-precision';
import {
  GEOHASH_PRECISION_PARAM,
  GEOHEX_PRECISION_PARAM,
  GEOTILE_PRECISION_PARAM,
} from '@kbn/esql-language';
import { hasNamedParam } from './has_named_param';

/** Map zoom and grid resolution used to derive the values of the geo precision params. */
export interface GeoPrecisionParams {
  zoom: number;
  resolution?: GRID_RESOLUTION;
}

export const hasGeotilePrecisionParam = (query: string) =>
  hasNamedParam(query, GEOTILE_PRECISION_PARAM);

export const hasGeohashPrecisionParam = (query: string) =>
  hasNamedParam(query, GEOHASH_PRECISION_PARAM);

export const hasGeohexPrecisionParam = (query: string) =>
  hasNamedParam(query, GEOHEX_PRECISION_PARAM);

/**
 * Returns the values of the `?_geotile_precision`, `?_geohex_precision` and `?_geohash_precision`
 * params the query uses.
 * Values are derived from the map zoom and grid resolution.
 */
export const getGeoPrecisionParamValues = (
  query: string,
  zoom: number,
  resolution?: GRID_RESOLUTION
): { geotile?: number; geohex?: number; geohash?: number } => ({
  ...(hasGeotilePrecisionParam(query) ? { geotile: getGeotilePrecision(zoom, resolution) } : {}),
  ...(hasGeohexPrecisionParam(query) ? { geohex: getGeohexPrecision(zoom, resolution) } : {}),
  ...(hasGeohashPrecisionParam(query) ? { geohash: getGeohashPrecision(zoom, resolution) } : {}),
});

export const getGeoPrecisionParams = (
  query: string,
  zoom: number,
  resolution?: GRID_RESOLUTION
) => {
  const { geotile, geohex, geohash } = getGeoPrecisionParamValues(query, zoom, resolution);
  const namedParams: Array<Record<string, number>> = [];
  if (geotile !== undefined) namedParams.push({ [GEOTILE_PRECISION_PARAM]: geotile });
  if (geohex !== undefined) namedParams.push({ [GEOHEX_PRECISION_PARAM]: geohex });
  if (geohash !== undefined) namedParams.push({ [GEOHASH_PRECISION_PARAM]: geohash });
  return namedParams;
};
