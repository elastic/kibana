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

import { groupBy } from 'lodash';
import { IAggConfig } from '../aggs';
import { TabbedAggColumn } from './types';

const getColumn = (agg: IAggConfig, i: number): TabbedAggColumn => {
  let name = '';
  try {
    name = agg.makeLabel();
  } catch (e) {
    // skip the case when makeLabel throws an error (e.x. no appropriate field for an aggregation)
  }

  return {
    aggConfig: agg,
    id: `col-${i}-${agg.id}`,
    name,
  };
};

/**
 * Builds tabify columns.
 *
 * @param {AggConfigs} aggs - the agg configs object to which the aggregation response correlates
 * @param {boolean} minimalColumns - setting to true will only return a column for the last bucket/metric instead of one for each level
 */
export function tabifyGetColumns(aggs: IAggConfig[], minimalColumns: boolean): TabbedAggColumn[] {
  // pick the columns
  if (minimalColumns) {
    return aggs.map((agg, i) => getColumn(agg, i));
  }

  // supposed to be bucket,...metrics,bucket,...metrics
  const columns: TabbedAggColumn[] = [];

  // separate the metrics
  const grouped = groupBy(aggs, (agg) => {
    return agg.type.type;
  });

  if (!grouped.buckets) {
    // return just the metrics, in column format
    return grouped.metrics.map((agg, i) => getColumn(agg, i));
  }

  let columnIndex = 0;
  // return the buckets, and after each place all of the metrics
  grouped.buckets.forEach((agg) => {
    columns.push(getColumn(agg, columnIndex++));
    grouped.metrics.forEach((metric) => {
      columns.push(getColumn(metric, columnIndex++));
    });
  });

  return columns;
}
