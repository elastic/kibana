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

export function tabifyGetColumns(aggs, minimal, hierarchical) {

  if (minimal == null) minimal = !hierarchical;

  // pick the columns
  if (minimal) {
    return aggs.map(function (agg) {
      return { aggConfig: agg };
    });
  }

  // supposed to be bucket,...metrics,bucket,...metrics
  const columns = [];

  // seperate the metrics
  const grouped = _.groupBy(aggs, function (agg) {
    return agg.schema.group;
  });

  if (!grouped.buckets) {
    // return just the metrics, in column format
    return grouped.metrics.map(function (agg) {
      return { aggConfig: agg };
    });
  }

  // return the buckets, and after each place all of the metrics
  grouped.buckets.forEach(function (agg) {
    columns.push({ aggConfig: agg });
    grouped.metrics.forEach(function (metric) {
      columns.push({ aggConfig: metric });
    });
  });

  return columns;
}
