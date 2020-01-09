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

/**
 * This function collects statistics from a SearchSource and a response
 * for the usage in the inspector stats panel. Pass in a searchSource and a response
 * and the returned object can be passed to the `stats` method of the request
 * logger.
 */

import { i18n } from '@kbn/i18n';
import { SearchResponse } from 'elasticsearch';
import { ISearchSource, RequestInspectorStats } from '../types';

export function getRequestInspectorStats(searchSource: ISearchSource) {
  const stats: RequestInspectorStats = {};
  const index = searchSource.getField('index');

  if (index) {
    stats.indexPattern = {
      label: i18n.translate('data.search.searchSource.indexPatternLabel', {
        defaultMessage: 'Index pattern',
      }),
      value: index.title,
      description: i18n.translate('data.search.searchSource.indexPatternDescription', {
        defaultMessage: 'The index pattern that connected to the Elasticsearch indices.',
      }),
    };
    stats.indexPatternId = {
      label: i18n.translate('data.search.searchSource.indexPatternIdLabel', {
        defaultMessage: 'Index pattern ID',
      }),
      value: index.id!,
      description: i18n.translate('data.search.searchSource.indexPatternIdDescription', {
        defaultMessage: 'The ID in the {kibanaIndexPattern} index.',
        values: { kibanaIndexPattern: '.kibana' },
      }),
    };
  }

  return stats;
}

export function getResponseInspectorStats(
  searchSource: ISearchSource,
  resp: SearchResponse<unknown>
) {
  const lastRequest = searchSource.history && searchSource.history[searchSource.history.length - 1];
  const stats: RequestInspectorStats = {};

  if (resp && resp.took) {
    stats.queryTime = {
      label: i18n.translate('data.search.searchSource.queryTimeLabel', {
        defaultMessage: 'Query time',
      }),
      value: i18n.translate('data.search.searchSource.queryTimeValue', {
        defaultMessage: '{queryTime}ms',
        values: { queryTime: resp.took },
      }),
      description: i18n.translate('data.search.searchSource.queryTimeDescription', {
        defaultMessage:
          'The time it took to process the query. ' +
          'Does not include the time to send the request or parse it in the browser.',
      }),
    };
  }

  if (resp && resp.hits) {
    stats.hitsTotal = {
      label: i18n.translate('data.search.searchSource.hitsTotalLabel', {
        defaultMessage: 'Hits (total)',
      }),
      value: `${resp.hits.total}`,
      description: i18n.translate('data.search.searchSource.hitsTotalDescription', {
        defaultMessage: 'The number of documents that match the query.',
      }),
    };

    stats.hits = {
      label: i18n.translate('data.search.searchSource.hitsLabel', {
        defaultMessage: 'Hits',
      }),
      value: `${resp.hits.hits.length}`,
      description: i18n.translate('data.search.searchSource.hitsDescription', {
        defaultMessage: 'The number of documents returned by the query.',
      }),
    };
  }

  if (lastRequest && (lastRequest.ms === 0 || lastRequest.ms)) {
    stats.requestTime = {
      label: i18n.translate('data.search.searchSource.requestTimeLabel', {
        defaultMessage: 'Request time',
      }),
      value: i18n.translate('data.search.searchSource.requestTimeValue', {
        defaultMessage: '{requestTime}ms',
        values: { requestTime: lastRequest.ms },
      }),
      description: i18n.translate('data.search.searchSource.requestTimeDescription', {
        defaultMessage:
          'The time of the request from the browser to Elasticsearch and back. ' +
          'Does not include the time the requested waited in the queue.',
      }),
    };
  }

  return stats;
}
