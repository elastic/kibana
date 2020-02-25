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

export function timeBucketsToPairs(buckets) {
  const timestamps = _.pluck(buckets, 'key');
  const series = {};
  _.each(buckets, function(bucket) {
    _.forOwn(bucket, function(val, key) {
      if (_.isPlainObject(val)) {
        if (val.values) {
          _.forOwn(val.values, function(bucketValue, bucketKey) {
            const k = key + ':' + bucketKey;
            const v = isNaN(bucketValue) ? NaN : bucketValue;
            series[k] = series[k] || [];
            series[k].push(v);
          });
        } else {
          series[key] = series[key] || [];
          series[key].push(val.value);
        }
      }
    });
  });

  return _.mapValues(series, function(values) {
    return _.zip(timestamps, values);
  });
}

export function flattenBucket(bucket, splitKey, path, result) {
  result = result || {};
  path = path || [];
  _.forOwn(bucket, function(val, key) {
    if (!_.isPlainObject(val)) return;
    if (_.get(val, 'meta.type') === 'split') {
      _.each(val.buckets, function(bucket, bucketKey) {
        if (bucket.key == null) bucket.key = bucketKey; // For handling "keyed" response formats, e.g., filters agg
        flattenBucket(bucket, bucket.key, path.concat([key + ':' + bucket.key]), result);
      });
    } else if (_.get(val, 'meta.type') === 'time_buckets') {
      const metrics = timeBucketsToPairs(val.buckets);
      _.each(metrics, function(pairs, metricName) {
        result[path.concat([metricName]).join(' > ')] = {
          data: pairs,
          splitKey: splitKey,
        };
      });
    }
  });
  return result;
}

export default function toSeriesList(aggs, config) {
  return _.map(flattenBucket(aggs), function(metrics, name) {
    return {
      data: metrics.data,
      type: 'series',
      fit: config.fit,
      label: name,
      split: metrics.splitKey,
    };
  });
}
