/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ValidateFunction } from 'ajv';
import { Ajv } from 'ajv';
import yaml from 'yaml';
import type { z } from '@kbn/zod/v4';
import { generateYamlSchemaFromConnectors } from './generate_yaml_schema_from_connectors';
import { getWorkflowJsonSchema } from './get_workflow_json_schema';
import { ES_INVALID_SAMPLE_STEPS, ES_VALID_SAMPLE_STEPS } from './samples';
import {
  getValidateWithYamlLsp,
  type ValidateWithYamlLspFunction,
} from './test_utils/validate_with_yaml_lsp';
import { getElasticsearchConnectors } from '../elasticsearch';

describe('getWorkflowJsonSchema / elasticsearch connectors', () => {
  let jsonSchema: z.core.JSONSchema.JSONSchema;
  let validateAjv: ValidateFunction;
  let validateWithYamlLsp: ValidateWithYamlLspFunction;

  beforeAll(() => {
    const workflowSchema = generateYamlSchemaFromConnectors(getElasticsearchConnectors());
    jsonSchema = getWorkflowJsonSchema(workflowSchema) as z.core.JSONSchema.JSONSchema;
    const ajv = new Ajv({ strict: false, validateFormats: false, discriminator: true });
    validateAjv = ajv.compile(jsonSchema);
    validateWithYamlLsp = getValidateWithYamlLsp(jsonSchema);
  });

  // This test ensures our generated JSON Schema is structurally valid
  // This is critical for Monaco autocomplete and validation to work properly
  it('should generate valid JSON Schema that can be compiled', () => {
    expect(jsonSchema).toBeTruthy();
    expect(validateAjv).toBeDefined();
  });

  ES_VALID_SAMPLE_STEPS.forEach((step) => {
    it(`${step.type}`, async () => {
      const diagnostics = await validateWithYamlLsp(
        `test-${step.name}.yaml`,
        yaml.stringify({
          name: 'test-workflow',
          enabled: true,
          triggers: [{ type: 'manual' }],
          steps: [step],
        })
      );
      expect(diagnostics).toEqual([]);
    });
  });

  ES_INVALID_SAMPLE_STEPS.forEach(({ step, diagnosticErrorMessage }) => {
    it(`${step.type} with invalid params`, async () => {
      const diagnostics = await validateWithYamlLsp(
        `test-${step.name}.yaml`,
        yaml.stringify({
          name: 'test-workflow',
          enabled: true,
          triggers: [{ type: 'manual' }],
          steps: [step],
        })
      );
      expect(diagnostics.map((d) => d.message)).toContainEqual(
        expect.stringMatching(diagnosticErrorMessage)
      );
    });
  });
});
