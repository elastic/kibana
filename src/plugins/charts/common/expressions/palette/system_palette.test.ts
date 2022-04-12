/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PaletteOutput } from '@kbn/coloring';
import { systemPalette } from './system_palette';
import { functionWrapper } from 'src/plugins/expressions/common/expression_functions/specs/tests/utils';

describe('system_palette', () => {
  const fn = functionWrapper(systemPalette()) as (
    context: null,
    args: { name: string; params?: unknown }
  ) => PaletteOutput<unknown>;

  it('results a palette', () => {
    const result = fn(null, { name: 'test' });
    expect(result).toHaveProperty('type', 'palette');
  });

  it('returns the name', () => {
    const result = fn(null, { name: 'test' });
    expect(result).toHaveProperty('name', 'test');
  });
});
