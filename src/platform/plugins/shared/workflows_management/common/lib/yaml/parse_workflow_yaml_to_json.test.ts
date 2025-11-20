/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorContractUnion } from '@kbn/workflows';
import { generateYamlSchemaFromConnectors } from '@kbn/workflows';
import type { SafeParseReturnType } from '@kbn/zod';
import { z } from '@kbn/zod';
import { parseWorkflowYamlToJSON } from './parse_workflow_yaml_to_json';

describe('parseWorkflowYamlToJSON', () => {
  const mockConnectors: ConnectorContractUnion[] = [
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

  describe('dynamic value filtering (${{ }} syntax)', () => {
    it('should suppress validation errors for dynamic values', () => {
      const schema = z.object({
        steps: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
            with: z.object({
              count: z.number(),
              cases: z.array(
                z.object({
                  severity: z.enum(['low', 'medium', 'high', 'critical']),
                })
              ),
            }),
          })
        ),
      });

      const yaml = `steps:
        - name: step1
          type: noop
          with:
            count: $\{\{ inputs.count \}\}
            cases:
              - severity: $\{\{ inputs.severity \}\}
      `;
      const result = parseWorkflowYamlToJSON(yaml, schema);
      expect(result.success).toBe(true);
    });

    it('should still show validation errors for non-dynamic invalid values', () => {
      const schema = z.object({
        steps: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
            with: z.object({
              count: z.number(),
            }),
          })
        ),
      });

      const yaml = `steps:
        - name: step1
          type: noop
          with:
            count: invalid
      `;
      const result = parseWorkflowYamlToJSON(yaml, schema);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should filter dynamic value errors but keep other errors', () => {
      const schema = z.object({
        steps: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
            with: z.object({
              message: z.string(),
              count: z.number(),
            }),
          })
        ),
      });

      const yaml = `steps:
        - name: step1
          type: noop
          with:
            message: $\{\{ inputs.message \}\}
            count: invalid
      `;
      const result = parseWorkflowYamlToJSON(yaml, schema);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('number');
    });

    it('should also suppress errors for regular {{ }} template syntax', () => {
      const schema = z.object({
        steps: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
            with: z.object({
              count: z.number(),
              cases: z.array(
                z.object({
                  severity: z.enum(['low', 'medium', 'high', 'critical']),
                })
              ),
            }),
          })
        ),
      });

      const yaml = `steps:
        - name: step1
          type: noop
          with:
            count: "{{ inputs.count }}"
            cases:
              - severity: "{{ inputs.severity }}"
      `;
      const result = parseWorkflowYamlToJSON(yaml, schema);
      expect(result.success).toBe(true);
    });

    it('should not suppress errors if the variable is inside a string and field should be a number', () => {
      const schema = z.object({
        steps: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
            with: z.object({
              count: z.number(),
            }),
          })
        ),
      });
      const yaml = `steps:
        - name: step1
          type: noop
          with:
            count: "some string with a variable {{ inputs.count }}"
      `;
      const result = parseWorkflowYamlToJSON(yaml, schema);
      expect(result.success).toBe(false);
    });
  });
});
