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

import { tabifyGetColumns } from './_get_columns';

/**
 * Writer class that collects information about an aggregation response and
 * produces a table, or a series of tables.
 *
 * @param {Vis} vis - the vis object to which the aggregation response correlates
 */
function TabbedAggResponseWriter(aggs, opts) {
  this.opts = opts || {};
  this.rowBuffer = {};
  this.bucketBuffer = [];

  // by default minimalColumns is set to true
  this.opts.minimalColumns = !(this.opts.minimalColumns === false);

  this.aggs = aggs;
  this.columns = tabifyGetColumns(aggs, this.opts.minimalColumns);
  this.aggStack = [...this.columns];

  this.rows = [];
}

/**
 * Create a new row by reading the row buffer and bucketBuffer
 */
TabbedAggResponseWriter.prototype.row = function () {
  this.bucketBuffer.forEach(bucket => {
    this.rowBuffer[bucket.id] = bucket.value;
  });

  this.rows.push(this.rowBuffer);
  this.rowBuffer = {};
};

/**
 * Get the actual response
 *
 * @return {object} - the final table-tree
 */
TabbedAggResponseWriter.prototype.response = function () {
  return {
    columns: this.columns,
    rows: this.rows
  };
};

export { TabbedAggResponseWriter };
