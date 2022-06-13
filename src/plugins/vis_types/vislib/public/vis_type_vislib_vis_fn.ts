/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { ExpressionFunctionDefinition, Datatable, Render } from '@kbn/expressions-plugin/public';

// @ts-ignore
import { vislibSeriesResponseHandler } from './vislib/response_handler';
import { BasicVislibParams, VislibChartType } from './types';

export const vislibVisName = 'vislib_vis';

interface Arguments {
  type: Exclude<VislibChartType, 'pie'>;
  visConfig: string;
}

export interface VislibRenderValue {
  visType: Exclude<VislibChartType, 'pie'>;
  visData: unknown;
  visConfig: BasicVislibParams;
}

export type VisTypeVislibExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof vislibVisName,
  Datatable,
  Arguments,
  Render<VislibRenderValue>
>;

export const createVisTypeVislibVisFn = (): VisTypeVislibExpressionFunctionDefinition => ({
  name: vislibVisName,
  type: 'render',
  inputTypes: ['datatable'],
  help: i18n.translate('visTypeVislib.functions.vislib.help', {
    defaultMessage: 'Vislib visualization',
  }),
  args: {
    type: {
      types: ['string'],
      default: '""',
      help: 'vislib vis type',
    },
    visConfig: {
      types: ['string'],
      default: '"{}"',
      help: 'vislib vis config',
    },
  },
  fn(context, args, handlers) {
    const visType = args.type as Exclude<VislibChartType, 'pie'>;
    const visConfig = JSON.parse(args.visConfig) as BasicVislibParams;
    const visData = vislibSeriesResponseHandler(context, visConfig.dimensions);

    if (handlers?.inspectorAdapters?.tables) {
      handlers.inspectorAdapters.tables.logDatatable('default', context);
    }

    return {
      type: 'render',
      as: vislibVisName,
      value: {
        visData,
        visConfig,
        visType,
      },
    };
  },
});
