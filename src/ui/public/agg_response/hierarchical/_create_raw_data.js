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
import { extractBuckets } from './_extract_buckets';

export function createRawData(vis, resp) {

  // Create the initial results structure
  const results = { rows: [] };

  // Create a reference to the buckets and metrics
  const metrics = vis.getAggConfig().bySchemaGroup.metrics;
  const buckets = vis.getAggConfig().bySchemaGroup.buckets;
  const aggs = [];

  if (buckets) {
    _.each(buckets, function (bucket) {
      aggs.push(bucket);
      aggs.push(metrics);
    });
  } else {
    aggs.push(metrics);
  }

  // Create the columns
  results.columns = _(aggs)
    .flattenDeep()
    .map(function (agg) {
      return {
        categoryName: agg.schema.name,
        id: agg.id,
        aggConfig: agg,
        aggType: agg.type,
        field: agg.params.field,
        label: agg.makeLabel()
      };
    })
    .value();


  // if there are no buckets then we need to just set the value and return
  if (!buckets) {
    const value = resp.aggregations
      && resp.aggregations[metrics[0].id]
      && resp.aggregations[metrics[0].id].value
      || resp.hits.total;
    results.rows.push([value]);
    return results;
  }

  /**
   * Walk the buckets and create records for each leaf
   * @param {aggConfig} agg The aggConfig for the current level
   * @param {object} data The aggergation object
   * @param {array} [record] The record that will eventually get pushed to the rows
   * @returns {void}
   */
  function walkBuckets(agg, data, record) {
    if (!data) return;
    if (!Array.isArray(record)) {
      record = [];
    }

    // iterate through all the buckets
    _.each(extractBuckets(data[agg.id], agg), function (bucket) {

      const _record = _.flattenDeep([record, bucket.key]);
      _.each(metrics, function (metric) {
        let value = bucket.doc_count;
        if (bucket[metric.id] && !_.isUndefined(bucket[metric.id].value)) {
          value = bucket[metric.id].value;
        }
        _record.push(value);
      });

      // If there is another agg to call we need to check to see if it has
      // buckets. If it does then we need to keep on walking the tree.
      // This is where the recursion happens.
      if (agg._next) {
        const nextBucket = bucket[agg._next.id];
        if (nextBucket && nextBucket.buckets) {
          walkBuckets(agg._next, bucket, _record);
        }
      }
      // if there are no more aggs to walk then  push the record to the rows.
      else {
        results.rows.push(_record);
      }
    });
  }

  // Start walking the buckets at the beginning of the aggregations object.
  walkBuckets(buckets[0], resp.aggregations);

  return results;
}
