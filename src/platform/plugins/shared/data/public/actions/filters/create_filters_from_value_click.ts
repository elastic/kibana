/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { Datatable, isSourceParamsESQL } from '@kbn/expressions-plugin/public';
import {
  compareFilters,
  COMPARE_ALL_OPTIONS,
  Filter,
  toggleFilterNegated,
  type AggregateQuery,
} from '@kbn/es-query';
import { appendWhereClauseToESQLQuery } from '@kbn/esql-utils';
import {
  buildSimpleExistFilter,
  buildSimpleNumberRangeFilter,
} from '@kbn/es-query/src/filters/build_filters';
import { getIndexPatterns, getSearchService } from '../../services';
import { AggConfigSerialized } from '../../../common/search/aggs';
import { mapAndFlattenFilters } from '../../query';

interface ValueClickDataContext {
  data: Array<{
    table: Pick<Datatable, 'rows' | 'columns' | 'meta'>;
    column: number;
    row: number;
    value: any;
  }>;
  timeFieldName?: string;
  negate?: boolean;
  query?: AggregateQuery;
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
export const createFilter = async (
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

export const createFilterESQL = async (
  table: Pick<Datatable, 'rows' | 'columns'>,
  columnIndex: number,
  rowIndex: number
) => {
  const column = table?.columns?.[columnIndex];
  if (
    !column?.meta?.sourceParams?.sourceField ||
    column.meta.sourceParams?.sourceField === '___records___'
  ) {
    return [];
  }
  const sourceParams = column.meta.sourceParams;
  if (!isSourceParamsESQL(sourceParams)) {
    return [];
  }
  const { indexPattern, sourceField, operationType, interval } = sourceParams;

  const value = rowIndex > -1 ? table.rows[rowIndex][column.id] : null;
  if (value == null) {
    return [];
  }

  const filters: Filter[] = [];

  if (['date_histogram', 'histogram'].includes(operationType)) {
    filters.push(
      buildSimpleNumberRangeFilter(
        sourceField,
        {
          gte: value,
          lt: value + (interval || 0),
          ...(operationType === 'date_hisotgram' ? { format: 'strict_date_optional_time' } : {}),
        },
        value,
        indexPattern
      )
    );
  } else {
    filters.push(buildSimpleExistFilter(sourceField, indexPattern));
  }

  return filters;
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
        const filter =
          table.meta?.type === 'es_ql'
            ? await createFilterESQL(table, column, row)
            : (await createFilter(table, column, row)) || [];
        if (filter) {
          filter.forEach((f) => {
            if (negate) {
              f = toggleFilterNegated(f);
            }
            filters.push(f);
          });
        }
      })
  );

  return _.uniqWith(mapAndFlattenFilters(filters), (a, b) =>
    compareFilters(a, b, COMPARE_ALL_OPTIONS)
  );
};

/** @public */
export const appendFilterToESQLQueryFromValueClickAction = ({
  data,
  query,
  negate,
}: ValueClickDataContext) => {
  if (!query) {
    return;
  }
  // Do not append in case of time series, for now. We need to find a way to compute the interval
  // to create the time range filter correctly. The users can brush to update the time filter instead.
  const dataPoints = data.filter((point) => {
    return point && point.table?.columns?.[point.column]?.meta?.type !== 'date';
  });

  if (!dataPoints.length) {
    return;
  }
  const { table, column: columnIndex, row: rowIndex } = dataPoints[dataPoints.length - 1];

  if (table?.columns?.[columnIndex]) {
    const column = table.columns[columnIndex];
    const value: unknown = rowIndex > -1 ? table.rows[rowIndex][column.id] : null;
    if (value == null) {
      return;
    }
    return appendWhereClauseToESQLQuery(
      query.esql,
      column.name,
      value,
      negate ? '-' : '+',
      column.meta?.type
    );
  }
};
