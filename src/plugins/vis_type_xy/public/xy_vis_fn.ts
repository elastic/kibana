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
      },
    };
  },
});
