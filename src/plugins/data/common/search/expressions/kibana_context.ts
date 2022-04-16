/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniqBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, ExecutionContext } from '@kbn/expressions-plugin/common';
import { Adapters } from '@kbn/inspector-plugin/common';
import { Filter } from '@kbn/es-query';
import { Query, uniqFilters } from '@kbn/es-query';
import { unboxExpressionValue } from '@kbn/expressions-plugin/common';
import { SavedObjectReference } from '@kbn/core/types';
import { ExecutionContextSearch, KibanaContext, KibanaFilter } from './kibana_context_type';
import { KibanaQueryOutput } from './kibana_context_type';
import { KibanaTimerangeOutput } from './timerange';
import { SavedObjectsClientCommon } from '../..';

export interface KibanaContextStartDependencies {
  savedObjectsClient: SavedObjectsClientCommon;
}

interface Arguments {
  q?: KibanaQueryOutput | null;
  filters?: KibanaFilter[] | null;
  timeRange?: KibanaTimerangeOutput | null;
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

export const getKibanaContextFn = (
  getStartDependencies: (
    getKibanaRequest: ExecutionContext['getKibanaRequest']
  ) => Promise<KibanaContextStartDependencies>
) => {
  const kibanaContextFunction: ExpressionFunctionKibanaContext = {
    name: 'kibana_context',
    type: 'kibana_context',
    inputTypes: ['kibana_context', 'null'],
    help: i18n.translate('data.search.functions.kibana_context.help', {
      defaultMessage: 'Updates kibana global context',
    }),
    args: {
      q: {
        types: ['kibana_query', 'null'],
        aliases: ['query', '_'],
        default: null,
        help: i18n.translate('data.search.functions.kibana_context.q.help', {
          defaultMessage: 'Specify Kibana free form text query',
        }),
      },
      filters: {
        types: ['kibana_filter', 'null'],
        multi: true,
        help: i18n.translate('data.search.functions.kibana_context.filters.help', {
          defaultMessage: 'Specify Kibana generic filters',
        }),
      },
      timeRange: {
        types: ['timerange', 'null'],
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

    extract(state) {
      const references: SavedObjectReference[] = [];
      if (state.savedSearchId.length && typeof state.savedSearchId[0] === 'string') {
        const refName = 'kibana_context.savedSearchId';
        references.push({
          name: refName,
          type: 'search',
          id: state.savedSearchId[0] as string,
        });
        return {
          state: {
            ...state,
            savedSearchId: [refName],
          },
          references,
        };
      }
      return { state, references };
    },

    inject(state, references) {
      const reference = references.find((r) => r.name === 'kibana_context.savedSearchId');
      if (reference) {
        state.savedSearchId[0] = reference.id;
      }
      return state;
    },

    async fn(input, args, { getKibanaRequest }) {
      const { savedObjectsClient } = await getStartDependencies(getKibanaRequest);

      const timeRange = args.timeRange || input?.timeRange;
      let queries = mergeQueries(input?.query, args?.q || []);
      let filters = [
        ...(input?.filters || []),
        ...((args?.filters?.map(unboxExpressionValue) || []) as Filter[]),
      ];

      if (args.savedSearchId) {
        const obj = await savedObjectsClient.get('search', args.savedSearchId);
        const search = (obj.attributes as any).kibanaSavedObjectMeta.searchSourceJSON as string;
        const { query, filter } = getParsedValue(search, {});

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
        filters: uniqFilters(filters.filter((f: any) => !f.meta?.disabled)),
        timeRange,
      };
    },
  };
  return kibanaContextFunction;
};
