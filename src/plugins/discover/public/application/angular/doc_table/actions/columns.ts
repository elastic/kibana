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
 * Helper function to provide a fallback to a single _source column if the given array of columns
 * is empty, and removes _source if there are more than 1 columns given
 * @param columns
 */
function buildColumns(columns: string[]) {
  if (columns.length > 1 && columns.indexOf('_source') !== -1) {
    return columns.filter((col) => col !== '_source');
  } else if (columns.length !== 0) {
    return columns;
  }
  return ['_source'];
}

export function addColumn(columns: string[], columnName: string) {
  if (columns.includes(columnName)) {
    return columns;
  }
  return buildColumns([...columns, columnName]);
}

export function removeColumn(columns: string[], columnName: string) {
  if (!columns.includes(columnName)) {
    return columns;
  }
  return buildColumns(columns.filter((col) => col !== columnName));
}

export function moveColumn(columns: string[], columnName: string, newIndex: number) {
  if (newIndex < 0 || newIndex >= columns.length || !columns.includes(columnName)) {
    return columns;
  }
  const modifiedColumns = [...columns];
  modifiedColumns.splice(modifiedColumns.indexOf(columnName), 1); // remove at old index
  modifiedColumns.splice(newIndex, 0, columnName); // insert before new index
  return modifiedColumns;
}
