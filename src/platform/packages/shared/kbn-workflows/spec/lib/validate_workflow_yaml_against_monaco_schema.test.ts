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
import { generateYamlSchemaFromConnectors } from './generate_yaml_schema_from_connectors';
import { getJsonSchemaFromYamlSchema } from './get_json_schema_from_yaml_schema';

describe('Validate security_workflow_example.yaml against Monaco Schema', () => {
  it('should validate the security workflow YAML against the generated Monaco schema', () => {
    // Read the workflow YAML file (it's in the workspace root)
    const workflowYamlPath = join(__dirname, '../../../../../../../security_workflow_example.yaml');
    const workflowYamlContent = readFileSync(workflowYamlPath, 'utf-8');
    const workflowData = parse(workflowYamlContent);

    // Generate the Monaco schema
    const workflowZodSchema = generateYamlSchemaFromConnectors([]);
    const jsonSchema = getJsonSchemaFromYamlSchema(workflowZodSchema);

    // Get the WorkflowSchema definition
    const workflowSchemaDef = jsonSchema?.definitions?.WorkflowSchema;
    expect(workflowSchemaDef).toBeDefined();

    // Validate using Ajv (same validator that Monaco uses)
    const ajv = new Ajv({
      strict: false,
      allErrors: true,
      validateFormats: true,
    });
    addFormats(ajv);

    const validate = ajv.compile(workflowSchemaDef);
    const valid = validate(workflowData);

    if (!valid) {
      // Log validation errors for debugging
      // eslint-disable-next-line no-console
      console.error('Validation errors:', JSON.stringify(validate.errors, null, 2));
    }

    expect(valid).toBe(true);
    expect(validate.errors).toBeNull();

    // Specifically verify that inputs.properties is an object, not an array
    expect(workflowData.inputs).toBeDefined();
    expect(workflowData.inputs.properties).toBeDefined();
    expect(Array.isArray(workflowData.inputs.properties)).toBe(false);
    expect(typeof workflowData.inputs.properties).toBe('object');
  });

  it('should verify the Monaco schema structure for inputs.properties', () => {
    // Generate the Monaco schema
    const workflowZodSchema = generateYamlSchemaFromConnectors([]);
    const jsonSchema = getJsonSchemaFromYamlSchema(workflowZodSchema);

    const inputsSchema = (jsonSchema?.definitions?.WorkflowSchema as any)?.properties?.inputs;

    // Verify the schema structure

    let propertiesSchema: any;
    if (inputsSchema?.anyOf) {
      const nonNullSchema = (inputsSchema.anyOf as any[]).find(
        (s: any) => s.type !== 'null' && s.type !== 'undefined'
      );
      expect(nonNullSchema).toBeDefined();
      propertiesSchema = (nonNullSchema as any)?.properties?.properties;
    } else {
      propertiesSchema = (inputsSchema as any)?.properties?.properties;
    }

    expect(propertiesSchema).toBeDefined();
    expect(propertiesSchema.type).toBe('object');
    expect(propertiesSchema.type).not.toBe('array');
  });
});
