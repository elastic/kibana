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
import { ExpressionFunction } from '../../common/types';
import { KibanaContext } from '../../common/expression_types';

export type ExpressionFunctionKibana = ExpressionFunction<
  'kibana',
  KibanaContext | null,
  object,
  KibanaContext
>;

export const kibana = (): ExpressionFunctionKibana => ({
  name: 'kibana',
  type: 'kibana_context',

  context: {
    types: ['kibana_context', 'null'],
  },

  help: i18n.translate('expressions.functions.kibana.help', {
    defaultMessage: 'Gets kibana global context',
  }),
  args: {},
  fn(context, args, handlers) {
    const initialContext = handlers.getInitialContext ? handlers.getInitialContext() : {};

    if (context && context.query) {
      initialContext.query = initialContext.query.concat(context.query);
    }

    if (context && context.filters) {
      initialContext.filters = initialContext.filters.concat(context.filters);
    }

    const timeRange = initialContext.timeRange || (context ? context.timeRange : undefined);

    return {
      ...context,
      type: 'kibana_context',
      query: initialContext.query,
      filters: initialContext.filters,
      timeRange,
    };
  },
});
