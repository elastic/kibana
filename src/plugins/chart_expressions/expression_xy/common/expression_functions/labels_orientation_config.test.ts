/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LabelsOrientationConfig } from '../types';
import { labelsOrientationConfigFunction } from '.';
import { createMockExecutionContext } from '@kbn/expressions-plugin/common/mocks';

describe('labelsOrientationConfig', () => {
  test('produces the correct arguments', () => {
    const args: LabelsOrientationConfig = { x: 0, yLeft: -90, yRight: -45 };
    const result = labelsOrientationConfigFunction.fn(null, args, createMockExecutionContext());

    expect(result).toEqual({ type: 'labelsOrientationConfig', ...args });
  });
});
