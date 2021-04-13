/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { buildAggBody } from './agg_body';
import { search } from '../../../../../../plugins/data/server';
const { dateHistogramInterval } = search.aggs;

export default function createDateAgg(config, tlConfig, scriptedFields) {
  const dateAgg = {
    time_buckets: {
      meta: { type: 'time_buckets' },
      date_histogram: {
        field: config.timefield,
        time_zone: tlConfig.time.timezone,
        extended_bounds: {
          min: tlConfig.time.from,
          max: tlConfig.time.to,
        },
        min_doc_count: 0,
        ...dateHistogramInterval(config.interval),
      },
    },
  };

  dateAgg.time_buckets.aggs = {};
  _.each(config.metric, function (metric) {
    const [metricName, metricArgs] = metric.split(/:(.+)/);
    if (metricName === 'count') {
      // This is pretty lame, but its how the "doc_count" metric has to be implemented at the moment
      // It simplifies the aggregation tree walking code considerably
      dateAgg.time_buckets.aggs[metricName] = {
        bucket_script: {
          buckets_path: '_count',
          script: { source: '_value', lang: 'expression' },
        },
      };
    } else if (metricName && metricArgs) {
      const [field, percentArgs] = metricArgs.split(/:(\d.*)/);
      const metricKey = metricName + '(' + field + ')';

      _.assign(dateAgg.time_buckets.aggs, {
        [metricKey]: { [metricName]: buildAggBody(field, scriptedFields) },
      });

      if (metricName === 'percentiles' && percentArgs) {
        let percentList = percentArgs.split(',');
        percentList = percentList.map((x) => parseFloat(x));
        dateAgg.time_buckets.aggs[metricKey][metricName].percents = percentList;
      }
    } else {
      throw new Error('`metric` requires metric:field or simply count');
    }
  });

  return dateAgg;
}
