/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AxesSettingsConfig } from '../types';
import { gridlinesConfigFunction } from '../expression_functions';
import { createMockExecutionContext } from '../../../../../plugins/expressions/common/mocks';

describe('gridlinesConfig', () => {
  test('produces the correct arguments', () => {
    const args: AxesSettingsConfig = { x: true, yLeft: false, yRight: false };
    const result = gridlinesConfigFunction.fn(null, args, createMockExecutionContext());

    expect(result).toEqual({ type: 'gridlinesConfig', ...args });
  });
});
