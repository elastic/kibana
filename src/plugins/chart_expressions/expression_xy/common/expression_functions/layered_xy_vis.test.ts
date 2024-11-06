/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { layeredXyVisFunction } from '.';
import { createMockExecutionContext } from '@kbn/expressions-plugin/common/mocks';
import { sampleArgs, sampleExtendedLayer } from '../__mocks__';
import { XY_VIS } from '../constants';

describe('layeredXyVis', () => {
  test('it renders with the specified data and args', async () => {
    const { data, args } = sampleArgs();
    const { layers, ...rest } = args;
    const result = await layeredXyVisFunction.fn(
      data,
      { ...rest, layers: [sampleExtendedLayer] },
      createMockExecutionContext()
    );

    expect(result).toEqual({
      type: 'render',
      as: XY_VIS,
      value: {
        args: { ...rest, layers: [sampleExtendedLayer] },
        syncColors: false,
        syncTooltips: false,
        syncCursor: true,
        canNavigateToLens: false,
      },
    });
  });

  test('it should throw error if markSizeRatio is lower then 1 or greater then 100', async () => {
    const { data, args } = sampleArgs();
    const { layers, ...rest } = args;

    expect(
      layeredXyVisFunction.fn(
        data,
        {
          ...rest,
          markSizeRatio: 0,
          layers: [sampleExtendedLayer],
        },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();

    expect(
      layeredXyVisFunction.fn(
        data,
        {
          ...rest,
          markSizeRatio: 101,
          layers: [sampleExtendedLayer],
        },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  test('it should throw error if markSizeRatio is specified if no markSizeAccessor is present', async () => {
    const { data, args } = sampleArgs();
    const { layers, ...rest } = args;

    expect(
      layeredXyVisFunction.fn(
        data,
        {
          ...rest,
          markSizeRatio: 10,
          layers: [sampleExtendedLayer],
        },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();
  });
});
