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
import { vislibSlicesResponseHandler } from './vislib/response_handler';
import { PieVisParams } from './pie';
import { VislibChartType } from './types';
import { vislibVisName } from './vis_type_vislib_vis_fn';

export const vislibPieName = 'vislib_pie_vis';

interface Arguments {
  visConfig: string;
}

export interface PieRenderValue {
  visType: Extract<VislibChartType, 'pie'>;
  visData: unknown;
  visConfig: PieVisParams;
}

export type VisTypeVislibPieExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof vislibPieName,
  Datatable,
  Arguments,
  Render<PieRenderValue>
>;

export const createPieVisFn = (): VisTypeVislibPieExpressionFunctionDefinition => ({
  name: vislibPieName,
  type: 'render',
  inputTypes: ['datatable'],
  help: i18n.translate('visTypeVislib.functions.pie.help', {
    defaultMessage: 'Pie visualization',
  }),
  args: {
    visConfig: {
      types: ['string'],
      default: '"{}"',
      help: 'vislib pie vis config',
    },
  },
  fn(input, args, handlers) {
    const visConfig = JSON.parse(args.visConfig) as PieVisParams;
    const visData = vislibSlicesResponseHandler(input, visConfig.dimensions);

    if (handlers?.inspectorAdapters?.tables) {
      handlers.inspectorAdapters.tables.logDatatable('default', input);
    }

    return {
      type: 'render',
      as: vislibVisName,
      value: {
        visData,
        visConfig,
        visType: VislibChartType.Pie,
      },
    };
  },
});
