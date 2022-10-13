/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExecutionContext, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { Adapters } from '@kbn/inspector-plugin/common';
import { ExpressionValueSearchContext, ExecutionContextSearch } from './kibana_context_type';

const toArray = <T>(query: undefined | T | T[]): T[] =>
  !query ? [] : Array.isArray(query) ? query : [query];

export type ExpressionFunctionKibana = ExpressionFunctionDefinition<
  'kibana',
  // TODO: Get rid of the `null` type below.
  ExpressionValueSearchContext | null,
  object,
  ExpressionValueSearchContext,
  ExecutionContext<Adapters, ExecutionContextSearch>
>;

export const kibana: ExpressionFunctionKibana = {
  name: 'kibana',
  type: 'kibana_context',

  inputTypes: ['kibana_context', 'null'],

  help: i18n.translate('data.search.functions.kibana.help', {
    defaultMessage: 'Gets kibana global context',
  }),

  args: {},

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
