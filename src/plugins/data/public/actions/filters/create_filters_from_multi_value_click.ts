/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildCombinedFilter, Filter, toggleFilterNegated } from '@kbn/es-query';
import { createFilter } from './create_filters_from_value_click';
import { MultiValueClickContext } from '../multi_value_click_action';

type MultiValueClickDataContext = MultiValueClickContext['data'];

/** @public */
export const createFiltersFromMultiValueClickAction = async ({
  data,
  negate,
}: MultiValueClickDataContext) => {
  const { table, column, value } = data;

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
  ).filter(Boolean) as unknown as Filter[];
  if (filters.length === 0) return;
  let filter: Filter = buildCombinedFilter(filters);
  if (filter && negate) {
    filter = toggleFilterNegated(filter);
  }

  return filter;
};
