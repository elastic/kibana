/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { Datatable } from '@kbn/expressions-plugin/public';
import { esFilters, Filter } from '../..';
import { getIndexPatterns, getSearchService } from '../../services';
import { AggConfigSerialized } from '../../../common/search/aggs';

interface ValueClickDataContext {
  data: Array<{
    table: Pick<Datatable, 'rows' | 'columns'>;
    column: number;
    row: number;
    value: any;
  }>;
  timeFieldName?: string;
  negate?: boolean;
}

/**
 * For terms aggregations on `__other__` buckets, this assembles a list of applicable filter
 * terms based on a specific cell in the tabified data.
 *
 * @param  {EventData['table']} table - tabified table data
 * @param  {number} columnIndex - current column index
 * @param  {number} rowIndex - current row index
 * @return {array} - array of terms to filter against
 */
const getOtherBucketFilterTerms = (
  table: Pick<Datatable, 'rows' | 'columns'>,
  columnIndex: number,
  rowIndex: number
) => {
  if (rowIndex === -1) {
    return [];
  }

  // get only rows where cell value matches current row for all the fields before columnIndex
  const rows = table.rows.filter((row) => {
    return table.columns.every((column, i) => {
      return row[column.id] === table.rows[rowIndex][column.id] || i >= columnIndex;
    });
  });
  const terms: any[] = rows.map((row) => row[table.columns[columnIndex].id]);

  return [
    ...new Set(
      terms.filter((term) => {
        const notOther = String(term) !== '__other__';
        const notMissing = String(term) !== '__missing__';
        return notOther && notMissing;
      })
    ),
  ];
};

/**
 * Assembles the filters needed to apply filtering against a specific cell value, while accounting
 * for cases like if the value is a terms agg in an `__other__` or `__missing__` bucket.
 *
 * @param  {EventData['table']} table - tabified table data
 * @param  {number} columnIndex - current column index
 * @param  {number} rowIndex - current row index
 * @param  {string} cellValue - value of the current cell
 * @return {Filter[]|undefined} - list of filters to provide to queryFilter.addFilters()
 */
const createFilter = async (
  table: Pick<Datatable, 'rows' | 'columns'>,
  columnIndex: number,
  rowIndex: number
) => {
  if (
    !table ||
    !table.columns ||
    !table.columns[columnIndex] ||
    !table.columns[columnIndex].meta ||
    table.columns[columnIndex].meta.source !== 'esaggs' ||
    !table.columns[columnIndex].meta.sourceParams?.indexPatternId
  ) {
    return;
  }
  const column = table.columns[columnIndex];
  const { indexPatternId, ...aggConfigParams } = table.columns[columnIndex].meta
    .sourceParams as any;
  const aggConfigsInstance = getSearchService().aggs.createAggConfigs(
    await getIndexPatterns().get(indexPatternId),
    [aggConfigParams as AggConfigSerialized]
  );
  const aggConfig = aggConfigsInstance.aggs[0];
  let filter: Filter[] = [];
  const value: any = rowIndex > -1 ? table.rows[rowIndex][column.id] : null;
  if (value === null || value === undefined || !aggConfig.isFilterable()) {
    return;
  }
  if (
    (aggConfig.type.name === 'terms' || aggConfig.type.name === 'multi_terms') &&
    aggConfig.params.otherBucket
  ) {
    const terms = getOtherBucketFilterTerms(table, columnIndex, rowIndex);
    filter = aggConfig.createFilter(value, { terms });
  } else {
    filter = aggConfig.createFilter(value);
  }

  if (!filter) {
    return;
  }

  if (!Array.isArray(filter)) {
    filter = [filter];
  }

  return filter;
};

/** @public */
export const createFiltersFromValueClickAction = async ({
  data,
  negate,
}: ValueClickDataContext) => {
  const filters: Filter[] = [];

  await Promise.all(
    data
      .filter((point) => point)
      .map(async (val) => {
        const { table, column, row } = val;
        const filter: Filter[] = (await createFilter(table, column, row)) || [];
        if (filter) {
          filter.forEach((f) => {
            if (negate) {
              f = esFilters.toggleFilterNegated(f);
            }
            filters.push(f);
          });
        }
      })
  );

  return _.uniqWith(esFilters.mapAndFlattenFilters(filters), (a, b) =>
    esFilters.compareFilters(a, b, esFilters.COMPARE_ALL_OPTIONS)
  );
};
