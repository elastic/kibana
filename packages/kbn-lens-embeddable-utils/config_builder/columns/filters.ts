/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FiltersIndexPatternColumn } from '@kbn/lens-plugin/public';

export const getFiltersColumn = ({
  options,
}: {
  options?: FiltersIndexPatternColumn['params'];
}): FiltersIndexPatternColumn => {
  const { filters = [], ...params } = options ?? {};
  return {
    label: `Filters`,
    dataType: 'number',
    operationType: 'filters',
    scale: 'ordinal',
    isBucketed: true,
    params: {
      filters,
      ...params,
    },
  };
};
