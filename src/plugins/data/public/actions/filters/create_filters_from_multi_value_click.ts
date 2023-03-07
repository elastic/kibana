/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { buildCombinedFilter, Filter, toggleFilterNegated, BooleanRelation } from '@kbn/es-query';
import { createFilter } from './create_filters_from_value_click';
import type { MultiValueClickContext } from '../multi_value_click_action';

type MultiValueClickDataContext = MultiValueClickContext['data'];

/** @public */
export const createFiltersFromMultiValueClickAction = async ({
  data,
  negate,
}: MultiValueClickDataContext) => {
  const { table, column, value } = data;
  const dataViewId = table?.meta?.source;
  if (!dataViewId) return;

  const columnId = table.columns[column].id;

  const filters = (
    await Promise.all(
      value.map(async (v) => {
        return (
          await createFilter(
            table,
            column,
            table.rows.findIndex((r) => r[columnId] === v)
          )
        )?.[0];
      })
    )
  ).filter(Boolean) as Filter[];
  if (filters.length === 0) return;
  // no need for combined filter in case of one filter
  if (filters.length === 1) {
    if (filters[0] && negate) {
      return toggleFilterNegated(filters[0]);
    }
    return filters[0];
  }
  const filtersHaveAlias = filters.every((f) => f.meta.alias);
  let alias = '';
  if (filtersHaveAlias) {
    filters.forEach((f, i) => {
      if (i === filters.length - 1) {
        alias += `${f.meta.alias}`;
      } else {
        alias += `${f.meta.alias} ${BooleanRelation.OR} `;
      }
    });
  }
  let filter: Filter = buildCombinedFilter(
    BooleanRelation.OR,
    filters,
    {
      id: dataViewId,
    },
    undefined,
    undefined,
    alias
  );
  if (filter && negate) {
    filter = toggleFilterNegated(filter);
  }

  return filter;
};
