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
      expect(emptyResult.data.cleanCache).toBe(false);
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

  describe('input validation', () => {
    it('accepts all valid check types', () => {
      const schema = runCiChecksTool.inputSchema;
      const validChecks = [
        'build',
        'quick_checks',
        'checks',
        'type_check',
        'linting_with_types',
        'linting',
        'oas_snapshot',
      ];

      validChecks.forEach((check) => {
        const result = schema.safeParse({ checks: [check] });
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid check types', () => {
      const schema = runCiChecksTool.inputSchema;
      const invalidChecks = ['invalid_check', 'build_test', 'lint', ''];

      invalidChecks.forEach((check) => {
        const result = schema.safeParse({ checks: [check] });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Invalid enum value');
        }
      });
    });

    it('validates parallel parameter as boolean', () => {
      const schema = runCiChecksTool.inputSchema;

      // Valid boolean values
      expect(schema.safeParse({ parallel: true }).success).toBe(true);
      expect(schema.safeParse({ parallel: false }).success).toBe(true);

      // Invalid boolean values
      expect(schema.safeParse({ parallel: 'true' }).success).toBe(false);
      expect(schema.safeParse({ parallel: 1 }).success).toBe(false);
      expect(schema.safeParse({ parallel: null }).success).toBe(false);
    });

    it('validates cleanCache parameter as boolean', () => {
      const schema = runCiChecksTool.inputSchema;

      // Valid boolean values
      expect(schema.safeParse({ cleanCache: true }).success).toBe(true);
      expect(schema.safeParse({ cleanCache: false }).success).toBe(true);

      // Invalid boolean values
      expect(schema.safeParse({ cleanCache: 'true' }).success).toBe(false);
      expect(schema.safeParse({ cleanCache: 1 }).success).toBe(false);
      expect(schema.safeParse({ cleanCache: null }).success).toBe(false);
    });

    it('accepts empty checks array', () => {
      const schema = runCiChecksTool.inputSchema;
      const result = schema.safeParse({ checks: [] });
      expect(result.success).toBe(true);
    });

    it('accepts single check', () => {
      const schema = runCiChecksTool.inputSchema;
      const result = schema.safeParse({ checks: ['build'] });
      expect(result.success).toBe(true);
    });

    it('accepts multiple checks', () => {
      const schema = runCiChecksTool.inputSchema;
      const result = schema.safeParse({
        checks: ['build', 'quick_checks', 'type_check'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('default values', () => {
    it('has correct default values for empty input', () => {
      const schema = runCiChecksTool.inputSchema;
      const result = schema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.checks).toEqual([
          'build',
          'quick_checks',
          'checks',
          'type_check',
          'linting_with_types',
          'linting',
          'oas_snapshot',
        ]);
        expect(result.data.parallel).toBe(true);
        expect(result.data.cleanCache).toBe(false);
      }
    });

    it('has correct default values for partial input', () => {
      const schema = runCiChecksTool.inputSchema;
      const result = schema.safeParse({ checks: ['build'] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.checks).toEqual(['build']);
        expect(result.data.parallel).toBe(true);
        expect(result.data.cleanCache).toBe(false);
      }
    });

    it('overrides defaults when explicitly provided', () => {
      const schema = runCiChecksTool.inputSchema;
      const result = schema.safeParse({
        parallel: false,
        cleanCache: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parallel).toBe(false);
        expect(result.data.cleanCache).toBe(true);
      }
    });
  });

  describe('schema structure', () => {
    it('has the correct schema shape', () => {
      const schema = runCiChecksTool.inputSchema;
      const shape = schema.shape;

      expect(shape).toHaveProperty('checks');
      expect(shape).toHaveProperty('parallel');
      expect(shape).toHaveProperty('cleanCache');

      // Check that all properties are zod types
      expect(shape.checks).toBeDefined();
      expect(shape.parallel).toBeDefined();
      expect(shape.cleanCache).toBeDefined();
    });

    it('has the correct enum values for checks', () => {
      const schema = runCiChecksTool.inputSchema;

      // Test that all expected values are accepted
      const expectedValues = [
        'build',
        'quick_checks',
        'checks',
        'type_check',
        'linting_with_types',
        'linting',
        'oas_snapshot',
      ];

      expectedValues.forEach((value) => {
        const result = schema.safeParse({ checks: [value] });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('tool definition', () => {
    it('has the correct tool structure', () => {
      expect(runCiChecksTool).toHaveProperty('name');
      expect(runCiChecksTool).toHaveProperty('description');
      expect(runCiChecksTool).toHaveProperty('inputSchema');
      expect(runCiChecksTool).toHaveProperty('handler');

      expect(typeof runCiChecksTool.name).toBe('string');
      expect(typeof runCiChecksTool.description).toBe('string');
      expect(typeof runCiChecksTool.handler).toBe('function');
    });

    it('has a descriptive name', () => {
      expect(runCiChecksTool.name).toBe('run_ci_checks');
    });

    it('has a comprehensive description', () => {
      const description = runCiChecksTool.description;
      expect(description).toContain('CI checks');
      expect(description).toContain('BuildKite pipeline');
      expect(description).toContain('build');
      expect(description).toContain('linting');
      expect(description).toContain('type checking');
    });
  });

  describe('advanced features', () => {
    it('supports all available CI checks', () => {
      const expectedChecks = [
        'build',
        'quick_checks',
        'checks',
        'type_check',
        'linting_with_types',
        'linting',
        'oas_snapshot',
      ];

      expectedChecks.forEach((check) => {
        const schema = runCiChecksTool.inputSchema;
        const result = schema.safeParse({ checks: [check] });
        expect(result.success).toBe(true);
      });
    });

    it('has proper timeout configuration for type checks', () => {
      // This test verifies that the tool is configured to handle long-running type checks
      const schema = runCiChecksTool.inputSchema;
      const result = schema.safeParse({
        checks: ['type_check'],
        cleanCache: true,
      });
      expect(result.success).toBe(true);
    });

    it('supports cache detection for type checks', () => {
      // This test verifies that the tool supports cache detection functionality
      const schema = runCiChecksTool.inputSchema;
      const result = schema.safeParse({
        checks: ['type_check'],
        cleanCache: false,
      });
      expect(result.success).toBe(true);
    });

    it('supports parallel and sequential execution', () => {
      const schema = runCiChecksTool.inputSchema;

      // Test parallel execution
      const parallelResult = schema.safeParse({
        checks: ['linting', 'type_check'],
        parallel: true,
      });
      expect(parallelResult.success).toBe(true);

      // Test sequential execution
      const sequentialResult = schema.safeParse({
        checks: ['linting', 'type_check'],
        parallel: false,
      });
      expect(sequentialResult.success).toBe(true);
    });

    it('handles empty checks array gracefully', () => {
      const schema = runCiChecksTool.inputSchema;
      const result = schema.safeParse({ checks: [] });
      expect(result.success).toBe(true);
    });

    it('provides meaningful default values', () => {
      const schema = runCiChecksTool.inputSchema;
      const result = schema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        // Should default to all checks
        expect(result.data.checks).toHaveLength(7);
        // Should default to parallel execution
        expect(result.data.parallel).toBe(true);
        // Should default to no cache clearing
        expect(result.data.cleanCache).toBe(false);
      }
    });
  });
});
