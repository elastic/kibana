/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { ExpressionFunctionDefinition, Datatable, Render } from '../../expressions/public';

import { ChartType, XyVisType } from '../common';
import { VisParams } from './types';

export const visName = 'xy_vis';

interface Arguments {
  type: XyVisType;
  visConfig: string;
}
export interface RenderValue {
  visData: Datatable;
  visType: ChartType;
  visConfig: VisParams;
  syncColors: boolean;
}

export type VisTypeXyExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof visName,
  Datatable,
  Arguments,
  Render<RenderValue>
>;

export const createVisTypeXyVisFn = (): VisTypeXyExpressionFunctionDefinition => ({
  name: visName,
  type: 'render',
  context: {
    types: ['datatable'],
  },
  help: i18n.translate('visTypeXy.functions.help', {
    defaultMessage: 'XY visualization',
  }),
  args: {
    type: {
      types: ['string'],
      default: '""',
      help: 'xy vis type',
    },
    visConfig: {
      types: ['string'],
      default: '"{}"',
      help: 'xy vis config',
    },
  },
  fn(context, args, handlers) {
    const visConfig = JSON.parse(args.visConfig) as VisParams;
    const visType = visConfig.type;

    if (handlers?.inspectorAdapters?.tables) {
      handlers.inspectorAdapters.tables.logDatatable('default', context);
    }

    return {
      type: 'render',
      as: visName,
      value: {
        context,
        visType,
        visConfig,
        visData: context,
        syncColors: handlers?.isSyncColorsEnabled?.() ?? false,
      },
    };
  },
});
