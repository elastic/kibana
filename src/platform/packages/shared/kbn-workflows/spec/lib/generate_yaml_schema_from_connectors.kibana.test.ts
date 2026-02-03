/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import { KIBANA_INVALID_SAMPLE_STEPS, KIBANA_VALID_SAMPLE_STEPS } from './samples';
import { generateYamlSchemaFromConnectors, getKibanaConnectors } from '../..';

describe('generateYamlSchemaFromConnectors / kibana connectors', () => {
  let availableKibanaTypes: string[];
  let workflowSchema: z.ZodType;

  beforeAll(() => {
    const connectors = getKibanaConnectors();
    availableKibanaTypes = connectors.map((connector) => connector.type);
    workflowSchema = generateYamlSchemaFromConnectors(connectors);
  });

  it('there should be at least one valid sample for each available kibana type', () => {
    const allReferencedTypes = Array.from(
      new Set(KIBANA_VALID_SAMPLE_STEPS.map((step) => step.type))
    );
    expect(allReferencedTypes.sort()).toEqual(availableKibanaTypes.sort());
  });

  it('there should be at least one invalid sample for each available kibana type', () => {
    const allReferencedTypes = Array.from(
      new Set(KIBANA_INVALID_SAMPLE_STEPS.map((step) => step.step.type))
    );
    expect(allReferencedTypes.sort()).toEqual(availableKibanaTypes.sort());
  });

  it('should generate a valid YAML schema from connectors', () => {
    expect(workflowSchema).toBeDefined();
    // strict mode should throw if required fields are missing
    expect(() => workflowSchema.parse({ steps: [] })).toThrow();
  });

  KIBANA_VALID_SAMPLE_STEPS.forEach((step) => {
    it(`${step.type} (${step.name})`, async () => {
      const result = workflowSchema.safeParse({
        name: 'test-workflow',
        enabled: true,
        triggers: [{ type: 'manual' }],
        steps: [step],
      });
      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect((result.data as any).steps[0]).toEqual(step);
    });
  });

  KIBANA_INVALID_SAMPLE_STEPS.forEach(({ step, zodErrorMessage }) => {
    it(`invalid ${step.type} (${step.name}) should throw a zod error`, async () => {
      const result = workflowSchema.safeParse({
        name: 'test-workflow',
        enabled: true,
        triggers: [{ type: 'manual' }],
        steps: [step],
      });
      expect(result.error).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error?.message).toEqual(expect.stringMatching(zodErrorMessage));
    });
  });
});
