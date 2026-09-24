/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getInputsFromDefinition } from '@kbn/workflows/spec/lib/field_conversion';
import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { extractWorkflowMetadata } from './extract_workflow_metadata';

jest.mock('@kbn/workflows/spec/lib/field_conversion', () => ({
  ...jest.requireActual('@kbn/workflows/spec/lib/field_conversion'),
  getInputsFromDefinition: jest.fn(),
}));

const mockGetInputsFromDefinition = getInputsFromDefinition as jest.MockedFunction<
  typeof getInputsFromDefinition
>;

const minimalConsoleStep = { name: 's1', type: 'console' };

function baseWorkflow(overrides: Partial<WorkflowYaml> = {}): Partial<WorkflowYaml> {
  return {
    name: 'telemetry-contract',
    enabled: true,
    steps: [minimalConsoleStep],
    triggers: [{ type: 'manual' }],
    ...overrides,
  };
}

describe('extractWorkflowMetadata (execution engine)', () => {
  // Format-shape coverage of `inputs` is owned by `getInputsFromDefinition` unit
  // tests. Here we mock the helper and only verify that `inputCount` reflects what
  // it returns.
  beforeEach(() => {
    mockGetInputsFromDefinition.mockReset();
    mockGetInputsFromDefinition.mockReturnValue(undefined);
  });

  it('returns defaults for null and undefined', () => {
    expect(extractWorkflowMetadata(undefined)).toEqual({
      enabled: false,
      stepCount: 0,
      connectorTypes: [],
      stepTypeCounts: {},
      hasScheduledTriggers: false,
      hasAlertTriggers: false,
      inputCount: 0,
      triggerCount: 0,
      hasTimeout: false,
      hasConcurrency: false,
      hasOnFailure: false,
    });
    expect(extractWorkflowMetadata(null)).toEqual(extractWorkflowMetadata(undefined));
  });

  it('reflects root field: enabled', () => {
    expect(extractWorkflowMetadata(baseWorkflow({ enabled: false })).enabled).toBe(false);
    expect(extractWorkflowMetadata(baseWorkflow({ enabled: true })).enabled).toBe(true);
  });

  it('reflects root field: steps (nested steps, else, fallback, connector)', () => {
    const wf: Partial<WorkflowYaml> = baseWorkflow({
      steps: [
        {
          name: 'foreach1',
          type: 'foreach',
          steps: [{ name: 'inner', type: 'if', else: [{ name: 'e1', type: 'console' }] }],
        },
        {
          name: 'try1',
          type: 'try',
          fallback: [{ name: 'fb', type: 'console' }],
        },
        {
          name: 'slack',
          type: 'slack.webhook',
          'connector-id': 'c1',
        },
      ] as unknown as WorkflowYaml['steps'],
    });
    const meta = extractWorkflowMetadata(wf);
    expect(meta.stepCount).toBe(6);
    expect(meta.stepTypeCounts).toEqual({
      foreach: 1,
      if: 1,
      console: 2,
      try: 1,
      'slack.webhook': 1,
    });
    expect(meta.connectorTypes).toEqual(['slack']);
  });

  it('counts steps without type toward stepCount but not stepTypeCounts', () => {
    const wf = baseWorkflow({
      steps: [minimalConsoleStep, { name: 'untyped' } as unknown as WorkflowYaml['steps'][number]],
    });
    const meta = extractWorkflowMetadata(wf);
    expect(meta.stepCount).toBe(2);
    expect(meta.stepTypeCounts).toEqual({ console: 1 });
  });

  it('reflects root field: triggers', () => {
    expect(
      extractWorkflowMetadata(
        baseWorkflow({ triggers: [{ type: 'scheduled', with: { every: '1h' } }] })
      )
    ).toMatchObject({
      hasScheduledTriggers: true,
      hasAlertTriggers: false,
      triggerCount: 1,
    });
    expect(extractWorkflowMetadata(baseWorkflow({ triggers: [{ type: 'alert' }] }))).toMatchObject({
      hasScheduledTriggers: false,
      hasAlertTriggers: true,
      triggerCount: 1,
    });
  });

  it('counts inputCount from the JSON Schema returned by getInputsFromDefinition', () => {
    const schema: JsonModelSchemaType = {
      properties: { a: { type: 'string' }, b: { type: 'number' } },
    };
    mockGetInputsFromDefinition.mockReturnValue(schema);

    expect(extractWorkflowMetadata(baseWorkflow()).inputCount).toBe(2);
  });

  it('reflects settings key: timeout', () => {
    expect(extractWorkflowMetadata(baseWorkflow({ settings: { timeout: '30s' } }))).toMatchObject({
      hasTimeout: true,
      hasConcurrency: false,
      hasOnFailure: false,
    });
  });

  it('reflects settings key: concurrency', () => {
    expect(
      extractWorkflowMetadata(
        baseWorkflow({
          settings: { concurrency: { max: 3, strategy: 'drop' } },
        })
      )
    ).toMatchObject({
      hasConcurrency: true,
      hasTimeout: false,
      hasOnFailure: false,
      concurrencyMax: 3,
      concurrencyStrategy: 'drop',
    });
  });

  it('reflects settings key: on-failure', () => {
    expect(
      extractWorkflowMetadata(
        baseWorkflow({
          settings: { 'on-failure': { continue: true } },
        })
      )
    ).toMatchObject({
      hasOnFailure: true,
      hasTimeout: false,
      hasConcurrency: false,
    });
  });
});
