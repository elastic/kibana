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

import { toArray } from 'lodash';
import { tabifyGetColumns } from './_get_columns';

/**
 * Writer class that collects information about an aggregation response and
 * produces a table, or a series of tables.
 *
 * @param {AggConfigs} aggs - the agg configs object to which the aggregation response correlates
 * @param {boolean} metricsAtAllLevels - setting to true will produce metrics for every bucket
 * @param {boolean} partialRows - setting to true will not remove rows with missing values
 * @param {Object} timeRange - time range object, if provided
 */
function TabbedAggResponseWriter(
  aggs,
  { metricsAtAllLevels = false, partialRows = false, timeRange } = {}
) {
  // Private
  this._removePartialRows = !partialRows;

  // Public
  this.rowBuffer = {};
  this.bucketBuffer = [];
  this.metricBuffer = [];
  this.aggs = aggs;
  this.partialRows = partialRows;
  this.columns = tabifyGetColumns(aggs.getResponseAggs(), !metricsAtAllLevels);
  this.aggStack = [...this.columns];
  this.rows = [];
  // Extract the time range object if provided
  if (timeRange) {
    const timeRangeKey = Object.keys(timeRange)[0];
    this.timeRange = timeRange[timeRangeKey];
    if (this.timeRange) {
      this.timeRange.name = timeRangeKey;
    }
  }
}

TabbedAggResponseWriter.prototype.isPartialRow = function(row) {
  return !this.columns.map(column => row.hasOwnProperty(column.id)).every(c => c === true);
};

/**
 * Create a new row by reading the row buffer and bucketBuffer
 */
TabbedAggResponseWriter.prototype.row = function() {
  this.bucketBuffer.forEach(bucket => {
    this.rowBuffer[bucket.id] = bucket.value;
  });

  this.metricBuffer.forEach(metric => {
    this.rowBuffer[metric.id] = metric.value;
  });

  if (
    !toArray(this.rowBuffer).length ||
    (this._removePartialRows && this.isPartialRow(this.rowBuffer))
  ) {
    return;
  }

  this.rows.push(this.rowBuffer);
  this.rowBuffer = {};
};

/**
 * Get the actual response
 *
 * @return {object} - the final table
 */
TabbedAggResponseWriter.prototype.response = function() {
  return {
    columns: this.columns,
    rows: this.rows,
  };
};

export { TabbedAggResponseWriter };
