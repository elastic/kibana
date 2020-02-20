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
import { tableVisResponseHandler, TableContext } from './table_vis_response_handler';
import {
  ExpressionFunctionDefinition,
  KibanaDatatable,
  Render,
} from '../../../../plugins/expressions/public';

export type Input = KibanaDatatable;

interface Arguments {
  visConfig: string | null;
}

type VisParams = Required<Arguments>;

interface RenderValue {
  visData: TableContext;
  visType: 'table';
  visConfig: VisParams;
  params: {
    listenOnChange: boolean;
  };
}

export const createTableVisFn = (): ExpressionFunctionDefinition<
  'kibana_table',
  Input,
  Arguments,
  Render<RenderValue>
> => ({
  name: 'kibana_table',
  type: 'render',
  inputTypes: ['kibana_datatable'],
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
  fn(input, args) {
    const visConfig = args.visConfig && JSON.parse(args.visConfig);
    const convertedData = tableVisResponseHandler(input, visConfig.dimensions);

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
