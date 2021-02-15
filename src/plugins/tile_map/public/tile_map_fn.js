/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { convertToGeoJson } from '../../maps_legacy/public';
import { i18n } from '@kbn/i18n';

export const createTileMapFn = () => ({
  name: 'tilemap',
  type: 'render',
  context: {
    types: ['datatable'],
  },
  help: i18n.translate('tileMap.function.help', {
    defaultMessage: 'Tilemap visualization',
  }),
  args: {
    visConfig: {
      types: ['string', 'null'],
      default: '"{}"',
    },
  },
  fn(context, args) {
    const visConfig = JSON.parse(args.visConfig);
    const { geohash, metric, geocentroid } = visConfig.dimensions;
    const convertedData = convertToGeoJson(context, {
      geohash,
      metric,
      geocentroid,
    });

    if (geohash && geohash.accessor) {
      convertedData.meta.geohash = context.columns[geohash.accessor].meta;
    }

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: convertedData,
        visType: 'tile_map',
        visConfig,
        params: {
          listenOnChange: true,
        },
      },
    };
  },
});
