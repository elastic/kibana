/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Ajv from 'ajv';
import { parse } from 'yaml';
import { investigationStateSchema } from '@kbn/significant-events-schema';
import { STREAMS_INVESTIGATION_WORKFLOW } from '.';

interface ParsedInvestigationWorkflow {
  steps: Array<{ name: string; with?: { schema?: object } }>;
}

/**
 * The `investigate` step's structured-output schema is hand-authored JSON Schema in the YAML
 * (there's no zod->JSON-Schema conversion for this asset), and must be kept in sync by hand with
 * `investigationStateSchema` in `@kbn/significant-events-schema` — that's the schema the
 * investigation agent's progress-report tool streams live, so the final structured output must
 * match exactly for the UI to render identically in both cases. This test catches drift between
 * the two by validating the same example payloads against both.
 */
describe('investigation_workflow.yaml structured-output schema stays in sync with investigationStateSchema', () => {
  const parsedYaml = parse(STREAMS_INVESTIGATION_WORKFLOW.yaml) as ParsedInvestigationWorkflow;
  const investigateStep = parsedYaml.steps.find((step) => step.name === 'investigate');
  const jsonSchema = investigateStep?.with?.schema;

  if (!jsonSchema) {
    throw new Error(
      'Could not find a `schema` on the `investigate` step in investigation_workflow.yaml'
    );
  }

  const ajv = new Ajv();
  const validate = ajv.compile(jsonSchema);

  const validPayload = {
    summary: 'A deploy at 14:02 introduced a connection leak in the checkout service.',
    hypotheses: [
      {
        candidate: 'Disk saturation',
        confidence: 0.05,
        status: 'dismissed',
        reason: 'IOPS stayed flat.',
      },
      {
        candidate: 'Connection pool exhaustion after the 14:02 deploy',
        confidence: 0.9,
        status: 'confirmed',
        reason: 'Pool metrics spiked exactly at deploy time.',
      },
    ],
    conclusion: 'Connection pool exhaustion caused by the 14:02 deploy.',
    gaps_found: ['No profiling data available'],
  };

  it('accepts a valid payload under both the YAML JSON Schema and the zod schema', () => {
    expect(validate(validPayload)).toBe(true);
    expect(investigationStateSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts a minimal payload (empty hypotheses, no optional fields) under both schemas', () => {
    const minimalPayload = { summary: 'Just started.', hypotheses: [] };

    expect(validate(minimalPayload)).toBe(true);
    expect(investigationStateSchema.safeParse(minimalPayload).success).toBe(true);
  });

  it('rejects a payload missing a required top-level field under both schemas', () => {
    const { summary, ...missingSummary } = validPayload;

    expect(validate(missingSummary)).toBe(false);
    expect(investigationStateSchema.safeParse(missingSummary).success).toBe(false);
  });

  it('rejects a hypothesis missing a required field under both schemas', () => {
    const invalidHypothesis = {
      summary: 'ok',
      hypotheses: [{ candidate: 'X', status: 'investigating' }], // missing confidence
    };

    expect(validate(invalidHypothesis)).toBe(false);
    expect(investigationStateSchema.safeParse(invalidHypothesis).success).toBe(false);
  });

  it('rejects an invalid hypothesis status under both schemas', () => {
    const invalidStatus = {
      summary: 'ok',
      hypotheses: [{ candidate: 'X', confidence: 0.5, status: 'unknown' }],
    };

    expect(validate(invalidStatus)).toBe(false);
    expect(investigationStateSchema.safeParse(invalidStatus).success).toBe(false);
  });
});
