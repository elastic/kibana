/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AxesSettingsConfig } from '../types';
import { tickLabelsConfigFunction } from '../expression_functions';
import { createMockExecutionContext } from '../../../../../plugins/expressions/common/mocks';

describe('tickLabelsConfig', () => {
  test('produces the correct arguments', () => {
    const args: AxesSettingsConfig = { x: true, yLeft: false, yRight: false };
    const result = tickLabelsConfigFunction.fn(null, args, createMockExecutionContext());

    expect(result).toEqual({ type: 'tickLabelsConfig', ...args });
  });
});
