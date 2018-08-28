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
import { buildAggBody } from './agg_body';
import createDateAgg from './create_date_agg';

export default function buildRequest(config, tlConfig, scriptedFields) {

  const bool = { must: [] };

  const timeFilter = { range: {} };
  timeFilter.range[config.timefield] = { gte: tlConfig.time.from, lte: tlConfig.time.to, format: 'epoch_millis' };
  bool.must.push(timeFilter);

  // Use the kibana filter bar filters
  if (config.kibana) {
    bool.filter = _.get(tlConfig, 'request.payload.extended.es.filter');
  }

  const aggs = {
    'q': {
      meta: { type: 'split' },
      filters: {
        filters: _.chain(config.q).map(function (q) {
          return [q, { query_string: { query: q } }];
        }).zipObject().value(),
      },
      aggs: {}
    }
  };

  let aggCursor = aggs.q.aggs;

  _.each(config.split, function (clause) {
    clause = clause.split(':');
    if (clause[0] && clause[1]) {
      const termsAgg = buildAggBody(clause[0], scriptedFields);
      termsAgg.size = parseInt(clause[1], 10);
      aggCursor[clause[0]] = {
        meta: { type: 'split' },
        terms: termsAgg,
        aggs: {}
      };
      aggCursor = aggCursor[clause[0]].aggs;
    } else {
      throw new Error ('`split` requires field:limit');
    }
  });

  _.assign(aggCursor, createDateAgg(config, tlConfig, scriptedFields));

  return {
    index: config.index,
    timeout: tlConfig.server.config().get('elasticsearch.shardTimeout') + 'ms',
    body: {
      query: {
        bool: bool
      },
      aggs: aggs,
      size: 0
    }
  };
}
