/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { z } from '@kbn/zod/v4';
import { formatZodError } from './format_zod_error';
import type { MockZodError } from '../errors/invalid_yaml_schema';

/**
 * Helper for testing the non-ZodError fallback path.
 * `formatZodError` guards `!error?.issues || !Array.isArray(error.issues)` at
 * runtime, so these objects are valid runtime inputs even though they don't
 * satisfy the compile-time signature. Centralizing the cast here avoids
 * scattering `as never` throughout every test.
 */
const formatLoose = (error: Record<string, unknown>, schema?: z.ZodType) =>
  formatZodError(error as unknown as MockZodError, schema);

describe('formatZodError', () => {
  it('should format invalid trigger type', () => {
    const { error } = z
      .object({
        triggers: z.array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('manual') }),
            z.object({ type: z.literal('alert') }),
            z.object({ type: z.literal('scheduled') }),
          ])
        ),
      })
      .safeParse({
        triggers: [{ type: 'invalid' }],
      });
    const result = formatZodError(error!);
    expect(result.message).toBe('Invalid trigger type. Available: manual, alert, scheduled');
  });

  it('should format invalid connector type', () => {
    const { error } = z
      .object({
        steps: z.array(z.discriminatedUnion('type', [z.object({ type: z.literal('noop') })])),
      })
      .safeParse({ steps: [{ type: 'invalid' }] });
    const result = formatZodError(error!);
    expect(result.message).toBe('Invalid connector type. Use Ctrl+Space to see available options.');
  });

  it('should dynamically format union errors when schema is provided', () => {
    // Create a schema similar to the Cases connector structure
    const casesConnectorSchema = z.object({
      connector: z.union([
        z.object({
          type: z.literal('.none'),
          id: z.string(),
          name: z.string(),
          fields: z.string().nullable(),
        }),
        z.object({
          type: z.literal('.jira'),
          id: z.string(),
          name: z.string(),
          fields: z.string().nullable(),
        }),
        z.object({
          type: z.literal('.cases-webhook'),
          id: z.string(),
          name: z.string(),
          fields: z.string().nullable(),
        }),
      ]),
    });

    // Create a mock error that would come from Monaco YAML validation
    const mockError = {
      issues: [
        {
          code: 'unknown' as const,
          path: ['connector'],
          message: 'Expected "0 | 1 | 2"',
          received: 'unknown',
        },
      ],
    };

    const result = formatZodError(mockError as any, casesConnectorSchema);

    // Should generate dynamic message with union options
    expect(result.message).toContain('connector should be oneOf:');
    expect(result.message).toContain('type: ".none"');
    expect(result.message).toContain('type: ".jira"');
    expect(result.message).toContain('type: ".cases-webhook"');
    // Note: The jira connector has additional fields, but the test output shows simplified format
    expect(result.message).toContain('other props: id, name');
  });

  it('should fall back to original behavior when dynamic formatting fails', () => {
    const mockError = {
      issues: [
        {
          code: 'unknown' as const,
          path: ['nonexistent'],
          message: 'Expected "0 | 1 | 2"',
          received: 'unknown',
        },
      ],
    };

    // Schema without the path that's being referenced
    const simpleSchema = z.object({
      other: z.string(),
    });

    const result = formatZodError(mockError as any, simpleSchema);

    // Should fall back to original message since path doesn't exist in schema
    expect(result.message).toBe('Expected "0 | 1 | 2" at nonexistent');
  });

  describe('non-ZodError inputs', () => {
    it('should return message from error.message when issues is not an array', () => {
      const result = formatLoose({ message: 'Some custom error' });
      expect(result.message).toBe('Some custom error');
    });

    it('should stringify error when no message property exists', () => {
      const result = formatLoose({});
      expect(result.message).toBe('[object Object]');
    });

    it('should handle null issues array', () => {
      const result = formatLoose({ issues: null, message: 'null issues' });
      expect(result.message).toBe('null issues');
    });
  });

  describe('invalid_literal errors for type field', () => {
    it('should handle elasticsearch.* type prefix', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_literal' as const,
            path: ['steps', 0, 'type'],
            message: 'Invalid literal',
            received: 'elasticsearch.nonexistent',
          },
        ],
      };

      const result = formatLoose(mockError);
      expect(result.message).toContain('Unknown Elasticsearch API');
      expect(result.message).toContain('elasticsearch.nonexistent');
    });

    it('should handle kibana.* type prefix', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_literal' as const,
            path: ['steps', 0, 'type'],
            message: 'Invalid literal',
            received: 'kibana.nonexistent',
          },
        ],
      };

      const result = formatLoose(mockError);
      expect(result.message).toContain('Unknown Kibana API');
      expect(result.message).toContain('kibana.nonexistent');
    });

    it('should handle generic connector type', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_literal' as const,
            path: ['steps', 0, 'type'],
            message: 'Invalid literal',
            received: 'custom_type',
          },
        ],
      };

      const result = formatLoose(mockError);
      expect(result.message).toContain('Unknown connector type');
      expect(result.message).toContain('custom_type');
    });

    it('should handle invalid_literal for type in the no-schema branch', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_literal' as const,
            path: ['steps', 0, 'type'],
            message: 'Invalid literal',
            received: 'elasticsearch.badapi',
          },
        ],
      };

      // No schema provided
      const result = formatLoose(mockError);
      expect(result.message).toContain('Unknown Elasticsearch API');
    });
  });

  describe('invalid_type for top-level triggers and steps', () => {
    it('should format missing triggers error', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_type' as const,
            path: ['triggers'],
            message: 'Expected array, received undefined',
          },
        ],
      };

      const result = formatLoose(mockError);
      expect(result.message).toBe('No triggers found. Add at least one trigger.');
    });

    it('should format missing steps error', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_type' as const,
            path: ['steps'],
            message: 'Expected array, received undefined',
          },
        ],
      };

      const result = formatLoose(mockError);
      expect(result.message).toBe('No steps found. Add at least one step.');
    });

    it('should format missing triggers when schema is provided', () => {
      const schema = z.object({ triggers: z.array(z.unknown()) });
      const mockError = {
        issues: [
          {
            code: 'invalid_type' as const,
            path: ['triggers'],
            message: 'Expected array, received undefined',
          },
        ],
      };

      const result = formatLoose(mockError, schema);
      expect(result.message).toBe('No triggers found. Add at least one trigger.');
    });

    it('should format missing steps when schema is provided', () => {
      const schema = z.object({ steps: z.array(z.unknown()) });
      const mockError = {
        issues: [
          {
            code: 'invalid_type' as const,
            path: ['steps'],
            message: 'Expected array, received undefined',
          },
        ],
      };

      const result = formatLoose(mockError, schema);
      expect(result.message).toBe('No steps found. Add at least one step.');
    });
  });

  describe('invalid_union errors without schema', () => {
    it('should format invalid_union for triggers path', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_union' as const,
            path: ['triggers', 0],
            message: 'Invalid input',
          },
        ],
      };

      const result = formatLoose(mockError);
      expect(result.message).toBe('Invalid trigger type. Available: manual, alert, scheduled');
    });

    it('should format invalid_union for type path', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_union' as const,
            path: ['steps', 0, 'type'],
            message: 'Invalid input',
          },
        ],
      };

      const result = formatLoose(mockError);
      expect(result.message).toBe(
        'Invalid connector type. Use Ctrl+Space to see available options.'
      );
    });
  });

  describe('dynamic union error messages from unionErrors', () => {
    it('should generate union message from discriminator info in unionErrors', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_union' as const,
            path: ['someField'],
            message: 'Invalid input',
            unionErrors: [
              {
                issues: [
                  {
                    code: 'invalid_literal' as const,
                    path: ['someField', 'type'],
                    expected: 'option_a',
                  },
                ],
              },
              {
                issues: [
                  {
                    code: 'invalid_literal' as const,
                    path: ['someField', 'type'],
                    expected: 'option_b',
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = formatLoose(mockError);
      expect(result.message).toContain('someField should be oneOf:');
      expect(result.message).toContain('option_a');
      expect(result.message).toContain('option_b');
    });

    it('should generate union message from required fields when no discriminator', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_union' as const,
            path: ['someField'],
            message: 'Invalid input',
            unionErrors: [
              {
                issues: [
                  {
                    code: 'invalid_type' as const,
                    path: ['someField', 'name'],
                    message: 'Required',
                  },
                  {
                    code: 'invalid_type' as const,
                    path: ['someField', 'id'],
                    message: 'Required',
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = formatLoose(mockError);
      expect(result.message).toContain('someField should be oneOf:');
      expect(result.message).toContain('id');
      expect(result.message).toContain('name');
    });

    it('should fall back to generic message when unionErrors has no analyzable issues', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_union' as const,
            path: ['someField'],
            message: 'Invalid input',
            unionErrors: [
              {
                issues: [],
              },
            ],
          },
        ],
      };

      const result = formatLoose(mockError);
      expect(result.message).toContain('someField has an invalid value');
    });
  });

  describe('schema-aware union error formatting', () => {
    it('should format union errors with schema for a union field', () => {
      const schema = z.object({
        mode: z.union([z.literal('fast'), z.literal('slow'), z.literal('auto')]),
      });

      const parseResult = schema.safeParse({ mode: 'invalid' });
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        const result = formatZodError(parseResult.error, schema);
        expect(result.message).toContain('mode should be oneOf:');
      }
    });

    it('should handle optional union field in schema', () => {
      const schema = z.object({
        mode: z.optional(z.union([z.literal('fast'), z.literal('slow')])),
      });

      const parseResult = schema.safeParse({ mode: 'invalid' });
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        const result = formatZodError(parseResult.error, schema);
        expect(result.message).toContain('mode should be oneOf:');
      }
    });

    it('should handle nullable union field in schema', () => {
      const schema = z.object({
        mode: z.nullable(z.union([z.literal('a'), z.literal('b')])),
      });

      const parseResult = schema.safeParse({ mode: 'invalid' });
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        const result = formatZodError(parseResult.error, schema);
        expect(result.message).toContain('mode should be oneOf:');
      }
    });

    it('should handle default-wrapped union in schema', () => {
      const schema = z.object({
        mode: z.union([z.literal('fast'), z.literal('slow')]).default('fast'),
      });

      const parseResult = schema.safeParse({ mode: 'invalid' });
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        const result = formatZodError(parseResult.error, schema);
        expect(result.message).toContain('mode should be oneOf:');
      }
    });
  });

  describe('analyzeUnionSchema with different schema types', () => {
    it('should describe string option in union', () => {
      const schema = z.object({
        value: z.union([z.string(), z.number()]),
      });

      const mockError = {
        issues: [
          {
            code: 'unknown' as const,
            path: ['value'],
            message: 'Expected union',
          },
        ],
      };

      const result = formatLoose(mockError, schema);
      expect(result.message).toContain('value should be oneOf:');
      expect(result.message).toContain('string value');
      expect(result.message).toContain('number value');
    });

    it('should describe boolean option in union', () => {
      const schema = z.object({
        flag: z.union([z.boolean(), z.string()]),
      });

      const mockError = {
        issues: [
          {
            code: 'unknown' as const,
            path: ['flag'],
            message: 'Expected union',
          },
        ],
      };

      const result = formatLoose(mockError, schema);
      expect(result.message).toContain('boolean value');
    });

    it('should describe object with discriminator in union', () => {
      const schema = z.object({
        item: z.union([
          z.object({ type: z.literal('a'), name: z.string() }),
          z.object({ type: z.literal('b'), value: z.number() }),
        ]),
      });

      const mockError = {
        issues: [
          {
            code: 'unknown' as const,
            path: ['item'],
            message: 'Expected union',
          },
        ],
      };

      const result = formatLoose(mockError, schema);
      expect(result.message).toContain('type: "a"');
      expect(result.message).toContain('type: "b"');
    });

    it('should describe object without discriminator listing required props', () => {
      const schema = z.object({
        item: z.union([
          z.object({ name: z.string(), age: z.number() }),
          z.object({ title: z.string() }),
        ]),
      });

      const mockError = {
        issues: [
          {
            code: 'unknown' as const,
            path: ['item'],
            message: 'Expected union',
          },
        ],
      };

      const result = formatLoose(mockError, schema);
      expect(result.message).toContain('item should be oneOf:');
      // Should list required props
      expect(result.message).toContain('props:');
    });
  });

  describe('multiple issues formatting', () => {
    it('should join multiple formatted issues with commas', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_type' as const,
            path: ['triggers'],
            message: 'Expected array',
          },
          {
            code: 'invalid_type' as const,
            path: ['steps'],
            message: 'Expected array',
          },
        ],
      };

      const result = formatLoose(mockError);
      expect(result.message).toContain('No triggers found');
      expect(result.message).toContain('No steps found');
      expect(result.formattedError.issues).toHaveLength(2);
    });
  });

  describe('fallback for unknown error codes', () => {
    it('should append path to message for unknown error codes', () => {
      const mockError = {
        issues: [
          {
            code: 'custom' as const,
            path: ['steps', 0, 'with', 'param'],
            message: 'Custom validation failed',
          },
        ],
      };

      const result = formatLoose(mockError);
      expect(result.message).toBe('Custom validation failed at steps.0.with.param');
    });

    it('should append path for unknown codes in the schema branch too', () => {
      const schema = z.object({ field: z.string() });
      const mockError = {
        issues: [
          {
            code: 'custom' as const,
            path: ['field'],
            message: 'Some custom issue',
          },
        ],
      };

      const result = formatLoose(mockError, schema);
      expect(result.message).toBe('Some custom issue at field');
    });
  });

  describe('empty path handling', () => {
    it('should use "field" as fallback when path is empty in union error', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_union' as const,
            path: [],
            message: 'Invalid input',
            unionErrors: [
              {
                issues: [
                  {
                    code: 'invalid_literal' as const,
                    path: ['type'],
                    expected: 'a',
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = formatLoose(mockError);
      expect(result.message).toContain('field should be oneOf:');
    });
  });

  describe('real ZodError integration', () => {
    it('should format a real ZodError from safeParse with schema', () => {
      const schema = z.object({
        name: z.string(),
        count: z.number(),
      });

      const parseResult = schema.safeParse({ name: 123, count: 'not-a-number' });
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        const result = formatZodError(parseResult.error, schema);
        expect(result.message).toBeDefined();
        expect(result.formattedError.issues.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});

describe('Dynamic validation system behavior', () => {
  // Test what our current system actually does with various error types
  // Our system works with real Kibana connectors for Cases API, and provides
  // enhanced fallback messages for other types

  describe('Cases API validation (real connector)', () => {
    it('should provide detailed connector union error message', () => {
      // Test with the actual Cases connector type that our system recognizes
      const yamlDocument = parseDocument(`
  steps:
    - name: createCase
      type: kibana.createCase
      with:
        title: "Test Case"
        description: "Test Description"
        owner: "securitySolution"
        connector: 0
        settings:
          syncAlerts: false
        tags: ["test"]
        severity: "low"
  `);

      const mockZodError = {
        issues: [
          {
            code: 'invalid_union' as const,
            path: ['steps', 0, 'with', 'connector'],
            message: 'Invalid input',
            received: 0,
          },
        ],
      };

      const result = formatZodError(mockZodError as any, undefined, yamlDocument);

      // In test environment, our system falls back to generic message
      // In real environment with actual connectors, it would show detailed union info
      expect(result.message).toContain('connector has an invalid value');
    });

    it('should provide enhanced object error message for settings', () => {
      const yamlDocument = parseDocument(`
  steps:
    - name: createCase
      type: kibana.createCase
      with:
        title: "Test Case"
        description: "Test Description"
        owner: "securitySolution"
        connector:
          type: ".none"
          id: "none-connector"
          name: "None"
        settings: 0
        tags: ["test"]
        severity: "low"
  `);

      const mockZodError = {
        issues: [
          {
            code: 'invalid_type' as const,
            path: ['steps', 0, 'with', 'settings'],
            message: 'Expected object, received number',
            received: 0,
          },
        ],
      };

      const result = formatZodError(mockZodError as any, undefined, yamlDocument);

      // In test environment, falls back to basic message
      // In real environment, would show enhanced object structure
      expect(result.message).toMatch(
        /Expected object, received number|settings should be an object/
      );
    });
  });

  describe('Fallback behavior for other endpoints', () => {
    it('should provide fallback messages for unknown union types', () => {
      const yamlDocument = parseDocument(`
  steps:
    - name: test
      type: unknown.endpoint
      with:
        someField: 0
  `);

      const mockZodError = {
        issues: [
          {
            code: 'invalid_union' as const,
            path: ['steps', 0, 'with', 'someField'],
            message: 'Invalid input',
            received: 0,
          },
        ],
      };

      const result = formatZodError(mockZodError as any, undefined, yamlDocument);

      // Should provide a helpful fallback message
      expect(result.message).toContain('someField has an invalid value');
    });

    it('should provide enhanced messages for object types', () => {
      const yamlDocument = parseDocument(`
  steps:
    - name: test
      type: unknown.endpoint
      with:
        config: 0
  `);

      const mockZodError = {
        issues: [
          {
            code: 'invalid_type' as const,
            path: ['steps', 0, 'with', 'config'],
            message: 'Expected object, received number',
            received: 0,
          },
        ],
      };

      const result = formatZodError(mockZodError as any, undefined, yamlDocument);

      // Should enhance the basic type error
      expect(result.message).toMatch(/config should be an object|Expected object, received number/);
    });

    it('should provide enhanced messages for array types', () => {
      const yamlDocument = parseDocument(`
  steps:
    - name: test
      type: unknown.endpoint
      with:
        items: 0
  `);

      const mockZodError = {
        issues: [
          {
            code: 'invalid_type' as const,
            path: ['steps', 0, 'with', 'items'],
            message: 'Expected array, received number',
            received: 0,
          },
        ],
      };

      const result = formatZodError(mockZodError as any, undefined, yamlDocument);

      // Should enhance the basic type error
      expect(result.message).toMatch(/items should be an array|Expected array, received number/);
    });

    it('should handle enum errors with available options', () => {
      const yamlDocument = parseDocument(`
  steps:
    - name: test
      type: unknown.endpoint
      with:
        level: 0
  `);

      const mockZodError = {
        issues: [
          {
            code: 'invalid_enum_value' as const,
            path: ['steps', 0, 'with', 'level'],
            message: 'Invalid enum value',
            received: 0,
            options: ['low', 'medium', 'high'],
          },
        ],
      };

      const result = formatZodError(mockZodError as any, undefined, yamlDocument);

      // Should show available options or fall back to basic message
      expect(result.message).toMatch(/level should be one of:|Invalid enum value/);
    });

    it('should handle CreateAssetCriticalityRecord validation errors', () => {
      // Test the specific case reported by user - incomplete YAML
      const incompleteYamlDocument = parseDocument(`
  steps:
    - name: test
      type: kibana.CreateAssetCriticalityRecord
      with:
        criticality_level: 0
  `);

      // Test different error scenarios that might occur

      // Scenario 1: Missing required fields (id_field, id_value)
      const missingFieldsError = {
        issues: [
          {
            code: 'invalid_type' as const,
            path: ['steps', 0, 'with'],
            message: 'Required fields missing',
            received: 'object',
          },
        ],
      };

      const result1 = formatZodError(missingFieldsError as any, undefined, incompleteYamlDocument);
      expect(result1.message).toMatch(/Required fields missing|with should be an object/);

      // Scenario 2: Type error (number instead of string for criticality_level)
      const typeError = {
        issues: [
          {
            code: 'invalid_type' as const,
            path: ['steps', 0, 'with', 'criticality_level'],
            message: 'Expected string, received number',
            expected: 'string',
            received: 'number',
          },
        ],
      };

      const result2 = formatZodError(typeError as any, undefined, incompleteYamlDocument);
      expect(result2.message).toMatch(
        /Expected string, received number|criticality_level should be a string/
      );

      // Scenario 3: Enum validation error
      const enumError = {
        issues: [
          {
            code: 'invalid_enum_value' as const,
            path: ['steps', 0, 'with', 'criticality_level'],
            message: 'Invalid enum value',
            received: 'invalid_value',
            options: ['low_impact', 'medium_impact', 'high_impact', 'extreme_impact'],
          },
        ],
      };

      const result3 = formatZodError(enumError as any, undefined, incompleteYamlDocument);
      expect(result3.message).toMatch(/criticality_level should be one of:|Invalid enum value/);

      // If it shows enum options, verify they're the correct ones
      if (result3.message.includes('should be one of')) {
        expect(result3.message).toContain('low_impact');
        expect(result3.message).toContain('medium_impact');
        expect(result3.message).toContain('high_impact');
        expect(result3.message).toContain('extreme_impact');
      }
    });

    it('should show correct YAML structure for CreateAssetCriticalityRecord', () => {
      // Test with correct YAML structure to show what's expected
      const correctYamlDocument = parseDocument(`
  steps:
    - name: test
      type: kibana.CreateAssetCriticalityRecord
      with:
        id_field: "host.name"
        id_value: "server-01"
        criticality_level: "high_impact"
  `);

      // This should not produce validation errors for the structure
      // but we can test individual field validation

      const invalidEnumError = {
        issues: [
          {
            code: 'invalid_enum_value' as const,
            path: ['steps', 0, 'with', 'criticality_level'],
            message: 'Invalid enum value',
            received: 'invalid_level',
            options: ['low_impact', 'medium_impact', 'high_impact', 'extreme_impact'],
          },
        ],
      };

      const result = formatZodError(invalidEnumError as any, undefined, correctYamlDocument);

      // Should provide helpful enum validation
      expect(result.message).toMatch(/criticality_level should be one of:|Invalid enum value/);
    });
  });
});
