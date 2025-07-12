/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MultiValueClickDataContext } from './filters/create_filters_from_multi_value_click';
import type { RangeSelectDataContext } from './filters/create_filters_from_range_select';
import type { ValueClickDataContext } from './filters/create_filters_from_value_click';

export const actions = {
  createFiltersFromValueClickAction: async (context: ValueClickDataContext) => {
    const { createFiltersFromValueClickAction } = await import(
      './filters/create_filters_from_value_click'
    );
    return await createFiltersFromValueClickAction(context);
  },
  createFiltersFromRangeSelectAction: async (context: RangeSelectDataContext) => {
    const { createFiltersFromRangeSelectAction } = await import(
      './filters/create_filters_from_range_select'
    );
    return await createFiltersFromRangeSelectAction(context);
  },
  createFiltersFromMultiValueClickAction: async (context: MultiValueClickDataContext) => {
    const { createFiltersFromMultiValueClickAction } = await import(
      './filters/create_filters_from_multi_value_click'
    );
    return await createFiltersFromMultiValueClickAction(context);
  },
};
