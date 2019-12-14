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

function getRequestInspectorStats(searchSource) {
  const stats = {};
  const index = searchSource.getField('index');

  if (index) {
    stats.indexPattern = {
      label: i18n.translate('common.ui.courier.indexPatternLabel', {
        defaultMessage: 'Index pattern',
      }),
      value: index.title,
      description: i18n.translate('common.ui.courier.indexPatternDescription', {
        defaultMessage: 'The index pattern that connected to the Elasticsearch indices.',
      }),
    };
    stats.indexPatternId = {
      label: i18n.translate('common.ui.courier.indexPatternIdLabel', {
        defaultMessage: 'Index pattern ID',
      }),
      value: index.id,
      description: i18n.translate('common.ui.courier.indexPatternIdDescription', {
        defaultMessage: 'The ID in the {kibanaIndexPattern} index.',
        values: { kibanaIndexPattern: '.kibana' },
      }),
    };
  }

  return stats;
}
function getResponseInspectorStats(searchSource, resp) {
  const lastRequest = searchSource.history && searchSource.history[searchSource.history.length - 1];
  const stats = {};

  if (resp && resp.took) {
    stats.queryTime = {
      label: i18n.translate('common.ui.courier.queryTimeLabel', {
        defaultMessage: 'Query time',
      }),
      value: i18n.translate('common.ui.courier.queryTimeValue', {
        defaultMessage: '{queryTime}ms',
        values: { queryTime: resp.took },
      }),
      description: i18n.translate('common.ui.courier.queryTimeDescription', {
        defaultMessage:
          'The time it took to process the query. ' +
          'Does not include the time to send the request or parse it in the browser.',
      }),
    };
  }

  if (resp && resp.hits) {
    stats.hitsTotal = {
      label: i18n.translate('common.ui.courier.hitsTotalLabel', {
        defaultMessage: 'Hits (total)',
      }),
      value: `${resp.hits.total}`,
      description: i18n.translate('common.ui.courier.hitsTotalDescription', {
        defaultMessage: 'The number of documents that match the query.',
      }),
    };

    stats.hits = {
      label: i18n.translate('common.ui.courier.hitsLabel', {
        defaultMessage: 'Hits',
      }),
      value: `${resp.hits.hits.length}`,
      description: i18n.translate('common.ui.courier.hitsDescription', {
        defaultMessage: 'The number of documents returned by the query.',
      }),
    };
  }

  if (lastRequest && (lastRequest.ms === 0 || lastRequest.ms)) {
    stats.requestTime = {
      label: i18n.translate('common.ui.courier.requestTimeLabel', {
        defaultMessage: 'Request time',
      }),
      value: i18n.translate('common.ui.courier.requestTimeValue', {
        defaultMessage: '{requestTime}ms',
        values: { requestTime: lastRequest.ms },
      }),
      description: i18n.translate('common.ui.courier.requestTimeDescription', {
        defaultMessage:
          'The time of the request from the browser to Elasticsearch and back. ' +
          'Does not include the time the requested waited in the queue.',
      }),
    };
  }

  return stats;
}

export { getRequestInspectorStats, getResponseInspectorStats };
