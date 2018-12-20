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

import { get, findLastIndex } from 'lodash';
import AggConfigResult from 'ui/vis/agg_config_result';

/**
 * Takes an array of tabified rows and splits them by column value:
 *
 * const rows = [
 *   { col-1: 'foo', col-2: 'X' },
 *   { col-1: 'bar', col-2: 50 },
 *   { col-1: 'baz', col-2: 'X' },
 * ];
 * const splitRows = splitRowsOnColumn(rows, 'col-2');
 * splitRows.results; // ['X', 50];
 * splitRows.rowsGroupedByResult; // { X: [{ col-1: 'foo' }, { col-1: 'baz' }], 50: [{ col-1: 'bar' }] }
 */
export function splitRowsOnColumn(rows, columnId) {
  const resultsMap = {}; // Used to preserve types, since object keys are always converted to strings.
  return {
    rowsGroupedByResult: rows.reduce((acc, row) => {
      const { [columnId]: splitValue, ...rest } = row;
      resultsMap[splitValue] = splitValue;
      acc[splitValue] = [...(acc[splitValue] || []), rest];
      return acc;
    }, {}),
    results: Object.values(resultsMap),
  };
}

export function splitTable(columns, rows, $parent) {
  const splitColumn = columns.find(column => get(column, 'aggConfig.schema.name') === 'split');

  if (!splitColumn) {
    return [{
      $parent,
      columns: columns.map(column => ({ title: column.name, ...column })),
      rows: rows.map((row, rowIndex) => {
        return columns.map(column => {
          const aggConfigResult = new AggConfigResult(column.aggConfig, $parent, row[column.id], row[column.id]);
          aggConfigResult.rawData = {
            table: { columns, rows },
            column: columns.findIndex(c => c.id === column.id),
            row: rowIndex,
          };
          return aggConfigResult;
        });
      })
    }];
  }

  const splitColumnIndex = columns.findIndex(column => column.id === splitColumn.id);
  const splitRows = splitRowsOnColumn(rows, splitColumn.id);

  // Check if there are buckets after the first metric.
  const firstMetricsColumnIndex = columns.findIndex(column => get(column, 'aggConfig.type.type') === 'metrics');
  const lastBucketsColumnIndex = findLastIndex(columns, column => get(column, 'aggConfig.type.type') === 'buckets');
  const metricsAtAllLevels = firstMetricsColumnIndex < lastBucketsColumnIndex;

  // Calculate metrics:bucket ratio.
  const numberOfMetrics = columns.filter(column => get(column, 'aggConfig.type.type') === 'metrics').length;
  const numberOfBuckets = columns.filter(column => get(column, 'aggConfig.type.type') === 'buckets').length;
  const metricsPerBucket = numberOfMetrics / numberOfBuckets;

  const filteredColumns = columns
    .filter((column, i) => {
      const isSplitColumn = i === splitColumnIndex;
      const isSplitMetric = metricsAtAllLevels && i > splitColumnIndex && i <= splitColumnIndex + metricsPerBucket;
      return !isSplitColumn && !isSplitMetric;
    })
    .map(column => ({ title: column.name, ...column }));

  return splitRows.results.map(splitValue => {
    const $newParent = new AggConfigResult(splitColumn.aggConfig, $parent, splitValue, splitValue);
    return {
      $parent: $newParent,
      aggConfig: splitColumn.aggConfig,
      title: `${splitColumn.aggConfig.fieldFormatter()(splitValue)}: ${splitColumn.aggConfig.makeLabel()}`,
      key: splitValue,
      // Recurse with filtered data to continue the search for additional split columns.
      tables: splitTable(filteredColumns, splitRows.rowsGroupedByResult[splitValue], $newParent),
    };
  });
}

export async function legacyTableResponseHandler(table) {
  return { tables: splitTable(table.columns, table.rows, null) };
}
