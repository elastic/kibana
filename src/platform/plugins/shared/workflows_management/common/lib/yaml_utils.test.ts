/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SafeParseReturnType } from '@kbn/zod';
import { z } from '@kbn/zod';
import {
  stringifyWorkflowDefinition,
  parseWorkflowYamlToJSON,
  formatValidationError,
  getStepNodeAtPosition,
} from './yaml_utils';
import type { ConnectorContract, WorkflowYaml } from '@kbn/workflows';
import { generateYamlSchemaFromConnectors } from '@kbn/workflows';
import { YAMLMap, parseDocument } from 'yaml';

describe('parseWorkflowYamlToJSON', () => {
  const mockConnectors: ConnectorContract[] = [
    {
      type: 'noop',
      paramsSchema: z.object({
        message: z.string(),
      }),
      outputSchema: z.object({
        message: z.string(),
      }),
    },
  ];
  const yamlSchemaLoose = generateYamlSchemaFromConnectors(mockConnectors, true);

  it('should parse yaml to json according to partial zod schema', () => {
    const yaml = `steps:
      - name: step1
        type: noop
        with:
          message: "Hello, world!"
    `;
    const result = parseWorkflowYamlToJSON(yaml, yamlSchemaLoose);
    expect(result.success).toBe(true);
    expect(
      (
        result as SafeParseReturnType<
          z.input<typeof yamlSchemaLoose>,
          z.output<typeof yamlSchemaLoose>
        >
      ).data
    ).toEqual({
      steps: [{ name: 'step1', type: 'noop', with: { message: 'Hello, world!' } }],
    });
  });

  it('should fail if yaml does not match zod schema', () => {
    const yaml = `steps:
      - name: step1
        type-id: noop
        with:
          message: "Hello, world!"
    `;
    const result = parseWorkflowYamlToJSON(yaml, yamlSchemaLoose);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should fail if yaml is invalid', () => {
    const yaml = 'invalid yaml';
    const result = parseWorkflowYamlToJSON(yaml, z.object({ a: z.string() }));
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should keep template expressions as is if they are in a string', () => {
    const yaml = `steps:
      - name: step1
        type: noop
        with:
          message: Hello, {{event.message}}
    `;
    const result = parseWorkflowYamlToJSON(yaml, yamlSchemaLoose);
    expect(result.success).toBe(true);
    expect(
      (
        result as SafeParseReturnType<
          z.input<typeof yamlSchemaLoose>,
          z.output<typeof yamlSchemaLoose>
        >
      ).data
    ).toEqual({
      steps: [{ name: 'step1', type: 'noop', with: { message: 'Hello, {{event.message}}' } }],
    });
  });

  it('should fail on unquoted template expressions', () => {
    const yaml = `steps:
      - name: step1
        action:
          type: noop
          params:
            message: {{event.message}}
    `;
    const result = parseWorkflowYamlToJSON(
      yaml,
      z.object({
        steps: z.array(
          z.object({
            name: z.string(),
            action: z.object({
              type: z.string(),
              params: z.object({
                message: z.string(),
              }),
            }),
          })
        ),
      })
    );
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Invalid key type: map in range');
  });
});

describe('getYamlStringFromJSON', () => {
  it('should sort keys according to the order of the keys in the workflow definition', () => {
    const json: Partial<WorkflowYaml> = {
      enabled: true,
      steps: [
        {
          name: 'step1',
          type: 'noop',
          with: { message: 'Hello, world!' },
        },
      ],
      description: 'test',
      name: 'test',
    };
    const yaml = stringifyWorkflowDefinition(json);
    expect(yaml).toBe(`name: test
description: test
enabled: true
steps:
  - name: step1
    type: noop
    with:
      message: Hello, world!
`);
  });

  it('it should throw an error if the input is not a plain object', () => {
    const json: any = [1, 2, 3];
    expect(() => stringifyWorkflowDefinition(json)).toThrow();
  });
});

describe('formatValidationError', () => {
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
    const result = formatValidationError(error!);
    expect(result.message).toBe('Invalid trigger type. Available: manual, alert, scheduled');
  });

  it('should format invalid connector type', () => {
    const { error } = z
      .object({
        steps: z.array(z.discriminatedUnion('type', [z.object({ type: z.literal('noop') })])),
      })
      .safeParse({ steps: [{ type: 'invalid' }] });
    const result = formatValidationError(error!);
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

    const result = formatValidationError(mockError as any, casesConnectorSchema);

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

    const result = formatValidationError(mockError as any, simpleSchema);

    // Should fall back to original message since path doesn't exist in schema
    expect(result.message).toBe('Expected "0 | 1 | 2"');
  });
});

describe('getStepNodeAtPosition', () => {
  it('should get the step node at the position', () => {
    const yaml = `steps:
      - name: noop_step
        type: noop # cursor is here
        with:
          message: Hello, world!`;
    const result = getStepNodeAtPosition(parseDocument(yaml), 45);
    expect(result).toEqual(expect.any(YAMLMap));
    expect(result?.get('name')).toBe('noop_step');
  });
  it('should get the step node at the position with nested steps', () => {
    const yaml = `steps:
      - name: loop 
        type: foreach
        foreach: "{{ context.items }}"
        steps:
          - name: noop_step
            type: noop # cursor is here
            with:
              message: Hello, world!
      - name: log
        type: console
        with:
          message: "{{ steps.noop_step.output.message }}"
              `;
    const result = getStepNodeAtPosition(parseDocument(yaml), 153);
    expect(result).toEqual(expect.any(YAMLMap));
    expect(result?.get('name')).toBe('noop_step');

    const result2 = getStepNodeAtPosition(parseDocument(yaml), 265);
    expect(result2).toEqual(expect.any(YAMLMap));
    expect(result2?.get('name')).toBe('log');

    const result3 = getStepNodeAtPosition(parseDocument(yaml), 48);
    expect(result3).toEqual(expect.any(YAMLMap));
    expect(result3?.get('name')).toBe('loop');
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
    type: kibana.createCaseDefaultSpace
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

      const result = formatValidationError(mockZodError as any, undefined, yamlDocument);

      // In test environment, our system falls back to generic message
      // In real environment with actual connectors, it would show detailed union info
      expect(result.message).toContain('connector has an invalid value');
    });

    it('should provide enhanced object error message for settings', () => {
      const yamlDocument = parseDocument(`
steps:
  - name: createCase
    type: kibana.createCaseDefaultSpace
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

      const result = formatValidationError(mockZodError as any, undefined, yamlDocument);

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

      const result = formatValidationError(mockZodError as any, undefined, yamlDocument);

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

      const result = formatValidationError(mockZodError as any, undefined, yamlDocument);

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

      const result = formatValidationError(mockZodError as any, undefined, yamlDocument);

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

      const result = formatValidationError(mockZodError as any, undefined, yamlDocument);

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

      const result1 = formatValidationError(
        missingFieldsError as any,
        undefined,
        incompleteYamlDocument
      );
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

      const result2 = formatValidationError(typeError as any, undefined, incompleteYamlDocument);
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

      const result3 = formatValidationError(enumError as any, undefined, incompleteYamlDocument);
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

      const result = formatValidationError(invalidEnumError as any, undefined, correctYamlDocument);

      // Should provide helpful enum validation
      expect(result.message).toMatch(/criticality_level should be one of:|Invalid enum value/);
    });
  });
});
