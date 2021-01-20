/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import type { ExpressionFunctionDefinition, Datatable, Render } from '../../expressions/public';
import { RegionMapVisConfig } from './region_map_types';

interface Arguments {
  visConfig: string | null;
}

export interface RegionMapVisRenderValue {
  visData: Datatable;
  visType: 'region_map';
  visConfig: RegionMapVisConfig;
}

export type RegionMapExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'regionmap',
  Datatable,
  Arguments,
  Render<RegionMapVisRenderValue>
>;

export const createRegionMapFn = (): RegionMapExpressionFunctionDefinition => ({
  name: 'regionmap',
  type: 'render',
  context: {
    types: ['datatable'],
  },
  help: i18n.translate('regionMap.function.help', {
    defaultMessage: 'Regionmap visualization',
  }),
  args: {
    visConfig: {
      types: ['string', 'null'],
      default: '"{}"',
      help: '',
    },
  },
  fn(context, args, handlers) {
    const visConfig = args.visConfig && JSON.parse(args.visConfig);

    if (handlers?.inspectorAdapters?.tables) {
      handlers.inspectorAdapters.tables.logDatatable('default', context);
    }
    return {
      type: 'render',
      as: 'region_map_vis',
      value: {
        visData: context,
        visType: 'region_map',
        visConfig,
      },
    };
  },
});
