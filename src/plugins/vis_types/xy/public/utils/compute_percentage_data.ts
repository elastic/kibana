/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Accessor, AccessorFn } from '@elastic/charts';
import { computeRatioByGroups } from '@elastic/charts';
import type { DatatableRow } from '../../../../expressions/public';

export const computePercentageData = (
  rows: DatatableRow[],
  xAccessor: Accessor | AccessorFn,
  yAccessors: string[],
  splitChartAccessor?: string | null
) => {
  // compute percentage mode data
  const groupAccessors = [String(xAccessor)];
  if (splitChartAccessor) {
    groupAccessors.push(splitChartAccessor);
  }

  return computeRatioByGroups(
    rows,
    groupAccessors,
    yAccessors.map((accessor) => {
      return [(d) => d[accessor], (d, v) => ({ ...d, [accessor]: v })];
    })
  );
};
