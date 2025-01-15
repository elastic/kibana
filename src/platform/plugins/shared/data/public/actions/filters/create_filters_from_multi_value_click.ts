/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildCombinedFilter,
  toggleFilterNegated,
  Filter,
  compareFilters,
  COMPARE_ALL_OPTIONS,
} from '@kbn/es-query';
import { Truthy, uniqWith } from 'lodash';
import { createFilter } from './create_filters_from_value_click';
import type { MultiValueClickContext } from '../multi_value_click_action';
import { mapAndFlattenFilters } from '../../query';

type MultiValueClickDataContext = MultiValueClickContext['data'];

export const truthy = <T>(value: T): value is Truthy<T> => !!value;

/** @public */
export const createFiltersFromMultiValueClickAction = async ({
  data,
  negate,
}: MultiValueClickDataContext): Promise<undefined | Filter[]> => {
  if (!data || data.length === 0) return;

  const result = (
    await Promise.all(
      data.map(async (d) => {
        const { table, cells, relation } = d;
        const dataViewId = table?.meta?.source;
        if (!dataViewId) return;

        const filters = (
          await Promise.all(
            cells.map(async ({ column, row }) => await createFilter(table, column, row))
          )
        )
          .flat()
          .filter(truthy);

        const uniqueFilters = uniqWith(mapAndFlattenFilters(filters), (a, b) =>
          compareFilters(a, b, COMPARE_ALL_OPTIONS)
        );

        if (uniqueFilters.length === 0) return;

        if (uniqueFilters.length === 1) {
          return negate ? [toggleFilterNegated(uniqueFilters[0])] : uniqueFilters;
        }

        if (!relation) {
          return negate ? uniqueFilters.map((f) => toggleFilterNegated(f)) : uniqueFilters;
        }

        const filtersHaveAlias = uniqueFilters.every((f) => f.meta.alias);
        const alias = filtersHaveAlias
          ? uniqueFilters.map((f) => f.meta.alias).join(` ${relation} `)
          : '';

        return buildCombinedFilter(
          relation,
          uniqueFilters,
          { id: dataViewId },
          undefined,
          negate,
          alias
        );
      })
    )
  )
    .flat()
    .filter(truthy);

  if (result.length === 0) return;
  return result;
};
