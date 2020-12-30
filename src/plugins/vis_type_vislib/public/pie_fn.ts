/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';

import { ExpressionFunctionDefinition, Datatable, Render } from '../../expressions/public';

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
