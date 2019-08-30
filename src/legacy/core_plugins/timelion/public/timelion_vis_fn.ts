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

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';
import {
  ExpressionFunction,
  KibanaContext,
  Render,
} from 'src/plugins/data/common/expressions/types';
import { TimelionRequestHandlerProvider } from './vis/timelion_request_handler';

const name = 'timelion_vis';

type Context = KibanaContext | null;

interface Arguments {
  expression: string;
  interval: any;
}

export type VisParams = Required<Arguments>;

interface RenderValue {
  visData: Context;
  visType: typeof name;
  visParams: VisParams;
}

type Return = Promise<Render<RenderValue>>;

export const timelionVis = (): ExpressionFunction<typeof name, Context, Arguments, Return> => ({
  name,
  type: 'render',
  context: {
    types: ['kibana_context', 'null'],
  },
  help: i18n.translate('timelion.function.help', {
    defaultMessage: 'Timelion visualization',
  }),
  args: {
    expression: {
      types: ['string'],
      aliases: ['_'],
      default: '".es(*)"',
      help: '',
    },
    interval: {
      types: ['string', 'null'],
      default: 'auto',
      help: '',
    },
  },
  async fn(context, args) {
    const $injector = await chrome.dangerouslyGetActiveInjector();
    const Private = $injector.get('Private') as any;
    const timelionRequestHandler = Private(TimelionRequestHandlerProvider).handler;

    const visParams = { expression: args.expression, interval: args.interval };

    const response = await timelionRequestHandler({
      timeRange: get(context, 'timeRange', null),
      query: get(context, 'query', null),
      filters: get(context, 'filters', null),
      forceFetch: true,
      visParams,
    });

    response.visType = 'timelion';

    return {
      type: 'render',
      as: 'visualization',
      value: {
        visParams,
        visType: name,
        visData: response,
      },
    };
  },
});
