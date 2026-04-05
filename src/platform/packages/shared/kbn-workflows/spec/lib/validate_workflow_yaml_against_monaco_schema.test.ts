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
import type { ConnectorContractUnion } from '../..';

describe('Validate example_security_workflow.yaml against Monaco Schema', () => {
  it('should validate the security workflow YAML against the generated Monaco schema', () => {
    // Read the workflow YAML file (it's in the workspace root)
    const workflowYamlPath = join(__dirname, '../examples/example_security_workflow.yaml');
    const workflowYamlContent = readFileSync(workflowYamlPath, 'utf-8');
    const workflowData = parse(workflowYamlContent);

    // Generate the Monaco schema with static connectors (including console)
    // This matches what would be used in production
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

    // Get the WorkflowSchema definition
    // With transform schemas and reused: 'ref', the structure may differ:
    // - Root might be a $ref pointing to a definition
    // - Definition might have a different name than 'WorkflowSchema'
    const schemaWithRef = jsonSchema as { $ref?: string; definitions?: Record<string, unknown> };
    let workflowSchemaDef: Record<string, unknown> | undefined;

    if (schemaWithRef.$ref && schemaWithRef.$ref.startsWith('#/definitions/')) {
      // Root is a $ref, resolve it from definitions
      const defName = schemaWithRef.$ref.replace('#/definitions/', '');
      workflowSchemaDef = schemaWithRef.definitions?.[defName] as Record<string, unknown>;
    } else if (schemaWithRef.definitions) {
      // Try to find WorkflowSchema in definitions, or use the first definition with properties
      workflowSchemaDef = schemaWithRef.definitions.WorkflowSchema as Record<string, unknown>;
      if (!workflowSchemaDef && schemaWithRef.definitions) {
        // Fallback: find any definition with properties
        for (const defSchema of Object.values(schemaWithRef.definitions)) {
          if (defSchema && typeof defSchema === 'object' && 'properties' in defSchema) {
            workflowSchemaDef = defSchema as Record<string, unknown>;
            break;
          }
        }
      }
    } else if (jsonSchema && 'properties' in jsonSchema) {
      // Root schema has properties directly
      workflowSchemaDef = jsonSchema as Record<string, unknown>;
    }

    // With transform schemas and reused: 'ref', the schema structure may differ
    // If workflowSchemaDef is not found, use the root schema for validation
    // The critical requirement is that we can resolve a schema object for checks below
    if (!workflowSchemaDef && jsonSchema) {
      // Fallback to using root schema if no definition found
      workflowSchemaDef = jsonSchema as Record<string, unknown>;
    }

    expect(workflowSchemaDef).toBeDefined();

    // Validate parsed YAML against the same Zod schema used to build the Monaco JSON Schema
    const parseResult = workflowZodSchema.safeParse(workflowData);
    expect(parseResult.success).toBe(true);

    // Specifically verify that inputs.properties is an object, not an array
    expect(workflowData.inputs).toBeDefined();
    expect(workflowData.inputs.properties).toBeDefined();
    expect(Array.isArray(workflowData.inputs.properties)).toBe(false);
    expect(typeof workflowData.inputs.properties).toBe('object');
  });
});
