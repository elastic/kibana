/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AxisTypeId, computeInputCombinations, PosType } from './_mocks';
import { computeChartMargins } from './utils';
import { AxisConfiguration } from '../../helpers';

describe('reference lines helpers', () => {
  describe('computeChartMargins', () => {
    test.each(computeInputCombinations())(
      '$id test',
      // @ts-expect-error types are not inferred correctly
      ({
        referencePadding,
        labels,
        titles,
        axesMap,
        isHorizontal,
        result,
      }: {
        referencePadding: Partial<Record<PosType, number>>;
        labels: Partial<Record<AxisTypeId, boolean>>;
        titles: Partial<Record<AxisTypeId, boolean>>;
        axesMap: Record<PosType, AxisConfiguration | undefined>;
        isHorizontal: boolean;
        result: Partial<Record<PosType, number>>;
      }) => {
        expect(
          computeChartMargins(referencePadding, labels, titles, axesMap, isHorizontal)
        ).toEqual(result);
      }
    );
  });
});
