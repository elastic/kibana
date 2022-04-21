/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { convertIntervalToUnit } from '../../helpers/unit_to_seconds';
import { SERIES_SEPARATOR } from '../../../../../common/constants';

const percentileValueMatch = /\[([0-9\.]+)\]$/;
import { startsWith, flatten, values, first, last } from 'lodash';
import { getDefaultDecoration, getSiblingAggValue, getSplits, mapEmptyToZero } from '../../helpers';
import { evaluate } from '@kbn/tinymath';

export function mathAgg(resp, panel, series, meta, extractFields) {
  return (next) => async (results) => {
    const mathMetric = last(series.metrics);
    if (mathMetric.type !== 'math') return next(results);
    // Filter the results down to only the ones that match the series.id. Sometimes
    // there will be data from other series mixed in.
    results = results.filter((s) => {
      if (s.id.split(SERIES_SEPARATOR)[0] === series.id) {
        return false;
      }
      return true;
    });
    const decoration = getDefaultDecoration(series);
    const splits = await getSplits(resp, panel, series, meta, extractFields);
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
            acc[v.name] = mapEmptyToZero(m, split.timeseries.buckets);
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
            const inMsInterval = convertIntervalToUnit(split.meta?.intervalString || 0, 'ms');

            const result = evaluate(mathMetric.script, {
              params: {
                ...params,
                _index: index,
                _timestamp: ts,
                _all: all,
                _interval: inMsInterval?.value,
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
