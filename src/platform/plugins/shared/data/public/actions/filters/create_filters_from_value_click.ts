/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/public';
import { isSourceParamsESQL } from '@kbn/expressions-plugin/public';
import {
  getESQLAdHocDataview,
  getViews,
  resolveViewColumnToIndexField,
  splitIndexPatternSources,
} from '@kbn/esql-utils';
import type { Filter } from '@kbn/es-query';
import {
  compareFilters,
  COMPARE_ALL_OPTIONS,
  toggleFilterNegated,
  type AggregateQuery,
} from '@kbn/es-query';
import { appendWhereClauseToESQLQuery } from '@kbn/esql-utils';
import {
  buildSimpleExistFilter,
  buildSimpleNumberRangeFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
} from '@kbn/es-query/src/filters/build_filters';
import { MISSING_TOKEN } from '@kbn/field-formats-common';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { getHttp, getIndexPatterns, getSearchService } from '../../services';
import type { AggConfigSerialized } from '../../../common/search/aggs';
import { mapAndFlattenFilters } from '../../query';

export interface ValueClickDataContext {
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
        const notMissing = String(term) !== MISSING_TOKEN;
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

type RawColumnValue = string | number | boolean | (string | number | boolean)[] | null | undefined;

/** View names confirmed this session, so a later click does not field-cap the view name again. */
const knownViewSources = new Set<string>();

/** Fields added onto a view data view. They are not field-caps results and must not count as one. */
const injectedViewFields = new Set<string>();

const injectedViewFieldKey = (dataViewId: string | undefined, fieldName: string): string =>
  `${dataViewId ?? ''}:${fieldName}`;

const isKnownViewPattern = (indexPattern: string): boolean => {
  const sources = splitIndexPatternSources(indexPattern);
  return sources.length > 0 && sources.every((source) => knownViewSources.has(source));
};

/** Clears the session cache of ES|QL view sources. Test-only. */
export const clearKnownEsqlViewSources = (): void => {
  knownViewSources.clear();
};

/** Clears fields injected onto view data views. Test-only. */
export const clearInjectedEsqlViewFields = (): void => {
  injectedViewFields.clear();
};

const isUnfilterableComputedColumn = (column: DatatableColumn): boolean =>
  column.isComputedColumn === true && column.meta?.sourceParams?.isSourceFieldFilterable !== true;

type ESQLAdHocDataView = Awaited<ReturnType<typeof getESQLAdHocDataview>>;

/** Puts the resolved index field on the view's ad hoc data view so the filter pill and editor can see it. */
const ensureResolvedFieldOnDataView = (
  dataView: ESQLAdHocDataView,
  fieldName: string,
  column: DatatableColumn
): void => {
  const alreadyInjected = injectedViewFields.has(injectedViewFieldKey(dataView.id, fieldName));
  if (dataView.getFieldByName(fieldName) || alreadyInjected) {
    return;
  }

  dataView.fields.add({
    name: fieldName,
    type: column.meta?.type ?? 'string',
    searchable: true,
    aggregatable: false,
    count: 0,
    readFromDocValues: false,
  });
  injectedViewFields.add(injectedViewFieldKey(dataView.id, fieldName));
};

const removeInjectedViewFields = (dataView: ESQLAdHocDataView): void => {
  const injected = dataView.fields
    .getAll()
    .filter((field) => injectedViewFields.has(injectedViewFieldKey(dataView.id, field.name)));
  for (const field of injected) {
    dataView.fields.remove(field);
    injectedViewFields.delete(injectedViewFieldKey(dataView.id, field.name));
  }
};

const buildRawColumnFilter = (
  filterFieldName: string,
  value: RawColumnValue,
  column: DatatableColumn,
  dataView: ESQLAdHocDataView
) => {
  // Only null/undefined mean "no value" here. ES|QL rows never contain the MISSING_TOKEN
  // sentinel (it is injected by the DSL terms agg), so a literal "__missing__" string is a
  // real document value and must produce a phrase filter, not a negated exists filter.
  if (value == null) {
    const existsFilter = buildSimpleExistFilter(filterFieldName, dataView.id ?? '');
    existsFilter.meta.negate = true;
    return [existsFilter];
  }

  // Match phrase or phrases filter based on whether value is an array
  // The advantage of match_phrase is that you get a term query when it's not a text and
  // match phrase if it is a text. So you don't have to worry about the field type.
  const fieldDescriptor = { name: filterFieldName, type: column.meta?.type };
  const filter = Array.isArray(value)
    ? buildPhrasesFilter(fieldDescriptor, value, dataView)
    : buildPhraseFilter(fieldDescriptor, value, dataView);
  return [filter];
};

const resolveViewSourceField = async (
  indexPattern: string,
  fieldName: string
): Promise<string | undefined> => {
  const http = getHttp();
  if (!http) {
    return undefined;
  }

  const { views } = await getViews(http);
  const viewNames = new Set(views.map((view) => view.name));
  const sources = splitIndexPatternSources(indexPattern);
  if (!sources.some((source) => viewNames.has(source))) {
    for (const source of sources) {
      knownViewSources.delete(source);
    }
    return undefined;
  }

  for (const source of sources) {
    if (viewNames.has(source)) {
      knownViewSources.add(source);
    } else {
      knownViewSources.delete(source);
    }
  }

  return resolveViewColumnToIndexField(fieldName, indexPattern, views);
};

const createFilterFromRawColumnsESQL = async (column: DatatableColumn, value: RawColumnValue) => {
  const indexPattern = column?.meta?.sourceParams?.indexPattern as string | undefined;

  if (!indexPattern) {
    return [];
  }

  // Prefer `sourceField` (index field name). Fall back to `column.name` when it is not a string
  const sourceFieldName = column.meta?.sourceParams?.sourceField;
  const fieldName = typeof sourceFieldName === 'string' ? sourceFieldName : column.name;
  const knownView = isKnownViewPattern(indexPattern);

  const loadAdHocDataView = (skipFetchFields: boolean) =>
    getESQLAdHocDataview({
      query: 'FROM ' + indexPattern,
      dataViewsService: getIndexPatterns() as DataViewsPublicPluginStart,
      http: getHttp(),
      ...(skipFetchFields ? { options: { skipFetchFields: true } } : {}),
    });

  let dataView: ESQLAdHocDataView | undefined;
  let fieldCapsError: unknown;
  if (!knownView) {
    try {
      dataView = await loadAdHocDataView(false);
    } catch (error) {
      // Field caps rejects names that are views rather than indices. An unfilterable computed
      // column has nothing to resolve, so surface the original index error.
      if (isUnfilterableComputedColumn(column)) {
        throw error;
      }
      fieldCapsError = error;
    }

    if (dataView) {
      const field = dataView.getFieldByName(fieldName);
      const injected = injectedViewFields.has(injectedViewFieldKey(dataView.id, fieldName));

      // Field should be present in the data view and filterable.
      // A computed column (e.g. EVAL bytes = bytes * 2) can have the same name as a real,
      // filterable field, so the check above isn't enough: fieldName would resolve to that
      // unrelated field, but the value shown is the computed one, not the raw field's value.
      // A field this click path injected for a view is not a field-caps result.
      if (field && !injected) {
        if (!field.filterable || isUnfilterableComputedColumn(column)) {
          return [];
        }
        return buildRawColumnFilter(fieldName, value, column, dataView);
      }
    }
  }

  // Field caps does not describe ES|QL views. Resolve the column from the cached view
  // definition and skip another field-caps call once this pattern is known to be a view.
  if (isUnfilterableComputedColumn(column)) {
    if (fieldCapsError) {
      throw fieldCapsError;
    }
    return [];
  }

  dataView = dataView ?? (await loadAdHocDataView(true));

  const resolvedField = await resolveViewSourceField(indexPattern, fieldName);
  if (!resolvedField) {
    if (!isKnownViewPattern(indexPattern)) {
      removeInjectedViewFields(dataView);
    }
    if (fieldCapsError) {
      throw fieldCapsError;
    }
    return [];
  }

  ensureResolvedFieldOnDataView(dataView, resolvedField, column);
  return buildRawColumnFilter(resolvedField, value, column, dataView);
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

  if (rowIndex === -1) {
    return [];
  }
  const value = table.rows[rowIndex][column.id];
  if (value == null) {
    return !operationType ? await createFilterFromRawColumnsESQL(column, value) : [];
  }

  const filters: Filter[] = [];

  if (
    typeof operationType === 'string' &&
    ['date_histogram', 'histogram'].includes(operationType)
  ) {
    filters.push(
      buildSimpleNumberRangeFilter(
        sourceField,
        operationType === 'date_histogram' ? 'date' : 'number',
        {
          gte: value,
          lt: value + (interval ?? 0),
          ...(operationType === 'date_histogram' ? { format: 'strict_date_optional_time' } : {}),
        },
        value,
        indexPattern
      )
    );
  } else if (!operationType) {
    filters.push(...(await createFilterFromRawColumnsESQL(column, value)));
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
  for (const value of data) {
    if (!value) {
      continue;
    }
    const { table, column, row } = value;
    const filter =
      table.meta?.type === 'es_ql'
        ? await createFilterESQL(table, column, row)
        : (await createFilter(table, column, row)) ?? [];
    filter.forEach((f) => {
      if (negate) {
        f = toggleFilterNegated(f);
      }
      filters.push(f);
    });
  }

  return _.uniqWith(mapAndFlattenFilters(filters), (a, b) =>
    compareFilters(a, b, COMPARE_ALL_OPTIONS)
  );
};

function getOperationForWhere(value: unknown, negate: boolean) {
  if (value == null) {
    return negate ? 'is_not_null' : 'is_null';
  }
  return negate ? '-' : '+';
}

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

  let queryString = query.esql;
  for (const point in dataPoints) {
    if (dataPoints[point]) {
      const { table, column: columnIndex, row: rowIndex } = dataPoints[point];

      if (table?.columns?.[columnIndex]) {
        const column = table.columns[columnIndex];
        const value: unknown = rowIndex > -1 ? table.rows[rowIndex][column.id] : null;
        const queryWithWhere = appendWhereClauseToESQLQuery(
          queryString,
          column.name,
          value,
          getOperationForWhere(value, negate || false),
          column.meta?.type,
          column.meta?.esType
        );

        if (queryWithWhere) {
          queryString = queryWithWhere;
        }
      }
    }
  }

  return queryString;
};
