/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { uniqBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, ExecutionContext } from 'src/plugins/expressions/common';
import { Adapters } from 'src/plugins/inspector/common';
import { Query, uniqFilters } from '../../query';
import { ExecutionContextSearch, KibanaContext } from './kibana_context_type';

interface Arguments {
  q?: string | null;
  filters?: string | null;
  timeRange?: string | null;
  savedSearchId?: string | null;
}

export type ExpressionFunctionKibanaContext = ExpressionFunctionDefinition<
  'kibana_context',
  KibanaContext | null,
  Arguments,
  Promise<KibanaContext>,
  ExecutionContext<Adapters, ExecutionContextSearch>
>;

const getParsedValue = (data: any, defaultValue: any) =>
  typeof data === 'string' && data.length ? JSON.parse(data) || defaultValue : defaultValue;

const mergeQueries = (first: Query | Query[] = [], second: Query | Query[]) =>
  uniqBy<Query>(
    [...(Array.isArray(first) ? first : [first]), ...(Array.isArray(second) ? second : [second])],
    (n: any) => JSON.stringify(n.query)
  );

export const kibanaContextFunction: ExpressionFunctionKibanaContext = {
  name: 'kibana_context',
  type: 'kibana_context',
  inputTypes: ['kibana_context', 'null'],
  help: i18n.translate('data.search.functions.kibana_context.help', {
    defaultMessage: 'Updates kibana global context',
  }),
  args: {
    q: {
      types: ['string', 'null'],
      aliases: ['query', '_'],
      default: null,
      help: i18n.translate('data.search.functions.kibana_context.q.help', {
        defaultMessage: 'Specify Kibana free form text query',
      }),
    },
    filters: {
      types: ['string', 'null'],
      default: '"[]"',
      help: i18n.translate('data.search.functions.kibana_context.filters.help', {
        defaultMessage: 'Specify Kibana generic filters',
      }),
    },
    timeRange: {
      types: ['string', 'null'],
      default: null,
      help: i18n.translate('data.search.functions.kibana_context.timeRange.help', {
        defaultMessage: 'Specify Kibana time range filter',
      }),
    },
    savedSearchId: {
      types: ['string', 'null'],
      default: null,
      help: i18n.translate('data.search.functions.kibana_context.savedSearchId.help', {
        defaultMessage: 'Specify saved search ID to be used for queries and filters',
      }),
    },
  },

  async fn(input, args, { getSavedObject }) {
    const timeRange = getParsedValue(args.timeRange, input?.timeRange);
    let queries = mergeQueries(input?.query, getParsedValue(args?.q, []));
    let filters = [...(input?.filters || []), ...getParsedValue(args?.filters, [])];

    if (args.savedSearchId) {
      if (typeof getSavedObject !== 'function') {
        throw new Error(
          '"getSavedObject" function not available in execution context. ' +
            'When you execute expression you need to add extra execution context ' +
            'as the third argument and provide "getSavedObject" implementation.'
        );
      }
      const obj = await getSavedObject('search', args.savedSearchId);
      const search = obj.attributes.kibanaSavedObjectMeta as { searchSourceJSON: string };
      const { query, filter } = getParsedValue(search.searchSourceJSON, {});

      if (query) {
        queries = mergeQueries(queries, query);
      }
      if (filter) {
        filters = [...filters, ...(Array.isArray(filter) ? filter : [filter])];
      }
    }

    return {
      type: 'kibana_context',
      query: queries,
      filters: uniqFilters(filters).filter((f: any) => !f.meta?.disabled),
      timeRange,
    };
  },
};
