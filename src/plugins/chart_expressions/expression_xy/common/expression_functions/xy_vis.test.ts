/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { xyVisFunction } from '../expression_functions';
import { createMockExecutionContext } from '../../../../../plugins/expressions/common/mocks';
import { sampleArgs } from '../__mocks__';
import { XY_VIS } from '../constants';

describe('xyVis', () => {
  test('it renders with the specified data and args', () => {
    const { data, args } = sampleArgs();
    const result = xyVisFunction.fn(data, args, createMockExecutionContext());

    expect(result).toEqual({ type: 'render', as: XY_VIS, value: { data, args } });
  });
});
