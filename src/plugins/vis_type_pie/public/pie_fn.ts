/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, Datatable, Render } from '../../expressions/public';
import { PieVisParams } from './types';

export const vislibPieName = 'pie_vis';

interface Arguments {
  visConfig: string;
}

export interface RenderValue {
  visData: Datatable;
  visType: string;
  visConfig: PieVisParams;
  syncColors: boolean;
}

export type VisTypePieExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof vislibPieName,
  Datatable,
  Arguments,
  Render<RenderValue>
>;

export const createPieVisFn = (): VisTypePieExpressionFunctionDefinition => ({
  name: vislibPieName,
  type: 'render',
  inputTypes: ['datatable'],
  help: i18n.translate('visTypePie.functions.help', {
    defaultMessage: 'Pie visualization',
  }),
  args: {
    visConfig: {
      types: ['string'],
      default: '"{}"',
      help: 'vislib pie vis config',
    },
  },
  fn(context, args, handlers) {
    const visConfig = JSON.parse(args.visConfig) as PieVisParams;

    if (handlers?.inspectorAdapters?.tables) {
      handlers.inspectorAdapters.tables.logDatatable('default', context);
    }

    return {
      type: 'render',
      as: vislibPieName,
      value: {
        visData: context,
        visConfig,
        syncColors: handlers?.isSyncColorsEnabled?.() ?? false,
        visType: 'pie',
        params: {
          listenOnChange: true,
        },
      },
    };
  },
});
