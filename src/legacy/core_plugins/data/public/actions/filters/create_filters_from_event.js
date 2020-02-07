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

import { esFilters } from '../../../../../../plugins/data/public';
import { deserializeAggConfig } from '../../search/expressions/utils';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getIndexPatterns } from '../../../../../../plugins/data/public/services';

/**
 * For terms aggregations on `__other__` buckets, this assembles a list of applicable filter
 * terms based on a specific cell in the tabified data.
 *
 * @param  {object} table - tabified table data
 * @param  {number} columnIndex - current column index
 * @param  {number} rowIndex - current row index
 * @return {array} - array of terms to filter against
 */
const getOtherBucketFilterTerms = (table, columnIndex, rowIndex) => {
  if (rowIndex === -1) {
    return [];
  }

  // get only rows where cell value matches current row for all the fields before columnIndex
  const rows = table.rows.filter(row => {
    return table.columns.every((column, i) => {
      return row[column.id] === table.rows[rowIndex][column.id] || i >= columnIndex;
    });
  });
  const terms = rows.map(row => row[table.columns[columnIndex].id]);

  return [
    ...new Set(
      terms.filter(term => {
        const notOther = term !== '__other__';
        const notMissing = term !== '__missing__';
        return notOther && notMissing;
      })
    ),
  ];
};

/**
 * Assembles the filters needed to apply filtering against a specific cell value, while accounting
 * for cases like if the value is a terms agg in an `__other__` or `__missing__` bucket.
 *
 * @param  {object} table - tabified table data
 * @param  {number} columnIndex - current column index
 * @param  {number} rowIndex - current row index
 * @param  {string} cellValue - value of the current cell
 * @return {array|string} - filter or list of filters to provide to queryFilter.addFilters()
 */
const createFilter = async (table, columnIndex, rowIndex) => {
  if (!table || !table.columns || !table.columns[columnIndex]) return;
  const column = table.columns[columnIndex];
  const aggConfig = deserializeAggConfig({
    type: column.meta.type,
    aggConfigParams: column.meta.aggConfigParams,
    indexPattern: await getIndexPatterns().get(column.meta.indexPatternId),
  });
  let filter = [];
  const value = rowIndex > -1 ? table.rows[rowIndex][column.id] : null;
  if (value === null || value === undefined || !aggConfig.isFilterable()) {
    return;
  }
  if (aggConfig.type.name === 'terms' && aggConfig.params.otherBucket) {
    const terms = getOtherBucketFilterTerms(table, columnIndex, rowIndex);
    filter = aggConfig.createFilter(value, { terms });
  } else {
    filter = aggConfig.createFilter(value);
  }

  if (!Array.isArray(filter)) {
    filter = [filter];
  }

  return filter;
};

const createFiltersFromEvent = async event => {
  const filters = [];
  const dataPoints = event.data || [event];

  await Promise.all(
    dataPoints
      .filter(point => point)
      .map(async val => {
        const { table, column, row } = val;
        const filter = await createFilter(table, column, row);
        if (filter) {
          filter.forEach(f => {
            if (event.negate) {
              f = esFilters.toggleFilterNegated(f);
            }
            filters.push(f);
          });
        }
      })
  );

  return filters;
};

export { createFilter, createFiltersFromEvent };
