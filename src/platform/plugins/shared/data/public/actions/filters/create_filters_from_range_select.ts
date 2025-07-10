/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { last } from 'lodash';
import moment from 'moment';
import { Datatable } from '@kbn/expressions-plugin/common';
import { type AggregateQuery, isOfAggregateQueryType } from '@kbn/es-query';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { buildRangeFilter, DataViewFieldBase, RangeFilterParams } from '@kbn/es-query';
import { getIndexPatterns, getSearchService } from '../../services';
import { AggConfigSerialized } from '../../../common/search/aggs';
import { mapAndFlattenFilters } from '../../query';

export interface RangeSelectDataContext {
  table: Datatable;
  column: number;
  range: number[];
  timeFieldName?: string;
  query?: AggregateQuery;
}

const getParameters = async (event: RangeSelectDataContext) => {
  const column: Record<string, any> = event.table.columns[event.column];
  // Handling of the ES|QL datatable
  if (isOfAggregateQueryType(event.query) || event.table.meta?.type === 'es_ql') {
    const field = new DataViewField({
      name: column.meta?.sourceParams?.sourceField || column.name,
      type: column.meta?.type ?? 'unknown',
      esTypes: column.meta?.esType ? ([column.meta.esType] as string[]) : undefined,
      searchable: true,
      aggregatable: false,
    });

    return {
      field,
      indexPattern: undefined,
    };
  }
  if (column.meta && 'sourceParams' in column.meta) {
    const { sourceField, ...aggConfigs } = column.meta.sourceParams;
    const indexPatternId =
      column.meta.sourceParams.indexPatternId || column.meta.sourceParams.indexPattern;
    const indexPattern = await getIndexPatterns().get(indexPatternId);
    const aggConfigsInstance = getSearchService().aggs.createAggConfigs(indexPattern, [
      aggConfigs as AggConfigSerialized,
    ]);
    const aggConfig = aggConfigsInstance.aggs[0];
    const field: DataViewFieldBase = aggConfig.params.field;
    return {
      field,
      indexPattern,
    };
  }
  return {
    field: undefined,
    indexPattern: undefined,
  };
};

export async function createFiltersFromRangeSelectAction(event: RangeSelectDataContext) {
  const column: Record<string, any> = event.table.columns[event.column];

  if (!column || !column.meta) {
    return [];
  }

  const { field, indexPattern } = await getParameters(event);

  if (!field || event.range.length <= 1) {
    return [];
  }

  const min = event.range[0];
  const max = last(event.range);

  if (min === max) {
    return [];
  }

  const isDate = field.type === 'date';

  const range: RangeFilterParams = {
    gte: isDate ? moment(min).toISOString() : min,
    lt: isDate ? moment(max).toISOString() : max,
  };

  if (isDate) {
    range.format = 'strict_date_optional_time';
  }
  return mapAndFlattenFilters([buildRangeFilter(field, range, indexPattern)]);
}
