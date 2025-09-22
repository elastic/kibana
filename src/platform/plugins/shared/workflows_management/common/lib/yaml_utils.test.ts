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
} from './yaml_utils';
import type { ConnectorContract, WorkflowYaml } from '@kbn/workflows';
import { generateYamlSchemaFromConnectors } from '@kbn/workflows';

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
});
