/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs'; // eslint-disable-line import/no-nodejs-modules
import { join } from 'path'; // eslint-disable-line import/no-nodejs-modules
import { parse } from 'yaml';
import { z } from '@kbn/zod/v4';
import { generateYamlSchemaFromConnectors } from './generate_yaml_schema_from_connectors';
import { getWorkflowJsonSchema } from './get_workflow_json_schema';
import { getValidateWithYamlLsp } from './test_utils/validate_with_yaml_lsp';
import type { ConnectorContractUnion } from '../..';
import type { JsonModelSchemaType } from '../schema/common/json_model_schema';
import type { Trigger } from '../schema/triggers';
import type { ManualTrigger } from '../schema/triggers/manual_trigger_schema';
import { isManualTrigger } from '../schema/triggers/manual_trigger_schema';

describe('workflow inputs — YAML language server vs generated JSON Schema', () => {
  it('should produce no schema diagnostics (Monaco / yaml-language-server path)', async () => {
    const workflowYamlPath = join(__dirname, '../examples/example_security_workflow.yaml');
    const workflowYamlContent = readFileSync(workflowYamlPath, 'utf-8');
    const workflowData = parse(workflowYamlContent);

    const staticConnectors: ConnectorContractUnion[] = [
      {
        type: 'console',
        summary: 'Console',
        paramsSchema: z
          .object({
            message: z.string(),
          })
          .required(),
        outputSchema: z.string(),
        description: 'Log a message to the workflow logs',
      },
    ];
    const workflowZodSchema = generateYamlSchemaFromConnectors(staticConnectors);
    const jsonSchema = getWorkflowJsonSchema(workflowZodSchema);

    if (!jsonSchema) {
      throw new Error('JSON schema is null');
    }

    // Structural smoke: generated JSON Schema must expose a workflow root (definitions / $ref),
    // same bar as the former validate_workflow_yaml_against_monaco_schema test.
    const schemaWithRef = jsonSchema as { $ref?: string; definitions?: Record<string, unknown> };
    let workflowSchemaDef: Record<string, unknown> | undefined;
    if (schemaWithRef.$ref && schemaWithRef.$ref.startsWith('#/definitions/')) {
      const defName = schemaWithRef.$ref.replace('#/definitions/', '');
      workflowSchemaDef = schemaWithRef.definitions?.[defName] as Record<string, unknown>;
    } else if (schemaWithRef.definitions) {
      workflowSchemaDef = schemaWithRef.definitions.WorkflowSchema as Record<string, unknown>;
      if (!workflowSchemaDef) {
        for (const defSchema of Object.values(schemaWithRef.definitions)) {
          if (defSchema && typeof defSchema === 'object' && 'properties' in defSchema) {
            workflowSchemaDef = defSchema as Record<string, unknown>;
            break;
          }
        }
      }
    } else if ('properties' in jsonSchema) {
      workflowSchemaDef = jsonSchema as Record<string, unknown>;
    }
    if (!workflowSchemaDef) {
      workflowSchemaDef = jsonSchema as Record<string, unknown>;
    }
    expect(workflowSchemaDef).toBeDefined();

    // Workflow document must satisfy the Zod schema (runtime / execution path).
    const zodResult = workflowZodSchema.safeParse(workflowData);
    expect(zodResult.success).toBe(true);

    // Monaco path: yaml-language-server validates against the same generated JSON Schema.
    const validateWithYamlLsp = getValidateWithYamlLsp(jsonSchema as z.core.JSONSchema.JSONSchema);
    const diagnostics = await validateWithYamlLsp(
      'example_security_workflow.yaml',
      workflowYamlContent
    );
    expect(diagnostics).toEqual([]);
    const manualTrigger = workflowData.triggers.find((trigger: Trigger) =>
      isManualTrigger(trigger)
    ) as ManualTrigger;
    expect(manualTrigger).toBeDefined();
    expect(manualTrigger.inputs).toBeDefined();
    const inputs = manualTrigger.inputs as JsonModelSchemaType;
    expect(inputs.properties).toBeDefined();
    expect(Array.isArray(inputs.properties)).toBe(false);
    expect(typeof inputs.properties).toBe('object');
  });
});
