/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getLegendTruncateAfterLines } from './utils';

describe('utils', () => {
  describe('getLegendTruncateAfterLines', () => {
    it.each<
      [input: Parameters<typeof getLegendTruncateAfterLines>['0'], expected: number | undefined]
    >([
      [{}, undefined],
      // xy and heatmap
      [{ shouldTruncate: true }, 1],
      [{ shouldTruncate: true, maxLines: 1 }, 1],
      [{ shouldTruncate: true, maxLines: 0 }, undefined],
      [{ shouldTruncate: false, maxLines: 1 }, undefined],
      [{ shouldTruncate: false, maxLines: 0 }, undefined],
      [{ maxLines: 0 }, undefined],
      [{ maxLines: 1 }, undefined],
      // partition
      [{ truncateLegend: true }, 1],
      [{ truncateLegend: true, legendMaxLines: 1 }, 1],
      [{ truncateLegend: true, legendMaxLines: 0 }, undefined],
      [{ truncateLegend: false, legendMaxLines: 1 }, undefined],
      [{ legendMaxLines: 1 }, undefined],
      [{ truncateLegend: false, legendMaxLines: 0 }, undefined],
      [{ legendMaxLines: 0 }, undefined],
    ])('legend config of %j should return %s', (input, expected) => {
      expect(getLegendTruncateAfterLines(input)).toBe(expected);
    });
  });
});
