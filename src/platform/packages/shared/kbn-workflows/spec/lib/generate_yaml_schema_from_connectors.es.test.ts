/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import { ES_INVALID_SAMPLE_STEPS, ES_VALID_SAMPLE_STEPS } from './samples';
import { generateYamlSchemaFromConnectors, getElasticsearchConnectors } from '../..';

describe('generateYamlSchemaFromConnectors / elasticsearch connectors', () => {
  let workflowSchema: z.ZodType;

  beforeAll(() => {
    workflowSchema = generateYamlSchemaFromConnectors(getElasticsearchConnectors());
  });

  it('should generate a valid YAML schema from connectors', () => {
    expect(workflowSchema).toBeDefined();
    // strict mode should throw if required fields are missing
    expect(() => workflowSchema.parse({ steps: [] })).toThrow();
  });

  ES_VALID_SAMPLE_STEPS.forEach((step) => {
    it(`${step.type}`, async () => {
      const result = workflowSchema.safeParse({
        name: 'test-workflow',
        enabled: true,
        triggers: [{ type: 'manual' }],
        steps: [step],
      });
      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
    });
  });

  ES_INVALID_SAMPLE_STEPS.forEach(({ step, zodErrorMessage }) => {
    it(`${step.type} with invalid params`, async () => {
      const result = workflowSchema.safeParse({
        name: 'test-workflow',
        enabled: true,
        triggers: [{ type: 'manual' }],
        steps: [step],
      });
      expect(result.error).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(zodErrorMessage);
    });
  });
});
