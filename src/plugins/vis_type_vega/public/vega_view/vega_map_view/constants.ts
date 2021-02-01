/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TMS_IN_YML_ID } from '../../../../maps_legacy/public';

export const vegaLayerId = 'vega';
export const userConfiguredLayerId = TMS_IN_YML_ID;
export const defaultMapConfig = {
  maxZoom: 20,
  minZoom: 0,
  tileSize: 256,
};

export const defaultMabBoxStyle = {
  /**
   * according to the MapBox documentation that value should be '8'
   * @see (https://docs.mapbox.com/mapbox-gl-js/style-spec/root/#version)
   */
  version: 8,
  sources: {},
  layers: [],
};

export const defaultProjection = {
  name: 'projection',
  type: 'mercator',
  scale: { signal: '512*pow(2,zoom)/2/PI' },
  rotate: [{ signal: '-longitude' }, 0, 0],
  center: [0, { signal: 'latitude' }],
  translate: [{ signal: 'width/2' }, { signal: 'height/2' }],
  fit: false,
};
