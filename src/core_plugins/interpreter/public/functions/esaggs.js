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

import _ from 'lodash';
import { CourierRequestHandlerProvider } from 'ui/vis/request_handlers/courier';
import { AggConfigs } from 'ui/vis/agg_configs';

// need to get rid of angular from these
import { IndexPatternsProvider } from 'ui/index_patterns';
import { SearchSourceProvider } from 'ui/courier/search_source';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';

import chrome from 'ui/chrome';

const courierRequestHandlerProvider = CourierRequestHandlerProvider;
const courierRequestHandler = courierRequestHandlerProvider().handler;

export default () => ({
  name: 'esaggs',
  type: 'kibana_table',
  context: {
    types: [
      'kibana_context',
      'null',
    ],
  },
  help: 'Run AggConfig aggregation.',
  args: {
    index: {
      types: ['string', 'null'],
      default: null,
    },
    metricsOnAllLevels: {
      types: ['bool', 'null'],
      default: false,
    },
    partialRows: {
      types: ['bool', 'null'],
      default: false,
    },
    aggConfigs: {
      types: ['string'],
      default: '""',
      help: 'AggConfig definition',
      multi: false,
    },
  },
  fn(context, args, handlers) {
    return chrome.dangerouslyGetActiveInjector().then(async $injector => {
      const Private = $injector.get('Private');
      const indexPatterns = Private(IndexPatternsProvider);
      const SearchSource = Private(SearchSourceProvider);
      const queryFilter = Private(FilterBarQueryFilterProvider);

      const aggConfigsState = JSON.parse(args.aggConfigs);
      const indexPattern = await indexPatterns.get(args.index);
      const aggs = new AggConfigs(indexPattern, aggConfigsState);

      // we should move searchSource creation inside courier request handler
      const searchSource = new SearchSource();
      searchSource.setField('index', indexPattern);

      const response = await courierRequestHandler({
        searchSource: searchSource,
        aggs: aggs,
        timeRange: _.get(context, 'timeRange', null),
        query: _.get(context, 'query', null),
        filters: _.get(context, 'filters', null),
        forceFetch: true,
        isHierarchical: args.metricsOnAllLevels,
        showPartial: args.partialRows,
        inspectorAdapters: handlers.inspectorAdapters,
        queryFilter,
      });

      return {
        type: 'kibana_table',
        index: args.index,
        ...response,
      };

    });
  },
});
