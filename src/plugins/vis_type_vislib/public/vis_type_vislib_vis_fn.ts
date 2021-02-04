/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { ExpressionFunctionDefinition, Datatable, Render } from '../../expressions/public';

// @ts-ignore
import { vislibSeriesResponseHandler } from './vislib/response_handler';
import { BasicVislibParams } from './types';

export const vislibVisName = 'vislib_vis';

interface Arguments {
  type: string;
  visConfig: string;
}

export interface VislibRenderValue {
  visData: any;
  visType: string;
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
  fn(context, args) {
    const visType = args.type;
    const visConfig = JSON.parse(args.visConfig) as BasicVislibParams;
    const visData = vislibSeriesResponseHandler(context, visConfig.dimensions);

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
