/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { last } from 'lodash';
import moment from 'moment';
import { Datatable } from 'src/plugins/expressions';
import { esFilters, IFieldType, RangeFilterParams } from '../../../public';
import { getIndexPatterns, getSearchService } from '../../../public/services';
import { AggConfigSerialized } from '../../../common/search/aggs';

interface RangeSelectDataContext {
  table: Datatable;
  column: number;
  range: number[];
  timeFieldName?: string;
}

export async function createFiltersFromRangeSelectAction(event: RangeSelectDataContext) {
  const column: Record<string, any> = event.table.columns[event.column];

  if (!column || !column.meta) {
    return [];
  }

  const { indexPatternId, ...aggConfigs } = column.meta.sourceParams;
  const indexPattern = await getIndexPatterns().get(indexPatternId);
  const aggConfigsInstance = getSearchService().aggs.createAggConfigs(indexPattern, [
    aggConfigs as AggConfigSerialized,
  ]);
  const aggConfig = aggConfigsInstance.aggs[0];
  const field: IFieldType = aggConfig.params.field;

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

  return esFilters.mapAndFlattenFilters([esFilters.buildRangeFilter(field, range, indexPattern)]);
}
