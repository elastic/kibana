/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position } from '@elastic/charts';
import { createMockExecutionContext } from '../../../../expressions/common/mocks';
import { LegendConfig } from '../types';
import { legendConfigFunction } from './legend_config';

describe('legendConfigFunction', () => {
  test('produces the correct arguments', () => {
    const args: LegendConfig = { isVisible: true, position: Position.Left };
    const result = legendConfigFunction.fn(null, args, createMockExecutionContext());

    expect(result).toEqual({ type: 'legendConfig', ...args });
  });
});
