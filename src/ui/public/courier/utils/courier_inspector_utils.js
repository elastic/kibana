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
function getRequestInspectorStats(searchSource) {
  const stats = {};
  const index = searchSource.get('index');

  if (index) {
    stats['Index Pattern Title'] = {
      value: index.title,
      description: 'The index pattern against which this query was executed.',
    };
    stats ['Index Pattern ID'] = {
      value: index.id,
      description: 'The ID of the saved index pattern object in the .kibana index.',
    };
  }

  return stats;
}

function getResponseInspectorStats(searchSource, resp) {
  const lastRequest = searchSource.history && searchSource.history[searchSource.history.length - 1];
  const stats = {};

  if (resp && resp.took) {
    stats['Query Time'] = {
      value: `${resp.took}ms`,
      description: `The time it took Elasticsearch to process the query.
        This does not include the time it takes to send the request to Elasticsearch
        or parse it in the browser.`,
    };
  }

  if (resp && resp.hits) {
    stats.Hits = {
      value: `${resp.hits.total}`,
      description: 'The total number of documents that matched the query.',
    };
  }

  if (lastRequest && (lastRequest.ms === 0 || lastRequest.ms)) {
    stats['Request time'] = {
      value: `${lastRequest.ms}ms`,
      description: `The time this request took from the browser to Elasticsearch
        and back again. This does not include the time the request waited in the queue
        to be executed.`
    };
  }

  return stats;
}

export { getRequestInspectorStats, getResponseInspectorStats };
