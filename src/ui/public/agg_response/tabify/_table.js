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

/**
 * Simple table class that is used to contain the rows and columns that create
 * a table. This is usually found at the root of the response or within a TableGroup
 */
function TabifyTable() {
  this.columns = null; // written with the first row
  this.rows = [];
}

TabifyTable.prototype.title = function () {
  if (this.$parent) {
    return this.$parent.title;
  } else {
    return '';
  }
};

TabifyTable.prototype.aggConfig = function (col) {
  if (!col.aggConfig) {
    throw new TypeError('Column is missing the aggConfig property');
  }
  return col.aggConfig;
};

TabifyTable.prototype.field = function (col) {
  return this.aggConfig(col).getField();
};

TabifyTable.prototype.fieldFormatter = function (col) {
  return this.aggConfig(col).fieldFormatter();
};


export { TabifyTable };
