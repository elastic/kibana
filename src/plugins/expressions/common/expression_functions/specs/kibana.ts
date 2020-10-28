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
import { MigrateFunction } from '../../../../kibana_utils/common/persistable_state';

const toArray = <T>(query: undefined | T | T[]): T[] =>
  !query ? [] : Array.isArray(query) ? query : [query];

export type ExpressionFunctionKibana = ExpressionFunctionDefinition<
  'kibana',
  // TODO: Get rid of the `null` type below.
  ExpressionValueSearchContext | null,
  object,
  ExpressionValueSearchContext
>;

type MYSTATE_7_10_0 = {
  name: 'kibana';
  args: {};
};

type MYSTATE_7_10_1 = {
  name: 'kibana_input';
  args: {};
};

const MIGRATE7_10_1: MigrateFunction<MYSTATE_7_10_0, MYSTATE_7_10_1> = (state) => {
  return {
    name: 'kibana_input',
    args: state.args,
  };
};

export const kibana: ExpressionFunctionKibana = {
  name: 'kibana',
  type: 'kibana_context',

  inputTypes: ['kibana_context', 'null'],

  help: i18n.translate('expressions.functions.kibana.help', {
    defaultMessage: 'Gets kibana global context',
  }),

  args: {},

  migrations: {
    '7.10.1': (MIGRATE7_10_1 as any) as MigrateFunction,
  },

  fn(input, _, { getSearchContext }) {
    const output: ExpressionValueSearchContext = {
      // TODO: This spread is left here for legacy reasons, possibly Lens uses it.
      // TODO: But it shouldn't be need.
      ...input,
      type: 'kibana_context',
      query: [...toArray(getSearchContext().query), ...toArray((input || {}).query)],
      filters: [...(getSearchContext().filters || []), ...((input || {}).filters || [])],
      timeRange: getSearchContext().timeRange || (input ? input.timeRange : undefined),
    };

    return output;
  },
};
