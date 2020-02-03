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
import { ExpressionFunctionDefinition } from '../types';
import { ExpressionValueSearchContext } from '../../expression_types';

export type ExpressionFunctionKibana = ExpressionFunctionDefinition<
  'kibana',
  ExpressionValueSearchContext | null,
  object,
  ExpressionValueSearchContext
>;

export const kibana: ExpressionFunctionKibana = {
  name: 'kibana',
  type: 'kibana_context',

  context: {
    types: ['kibana_context', 'null'],
  },

  help: i18n.translate('expressions.functions.kibana.help', {
    defaultMessage: 'Gets kibana global context',
  }),

  args: {},

  fn(input, _, { search }) {
    if (!search) {
      throw new Error('`search` context not provided in ExecutionContext.');
    }

    const output: ExpressionValueSearchContext = {
      ...input,
      type: 'kibana_context',
      // query: ...
      filters: [...(search.filters || []), ...((input && input.filters) || [])],
      timeRange: search.timeRange || (input ? input.timeRange : undefined),
    };

    // TODO: FIX THIS.
    // if (input && input.query && search.query) {
    // output.query = [...search.query, ...input.query];
    // }

    return output;
  },
};
