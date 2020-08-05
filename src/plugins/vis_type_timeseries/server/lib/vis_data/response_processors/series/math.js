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

const percentileValueMatch = /\[([0-9\.]+)\]$/;
import { startsWith, flatten, values, first, last } from 'lodash';
import { getDefaultDecoration } from '../../helpers/get_default_decoration';
import { getSiblingAggValue } from '../../helpers/get_sibling_agg_value';
import { getSplits } from '../../helpers/get_splits';
import { mapBucket } from '../../helpers/map_bucket';
import { evaluate } from 'tinymath';

export function mathAgg(resp, panel, series, meta) {
  return (next) => (results) => {
    const mathMetric = last(series.metrics);
    if (mathMetric.type !== 'math') return next(results);
    // Filter the results down to only the ones that match the series.id. Sometimes
    // there will be data from other series mixed in.
    results = results.filter((s) => {
      if (s.id.split(/:/)[0] === series.id) {
        return false;
      }
      return true;
    });
    const decoration = getDefaultDecoration(series);
    const splits = getSplits(resp, panel, series, meta);
    const mathSeries = splits.map((split) => {
      if (mathMetric.variables.length) {
        // Gather the data for the splits. The data will either be a sibling agg or
        // a standard metric/pipeline agg
        const splitData = mathMetric.variables.reduce((acc, v) => {
          const metric = series.metrics.find((m) => startsWith(v.field, m.id));
          if (!metric) return acc;
          if (/_bucket$/.test(metric.type)) {
            acc[v.name] = split.timeseries.buckets.map((bucket) => {
              return [bucket.key, getSiblingAggValue(split, metric)];
            });
          } else {
            const percentileMatch = v.field.match(percentileValueMatch);
            const m = percentileMatch ? { ...metric, percent: percentileMatch[1] } : { ...metric };
            acc[v.name] = split.timeseries.buckets.map(mapBucket(m));
          }
          return acc;
        }, {});
        // Create an params._all so the users can access the entire series of data
        // in the Math.js equation
        const all = Object.keys(splitData).reduce((acc, key) => {
          acc[key] = {
            values: splitData[key].map((x) => x[1]),
            timestamps: splitData[key].map((x) => x[0]),
          };
          return acc;
        }, {});
        // Get the first var and check that it shows up in the split data otherwise
        // we need to return an empty array for the data since we can't operate
        // without the first variable
        const firstVar = first(mathMetric.variables);
        if (!splitData[firstVar.name]) {
          return {
            id: split.id,
            label: split.label,
            color: split.color,
            data: [],
            ...decoration,
          };
        }
        // Use the first var to collect all the timestamps
        const timestamps = splitData[firstVar.name].map((r) => first(r));
        // Map the timestamps to actual data
        const data = timestamps.map((ts, index) => {
          const params = mathMetric.variables.reduce((acc, v) => {
            acc[v.name] = last(splitData[v.name].find((row) => row[0] === ts));
            return acc;
          }, {});
          // If some of the values are null, return the timestamp and null, this is
          // a safety check for the user
          const someNull = values(params).some((v) => v == null);
          if (someNull) return [ts, null];
          try {
            // calculate the result based on the user's script and return the value
            const result = evaluate(mathMetric.script, {
              params: {
                ...params,
                _index: index,
                _timestamp: ts,
                _all: all,
                _interval: split.meta.bucketSize * 1000,
              },
            });
            // if the result is an object (usually when the user is working with maps and functions) flatten the results and return the last value.
            if (typeof result === 'object') {
              return [ts, last(flatten(result.valueOf()))];
            }
            return [ts, result];
          } catch (e) {
            if (e.message === 'Cannot divide by 0') {
              // Drop division by zero errors and treat as null value
              return [ts, null];
            }
            throw e;
          }
        });
        return {
          id: split.id,
          label: split.label,
          color: split.color,
          data,
          ...decoration,
        };
      }
    });
    return next(results.concat(mathSeries));
  };
}
