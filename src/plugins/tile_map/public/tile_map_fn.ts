/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import type { ExpressionFunctionDefinition, Datatable, Render } from '../../expressions/public';
import { TileMapVisConfig, TileMapVisData } from './types';

interface Arguments {
  visConfig: string | null;
}

export interface TileMapVisRenderValue {
  visData: TileMapVisData;
  visType: 'tile_map';
  visConfig: TileMapVisConfig;
}

export type TileMapExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'tilemap',
  Datatable,
  Arguments,
  Promise<Render<TileMapVisRenderValue>>
>;

export const createTileMapFn = (): TileMapExpressionFunctionDefinition => ({
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
      help: '',
    },
  },
  async fn(context, args, handlers) {
    const visConfig = args.visConfig && JSON.parse(args.visConfig);
    const { geohash, metric, geocentroid } = visConfig.dimensions;

    const { convertToGeoJson } = await import('./utils');
    const convertedData = convertToGeoJson(context, {
      geohash,
      metric,
      geocentroid,
    });

    if (handlers?.inspectorAdapters?.tables) {
      handlers.inspectorAdapters.tables.logDatatable('default', context);
    }
    return {
      type: 'render',
      as: 'tile_map_vis',
      value: {
        visData: convertedData,
        visType: 'tile_map',
        visConfig,
      },
    };
  },
});
