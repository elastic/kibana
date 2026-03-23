/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { z } from '@kbn/zod/v4';
import * as fromJSONSchemaModule from '@kbn/zod/v4/from_json_schema';
import { WaitForInputStepDefinition } from './wait_for_input_step';

describe('WaitForInputStepDefinition', () => {
  const getOutputSchema =
    WaitForInputStepDefinition.editorHandlers!.dynamicSchema!.getOutputSchema!;

  it('should return a record schema when no input schema is provided', () => {
    const result = getOutputSchema({ input: {}, config: {} });
    expect(result).toBeDefined();
    // z.record(z.string(), z.unknown()) accepts any object
    const parsed = result.safeParse({ anyKey: 42 });
    expect(parsed.success).toBe(true);
  });

  it('should return a record schema when input is undefined', () => {
    const result = getOutputSchema({ input: undefined, config: {} });
    expect(result).toBeDefined();
    const parsed = result.safeParse({ foo: 'bar' });
    expect(parsed.success).toBe(true);
  });

  it('should return a typed schema when input.schema is a valid JSON Schema', () => {
    const jsonSchema = {
      type: 'object' as const,
      properties: {
        approved: { type: 'boolean' as const },
        reason: { type: 'string' as const },
      },
      required: ['approved'],
    } satisfies JsonModelSchemaType;
    const result = getOutputSchema({ input: { schema: jsonSchema }, config: {} });
    expect(result).toBeDefined();

    // Valid input
    const valid = result.safeParse({ approved: true, reason: 'ok' });
    expect(valid.success).toBe(true);

    // Missing required field
    const invalid = result.safeParse({ reason: 'missing approved' });
    expect(invalid.success).toBe(false);
  });

  it('should handle optional fields with defaults in the schema', () => {
    const jsonSchema = {
      type: 'object' as const,
      properties: {
        approved: { type: 'boolean' as const },
        note: { type: 'string' as const, default: 'no comment' },
      },
      required: ['approved'],
    } satisfies JsonModelSchemaType;
    const result = getOutputSchema({ input: { schema: jsonSchema }, config: {} });

    // Omitting optional field with default should succeed
    const parsed = result.safeParse({ approved: false });
    expect(parsed.success).toBe(true);
  });

  it('should fall back to record schema when fromJSONSchema returns undefined', () => {
    // A schema that fromJSONSchema can't handle (e.g. $ref)
    const unsupportedSchema = { $ref: '#/definitions/Foo' } as JsonModelSchemaType;
    const result = getOutputSchema({ input: { schema: unsupportedSchema }, config: {} });
    expect(result).toBeDefined();

    // Should accept anything (fallback)
    const parsed = result.safeParse({ anything: true });
    expect(parsed.success).toBe(true);
  });

  it('should fall back to record schema when fromJSONSchema throws', () => {
    const spy = jest.spyOn(fromJSONSchemaModule, 'fromJSONSchema').mockImplementationOnce(() => {
      throw new Error('Unsupported schema construct');
    });

    const schema = { type: 'object' as const } satisfies JsonModelSchemaType;
    const result = getOutputSchema({ input: { schema }, config: {} });

    // Must not throw and must return the permissive fallback.
    expect(result).toBeDefined();
    const parsed = result.safeParse({ anything: true });
    expect(parsed.success).toBe(true);

    spy.mockRestore();
  });

  it('should have the correct step id', () => {
    expect(WaitForInputStepDefinition.id).toBe('waitForInput');
  });

  it('should have an outputSchema defined', () => {
    expect(WaitForInputStepDefinition.outputSchema).toBeDefined();
    expect(WaitForInputStepDefinition.outputSchema).toBeInstanceOf(z.ZodType);
  });
});
