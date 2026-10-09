/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import {
  getMetricsWithChartDimensionSchema,
  getMetricsWithChartDimensionSchemaWithRefBasedOps,
  withCtxMeta,
} from './shared';

describe('withCtxMeta', () => {
  it('reuses the same id-bearing schema across chart dimension helpers', () => {
    const {
      options: [, formula],
    } = getMetricsWithChartDimensionSchema('ctxMetaReuse');
    const {
      options: [, , formulaWithRefBasedOps],
    } = getMetricsWithChartDimensionSchemaWithRefBasedOps('ctxMetaReuse');

    expect(formulaWithRefBasedOps).toBe(formula);
    expect(formula.meta()).toEqual(expect.objectContaining({ id: 'visCtxMetaReuseFormula' }));
  });

  it('returns the cached schema for repeated calls with the same base schema', () => {
    const base = z.object({ a: z.string() });

    expect(withCtxMeta(base, 'ctxMetaSameBase', 'Thing', 'Thing')).toBe(
      withCtxMeta(base, 'ctxMetaSameBase', 'Thing', 'Thing')
    );
  });

  it('throws when a different base schema requests an id that is already used', () => {
    withCtxMeta(z.object({ a: z.string() }), 'ctxMetaConflict', 'Thing', 'Thing');

    expect(() =>
      withCtxMeta(z.object({ b: z.number() }), 'ctxMetaConflict', 'Thing', 'Thing')
    ).toThrow('Schema id "visCtxMetaConflictThing" is already used by a different base schema');
  });
});
