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

import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';

export const kibanaContext = () => ({
  name: 'kibana_context',
  type: 'kibana_context',
  context: {
    types: [
      'kibana_context',
      'null',
    ],
  },
  help: i18n.translate('interpreter.functions.kibana_context.help', {
    defaultMessage: 'Updates kibana global context'
  }),
  args: {
    q: {
      types: ['string', 'null'],
      aliases: ['query', '_'],
      default: null,
    },
    filters: {
      types: ['string', 'null'],
      default: '"[]"',
    },
    timeRange: {
      types: ['string', 'null'],
      default: null,
    },
    savedSearchId: {
      types: ['string', 'null'],
      default: null,
    }
  },
  async fn(context, args) {
    const $injector = await chrome.dangerouslyGetActiveInjector();
    const savedSearches = $injector.get('savedSearches');
    const queryArg = args.q ? JSON.parse(args.q) : [];
    let queries = Array.isArray(queryArg) ? queryArg : [queryArg];
    let filters = args.filters ? JSON.parse(args.filters) : [];

    if (args.savedSearchId) {
      const savedSearch = await savedSearches.get(args.savedSearchId);
      const searchQuery = savedSearch.searchSource.getField('query');
      const searchFilters = savedSearch.searchSource.getField('filter');
      queries = queries.concat(searchQuery);
      filters = filters.concat(searchFilters);
    }

    if (context.query) {
      queries = queries.concat(context.query);
    }

    if (context.filters) {
      filters = filters.concat(context.filters);
    }

    const timeRange = args.timeRange ? JSON.parse(args.timeRange) : context.timeRange;

    return {
      type: 'kibana_context',
      query: queries,
      filters: filters,
      timeRange: timeRange,
    };
  },
});
