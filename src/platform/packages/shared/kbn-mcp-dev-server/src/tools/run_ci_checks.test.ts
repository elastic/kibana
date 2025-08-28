/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { runCiChecksTool } from './run_ci_checks';

describe('runCiChecksTool', () => {
  it('has the correct name and description', () => {
    expect(runCiChecksTool.name).toBe('run_ci_checks');
    expect(runCiChecksTool.description).toContain('CI checks');
    expect(runCiChecksTool.description).toContain('BuildKite pipeline');
  });

  it('has a valid input schema', () => {
    const schema = runCiChecksTool.inputSchema;
    expect(schema).toBeInstanceOf(z.ZodObject);

    // Test that the schema has the expected properties
    const shape = schema.shape;
    expect(shape).toHaveProperty('checks');
    expect(shape).toHaveProperty('parallel');

    // Test that the properties exist and are zod types
    expect(shape.checks).toBeDefined();
    expect(shape.parallel).toBeDefined();
  });

  it('validates input correctly', () => {
    const schema = runCiChecksTool.inputSchema;

    // Test valid input
    const validInput = {
      checks: ['build', 'quick_checks'],
      parallel: true,
    };
    const validResult = schema.safeParse(validInput);
    expect(validResult.success).toBe(true);

    // Test invalid check name
    const invalidInput = {
      checks: ['invalid_check'],
      parallel: false,
    };
    const invalidResult = schema.safeParse(invalidInput);
    expect(invalidResult.success).toBe(false);

    // Test default values
    const emptyInput = {};
    const emptyResult = schema.safeParse(emptyInput);
    expect(emptyResult.success).toBe(true);
    if (emptyResult.success) {
      expect(emptyResult.data.checks).toEqual([
        'build',
        'quick_checks',
        'checks',
        'type_check',
        'linting_with_types',
        'linting',
        'oas_snapshot',
      ]);
      expect(emptyResult.data.parallel).toBe(true);
      expect(emptyResult.data.clean_cache).toBe(false);
    }
  });

  it('has a handler function', () => {
    expect(typeof runCiChecksTool.handler).toBe('function');
  });

  it('has an async handler function', () => {
    const handler = runCiChecksTool.handler;
    expect(typeof handler).toBe('function');
    // Test that it's async by checking the function signature
    // Don't actually call the handler to avoid creating child processes in tests
    expect(handler.constructor.name).toBe('AsyncFunction');
  });
});
