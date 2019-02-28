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

export default function createDateAgg(config, tlConfig, scriptedFields) {
  const dateAgg = {
    time_buckets: {
      meta: { type: 'time_buckets' },
      date_histogram: {
        field: config.timefield,
        interval: config.interval,
        time_zone: tlConfig.time.timezone,
        extended_bounds: {
          min: tlConfig.time.from,
          max: tlConfig.time.to
        },
        min_doc_count: 0
      }
    }
  };

  dateAgg.time_buckets.aggs = {};
  _.each(config.metric, function (metric) {
    metric = metric.split(':');
    if (metric[0] === 'count') {
      // This is pretty lame, but its how the "doc_count" metric has to be implemented at the moment
      // It simplifies the aggregation tree walking code considerably
      dateAgg.time_buckets.aggs[metric] = {
        bucket_script: {
          buckets_path: '_count',
          script: { source: '_value', lang: 'expression' }
        }
      };
    } else if (metric[0] && metric[1]) {
      const metricName = metric[0] + '(' + metric[1] + ')';
      dateAgg.time_buckets.aggs[metricName] = {};
      dateAgg.time_buckets.aggs[metricName][metric[0]] = buildAggBody(metric[1], scriptedFields);
      if (metric[0] === 'percentiles' && metric[2]) {
        let percentList = metric[2].split(',');
        percentList = percentList.map(x => parseFloat(x));
        dateAgg.time_buckets.aggs[metricName][metric[0]].percents = percentList;
      }
    } else {
      throw new Error ('`metric` requires metric:field or simply count');
    }
  });

  return dateAgg;
}
