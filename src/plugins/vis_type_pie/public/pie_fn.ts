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
import { PieVisParams } from './types';
import { vislibSlicesResponseHandler } from './utils';

export const vislibPieName = 'pie_vis';

interface Arguments {
  visConfig: string;
}

export interface RenderValue {
  visData: Datatable;
  visType: string;
  visFormattedData: any;
  visConfig: PieVisParams;
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
  fn(context, args) {
    const visConfig = JSON.parse(args.visConfig) as PieVisParams;
    const visFormattedData = vislibSlicesResponseHandler(context, visConfig.dimensions);

    return {
      type: 'render',
      as: vislibPieName,
      value: {
        visData: context,
        visFormattedData,
        visConfig,
        visType: 'pie',
        params: {
          listenOnChange: true,
        },
      },
    };
  },
});
