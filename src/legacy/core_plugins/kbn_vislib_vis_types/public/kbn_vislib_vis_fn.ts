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

import { vislibSeriesResponseHandlerProvider } from './legacy_imports';
import {
  ExpressionFunction,
  KibanaDatatable,
  Render,
} from '../../../../plugins/expressions/public';

const name = 'vislib';

type Context = KibanaDatatable;

interface Arguments {
  type: string;
  visConfig: string;
}

type VisParams = Required<Arguments>;

interface RenderValue {
  visType: string;
  visConfig: VisParams;
}

type Return = Promise<Render<RenderValue>>;

export const createKbnVislibVisTypesFn = (): ExpressionFunction<
  typeof name,
  Context,
  Arguments,
  Return
> => ({
  name: 'vislib',
  type: 'render',
  context: {
    types: ['kibana_datatable'],
  },
  help: i18n.translate('kbnVislibVisTypes.functions.vislib.help', {
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
      help: '',
    },
  },
  async fn(context, args) {
    const responseHandler = vislibSeriesResponseHandlerProvider().handler;
    const visConfigParams = JSON.parse(args.visConfig);

    const convertedData = await responseHandler(context, visConfigParams.dimensions);

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: convertedData,
        visType: args.type,
        visConfig: visConfigParams,
        params: {
          listenOnChange: true,
        },
      },
    };
  },
});
