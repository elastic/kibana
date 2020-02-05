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
import {
  ExpressionFunctionDefinition,
  KibanaDatatable,
  Render,
} from '../../../../plugins/expressions/public';
// @ts-ignore
import { vislibSlicesResponseHandler } from './vislib/response_handler';

interface Arguments {
  visConfig: string;
}

type VisParams = Required<Arguments>;

interface RenderValue {
  visConfig: VisParams;
}

export const createPieVisFn = (): ExpressionFunctionDefinition<
  'kibana_pie',
  KibanaDatatable,
  Arguments,
  Render<RenderValue>
> => ({
  name: 'kibana_pie',
  type: 'render',
  inputTypes: ['kibana_datatable'],
  help: i18n.translate('visTypeVislib.functions.pie.help', {
    defaultMessage: 'Pie visualization',
  }),
  args: {
    visConfig: {
      types: ['string'],
      default: '"{}"',
      help: '',
    },
  },
  fn(input, args) {
    const visConfig = JSON.parse(args.visConfig);
    const convertedData = vislibSlicesResponseHandler(input, visConfig.dimensions);

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visData: convertedData,
        visType: 'pie',
        visConfig,
        params: {
          listenOnChange: true,
        },
      },
    };
  },
});
