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
import { savedObjects } from '../services';

interface Arguments {
  q?: string | null;
  filters?: string | null;
  timeRange?: string | null;
  savedSearchId?: string | null;
}

export type ExpressionFunctionKibanaContext = ExpressionFunction<
  'kibana_context',
  KibanaContext | null,
  Arguments,
  Promise<KibanaContext>
>;

export const kibanaContext = (): ExpressionFunctionKibanaContext => ({
  name: 'kibana_context',
  type: 'kibana_context',
  context: {
    types: ['kibana_context', 'null'],
  },
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
  async fn(context, args, handlers) {
    const queryArg = args.q ? JSON.parse(args.q) : [];
    let queries = Array.isArray(queryArg) ? queryArg : [queryArg];
    let filters = args.filters ? JSON.parse(args.filters) : [];

    if (args.savedSearchId) {
      const obj = await savedObjects.get('search', args.savedSearchId);
      const search = obj.attributes.kibanaSavedObjectMeta as { searchSourceJSON: string };
      const data = JSON.parse(search.searchSourceJSON) as { query: string; filter: any[] };
      queries = queries.concat(data.query);
      filters = filters.concat(data.filter);
    }

    if (context && context.query) {
      queries = queries.concat(context.query);
    }

    if (context && context.filters) {
      filters = filters.concat(context.filters).filter((f: any) => !f.meta.disabled);
    }

    const timeRange = args.timeRange
      ? JSON.parse(args.timeRange)
      : context
      ? context.timeRange
      : undefined;

    return {
      type: 'kibana_context',
      query: queries,
      filters,
      timeRange,
    };
  },
});
