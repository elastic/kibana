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
  type GeoPrecisions,
} from '@kbn/geo-precision';

/** Values for all geo precision params for a map zoom. A Vega spec can use any of them. */
export function getGeoPrecisionsForZoom(zoom: number): Required<GeoPrecisions> {
  return {
    geotile: getGeotilePrecision(zoom),
    geohex: getGeohexPrecision(zoom),
    geohash: getGeohashPrecision(zoom),
  };
}
