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
import {
  KibanaContext,
  ExpressionFunctionDefinition,
} from '../../../../../plugins/expressions/public';

import { getSearchService, getUiSettings } from '../../services';
import { EsRawResponse } from './es_raw_response';
import { RequestStatistics, RequestAdapter } from '../../../../inspector/common';
import { IEsSearchResponse } from '../../../common/search/es_search';
import { buildEsQuery, getEsQueryConfig } from '../../../common/es_query/es_query';
import { DataPublicPluginStart } from '../../types';

const name = 'esdsl';

type Input = KibanaContext | null;
type Output = Promise<EsRawResponse>;

interface Arguments {
  dsl: string;
  index: string;
  size: number;
}

export type EsdslExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof name,
  Input,
  Arguments,
  Output
>;

export const esdsl = (): EsdslExpressionFunctionDefinition => ({
  name,
  type: 'es_raw_response',
  inputTypes: ['kibana_context', 'null'],
  help: i18n.translate('data.search.esdsl.help', {
    defaultMessage: 'Run Elasticsearch request',
  }),
  args: {
    dsl: {
      types: ['string'],
      aliases: ['_', 'q', 'query'],
      help: i18n.translate('data.search.esdsl.q.help', {
        defaultMessage: 'Query DSL',
      }),
      required: true,
    },
    index: {
      types: ['string'],
      help: i18n.translate('data.search.esdsl.index.help', {
        defaultMessage: 'ElasticSearch index to query',
      }),
      required: true,
    },
    size: {
      types: ['number'],
      help: i18n.translate('data.search.esdsl.size.help', {
        defaultMessage: 'ElasticSearch searchAPI size parameter',
      }),
      default: 10,
    },
  },
  async fn(input, args, { inspectorAdapters, abortSignal }) {
    const searchService: DataPublicPluginStart['search'] = getSearchService();

    const dsl = JSON.parse(args.dsl);

    if (input) {
      const esQueryConfigs = getEsQueryConfig(getUiSettings());
      const query = buildEsQuery(
        undefined, //        args.index,
        input.query || [],
        input.filters || [],
        esQueryConfigs
      );

      if (!dsl.query) {
        dsl.query = query;
      } else {
        query.bool.must.push(dsl.query);
        dsl.query = query;
      }
    }

    if (!inspectorAdapters.requests) {
      inspectorAdapters.requests = new RequestAdapter();
    }

    const request = inspectorAdapters.requests.start(
      i18n.translate('data.search.dataRequest.title', {
        defaultMessage: 'Data',
      }),
      {
        description: i18n.translate('data.search.es_search.dataRequest.description', {
          defaultMessage:
            'This request queries Elasticsearch to fetch the data for the visualization.',
        }),
      }
    );

    request.stats({
      indexPattern: {
        label: i18n.translate('data.search.es_search.indexPatternLabel', {
          defaultMessage: 'Index pattern',
        }),
        value: args.index,
        description: i18n.translate('data.search.es_search.indexPatternDescription', {
          defaultMessage: 'The index pattern that connected to the Elasticsearch indices.',
        }),
      },
    });

    let res: IEsSearchResponse;
    try {
      res = await searchService
        .search(
          {
            params: {
              index: args.index,
              size: args.size,
              body: dsl,
            },
          },
          { signal: abortSignal }
        )
        .toPromise();

      const stats: RequestStatistics = {};
      const resp = res.rawResponse;

      if (resp && resp.took) {
        stats.queryTime = {
          label: i18n.translate('data.search.es_search.queryTimeLabel', {
            defaultMessage: 'Query time',
          }),
          value: i18n.translate('data.search.es_search.queryTimeValue', {
            defaultMessage: '{queryTime}ms',
            values: { queryTime: resp.took },
          }),
          description: i18n.translate('data.search.es_search.queryTimeDescription', {
            defaultMessage:
              'The time it took to process the query. ' +
              'Does not include the time to send the request or parse it in the browser.',
          }),
        };
      }

      if (resp && resp.hits) {
        stats.hitsTotal = {
          label: i18n.translate('data.search.es_search.hitsTotalLabel', {
            defaultMessage: 'Hits (total)',
          }),
          value: `${resp.hits.total}`,
          description: i18n.translate('data.search.es_search.hitsTotalDescription', {
            defaultMessage: 'The number of documents that match the query.',
          }),
        };

        stats.hits = {
          label: i18n.translate('data.search.es_search.hitsLabel', {
            defaultMessage: 'Hits',
          }),
          value: `${resp.hits.hits.length}`,
          description: i18n.translate('data.search.es_search.hitsDescription', {
            defaultMessage: 'The number of documents returned by the query.',
          }),
        };
      }

      request.stats(stats).ok({ json: resp });
      request.json(dsl);

      return {
        type: 'es_raw_response',
        body: resp,
      };
    } catch (e) {
      request.error({ json: e });
      throw e;
    }
  },
});
