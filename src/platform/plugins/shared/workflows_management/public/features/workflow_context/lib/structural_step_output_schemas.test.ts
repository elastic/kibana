/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { structuralStepOutputSchemas } from './structural_step_output_schemas';

describe('structuralStepOutputSchemas', () => {
  it('contains an "if" step output schema', () => {
    expect(structuralStepOutputSchemas).toHaveProperty('if');
  });

  describe('if schema', () => {
    const ifSchema = structuralStepOutputSchemas.if;

    it('accepts { conditionResult: true }', () => {
      const result = ifSchema.safeParse({ conditionResult: true });
      expect(result.success).toBe(true);
    });

    it('accepts { conditionResult: false }', () => {
      const result = ifSchema.safeParse({ conditionResult: false });
      expect(result.success).toBe(true);
    });

    it('rejects non-boolean conditionResult', () => {
      const result = ifSchema.safeParse({ conditionResult: 'yes' });
      expect(result.success).toBe(false);
    });

    it('rejects missing conditionResult', () => {
      const result = ifSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects null conditionResult', () => {
      const result = ifSchema.safeParse({ conditionResult: null });
      expect(result.success).toBe(false);
    });
  });

  it('is a Record<string, z.ZodSchema>', () => {
    for (const [key, schema] of Object.entries(structuralStepOutputSchemas)) {
      expect(typeof key).toBe('string');
      expect(schema).toBeInstanceOf(z.ZodObject);
    }
  });

  it('does not include non-structural step types like foreach, retry, or wait', () => {
    expect(structuralStepOutputSchemas).not.toHaveProperty('foreach');
    expect(structuralStepOutputSchemas).not.toHaveProperty('retry');
    expect(structuralStepOutputSchemas).not.toHaveProperty('wait');
  });
});
