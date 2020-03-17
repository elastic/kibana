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
import { uniq } from 'lodash';
import { stringify } from 'query-string';
import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '../../expression_functions';
import { KibanaContext } from '../../expression_types';
import { Query, Filter } from '../../../../data/common';

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
  Promise<KibanaContext>
>;

export const mergeInput = <T = any>(object: T | T[] = [], other: string | T | T[]): T[] => {
  const parsed: T | T[] = typeof other === 'string' ? JSON.parse(other || '[]') : other;
  return uniq<T>(
    [
      ...(Array.isArray(parsed) ? parsed : [parsed]),
      ...(Array.isArray(object) ? object : [object]),
    ],
    (n: any) => stringify(n)
  );
};

export const kibanaContextFunction: ExpressionFunctionKibanaContext = {
  name: 'kibana_context',
  type: 'kibana_context',
  inputTypes: ['kibana_context', 'null'],
  help: i18n.translate('expressions.functions.kibana_context.help', {
    defaultMessage: 'Updates kibana global context',
  }),
  args: {
    q: {
      types: ['string', 'null'],
      aliases: ['query', '_'],
      default: null,
      help: i18n.translate('expressions.functions.kibana_context.q.help', {
        defaultMessage: 'Specify Kibana free form text query',
      }),
    },
    filters: {
      types: ['string', 'null'],
      default: '"[]"',
      help: i18n.translate('expressions.functions.kibana_context.filters.help', {
        defaultMessage: 'Specify Kibana generic filters',
      }),
    },
    timeRange: {
      types: ['string', 'null'],
      default: null,
      help: i18n.translate('expressions.functions.kibana_context.timeRange.help', {
        defaultMessage: 'Specify Kibana time range filter',
      }),
    },
    savedSearchId: {
      types: ['string', 'null'],
      default: null,
      help: i18n.translate('expressions.functions.kibana_context.savedSearchId.help', {
        defaultMessage: 'Specify saved search ID to be used for queries and filters',
      }),
    },
  },

  async fn(input, args, { getSavedObject }) {
    const timeRange = args.timeRange ? JSON.parse(args.timeRange) : input?.timeRange;
    let queries = mergeInput<Query>(input?.query, args?.q || '[]');
    let filters = mergeInput<Filter>(input?.filters, args?.filters || '[]');

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
      const data = JSON.parse(search.searchSourceJSON) as { query: Query[]; filter: Filter[] };

      queries = mergeInput(queries, data.query);
      filters = mergeInput(filters, data.filter);
    }

    return {
      type: 'kibana_context',
      query: queries,
      filters: filters.filter((f: any) => !f.meta?.disabled),
      timeRange,
    };
  },
};
