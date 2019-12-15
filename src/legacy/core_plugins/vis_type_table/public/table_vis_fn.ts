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
import { tableVisResponseHandler } from './table_vis_request_handler';

import {
  ExpressionFunction,
  KibanaDatatable,
  Render,
} from '../../../../plugins/expressions/public';

const name = 'kibana_table';

type Context = KibanaDatatable;

interface Arguments {
  visConfig: string | null;
}

type VisParams = Required<Arguments>;

interface RenderValue {
  visData: Context;
  visType: 'table';
  visConfig: VisParams;
  params: {
    listenOnChange: boolean;
  };
}

type Return = Promise<Render<RenderValue>>;

export const createTableVisFn = (): ExpressionFunction<
  typeof name,
  Context,
  Arguments,
  Return
> => ({
  name,
  type: 'render',
  context: {
    types: ['kibana_datatable'],
  },
  help: i18n.translate('visTypeTable.function.help', {
    defaultMessage: 'Table visualization',
  }),
  args: {
    visConfig: {
      types: ['string', 'null'],
      default: '"{}"',
      help: '',
    },
  },
  async fn(context, args) {
    const visConfig = args.visConfig && JSON.parse(args.visConfig);
    const convertedData = await tableVisResponseHandler(context, visConfig.dimensions);

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: convertedData,
        visType: 'table',
        visConfig,
        params: {
          listenOnChange: true,
        },
      },
    };
  },
});
