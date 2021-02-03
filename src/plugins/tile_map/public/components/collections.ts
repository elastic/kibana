/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { MapTypes } from '../utils/map_types';

export const collections = {
  mapTypes: [
    {
      value: MapTypes.ScaledCircleMarkers,
      text: i18n.translate('tileMap.mapTypes.scaledCircleMarkersText', {
        defaultMessage: 'Scaled circle markers',
      }),
    },
    {
      value: MapTypes.ShadedCircleMarkers,
      text: i18n.translate('tileMap.mapTypes.shadedCircleMarkersText', {
        defaultMessage: 'Shaded circle markers',
      }),
    },
    {
      value: MapTypes.ShadedGeohashGrid,
      text: i18n.translate('tileMap.mapTypes.shadedGeohashGridText', {
        defaultMessage: 'Shaded geohash grid',
      }),
    },
    {
      value: MapTypes.Heatmap,
      text: i18n.translate('tileMap.mapTypes.heatmapText', {
        defaultMessage: 'Heatmap',
      }),
    },
  ],
  legendPositions: [
    {
      value: 'bottomleft',
      text: i18n.translate('tileMap.legendPositions.bottomLeftText', {
        defaultMessage: 'Bottom left',
      }),
    },
    {
      value: 'bottomright',
      text: i18n.translate('tileMap.legendPositions.bottomRightText', {
        defaultMessage: 'Bottom right',
      }),
    },
    {
      value: 'topleft',
      text: i18n.translate('tileMap.legendPositions.topLeftText', {
        defaultMessage: 'Top left',
      }),
    },
    {
      value: 'topright',
      text: i18n.translate('tileMap.legendPositions.topRightText', {
        defaultMessage: 'Top right',
      }),
    },
  ],
};
