/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs'; // eslint-disable-line import/no-nodejs-modules
import { join } from 'path'; // eslint-disable-line import/no-nodejs-modules
import { parse } from 'yaml';
import { z } from '@kbn/zod';
import { generateYamlSchemaFromConnectors } from './generate_yaml_schema_from_connectors';
import { getJsonSchemaFromYamlSchema } from './get_json_schema_from_yaml_schema';
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
    const jsonSchema = getJsonSchemaFromYamlSchema(workflowZodSchema);

    // Get the WorkflowSchema definition
    const workflowSchemaDef = jsonSchema?.definitions?.WorkflowSchema;
    expect(workflowSchemaDef).toBeDefined();

    // Validate using Ajv (same validator that Monaco uses)
    // We need to compile the full schema (with definitions) so that $ref references can be resolved
    const ajv = new Ajv({
      strict: false,
      allErrors: true,
      validateFormats: true,
    });
    addFormats(ajv);

    // Create a validation schema that includes the WorkflowSchema and all definitions
    // This ensures all $ref references can be resolved
    const validationSchema = {
      ...workflowSchemaDef,
      definitions: jsonSchema.definitions,
    };

    const validate = ajv.compile(validationSchema);
    const valid = validate(workflowData);

    expect(valid).toBe(true);
    expect(validate.errors).toBeNull();

    // Specifically verify that inputs.properties is an object, not an array
    expect(workflowData.inputs).toBeDefined();
    expect(workflowData.inputs.properties).toBeDefined();
    expect(Array.isArray(workflowData.inputs.properties)).toBe(false);
    expect(typeof workflowData.inputs.properties).toBe('object');
  });
});
