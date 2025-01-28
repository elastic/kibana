/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RangeIndexPatternColumn } from '@kbn/lens-plugin/public';

export const getIntervalsColumn = ({
  field,
  options,
}: {
  field: string;
  options: RangeIndexPatternColumn['params'];
}): RangeIndexPatternColumn => {
  const { ranges = [], ...params } = options ?? {};
  return {
    label: `Intervals of ${field}`,
    dataType: 'number',
    operationType: 'range',
    scale: 'ordinal',
    sourceField: field,
    isBucketed: true,
    params: {
      ranges,
      ...params,
    },
  };
};
