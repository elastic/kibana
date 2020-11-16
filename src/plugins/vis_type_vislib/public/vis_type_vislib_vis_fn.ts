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
