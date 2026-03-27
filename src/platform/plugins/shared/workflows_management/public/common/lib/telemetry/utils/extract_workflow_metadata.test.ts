/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import {
  extractStepInfoFromWorkflowYaml,
  extractWorkflowMetadata,
} from './extract_workflow_metadata';

/**
 * Runtime workflow YAML can include nested shapes (e.g. `on-failure` on steps) that are wider than
 * Zod-inferred `WorkflowYaml['steps']`. The extractor supports them; this helper isolates the cast.
 */
function asRuntimeSteps(steps: unknown): WorkflowYaml['steps'] {
  return steps as WorkflowYaml['steps'];
}

/** Legacy inputs array form is not fully expressed on `WorkflowYaml['inputs']` union typing. */
function asRuntimeInputs(inputs: unknown): WorkflowYaml['inputs'] {
  return inputs as WorkflowYaml['inputs'];
}

/** Runtime triggers can include registered custom trigger ids (e.g. cases.updated). */
function asRuntimeTriggers(triggers: unknown): WorkflowYaml['triggers'] {
  return triggers as WorkflowYaml['triggers'];
}

const minimalConsoleStep = { name: 's1', type: 'console', with: {} };

function baseWorkflow(overrides: Partial<WorkflowYaml> = {}): Partial<WorkflowYaml> {
  return {
    name: 'telemetry-contract',
    enabled: true,
    steps: [minimalConsoleStep],
    triggers: [{ type: 'manual' }],
    ...overrides,
  };
}

describe('extractWorkflowMetadata (workflows management UI)', () => {
  it('returns defaults for null and undefined', () => {
    const defaults = {
      enabled: false,
      stepCount: 0,
      connectorTypes: [],
      stepTypes: [],
      stepTypeCounts: {},
      triggerTypes: [],
      inputCount: 0,
      constCount: 0,
      triggerCount: 0,
      hasTriggerConditions: false,
      settingsUsed: [],
      hasDescription: false,
      tagCount: 0,
    };
    expect(extractWorkflowMetadata(undefined)).toEqual(defaults);
    expect(extractWorkflowMetadata(null)).toEqual(defaults);
  });

  it('reflects root field: enabled', () => {
    expect(extractWorkflowMetadata(baseWorkflow({ enabled: false })).enabled).toBe(false);
    expect(extractWorkflowMetadata(baseWorkflow({ enabled: true })).enabled).toBe(true);
  });

  it('reflects root field: steps including on-failure fallback paths', () => {
    const wf: Partial<WorkflowYaml> = baseWorkflow({
      steps: asRuntimeSteps([
        {
          name: 'outer',
          type: 'foreach',
          steps: [
            {
              name: 'with-fb',
              type: 'console',
              'on-failure': { fallback: [{ name: 'fb1', type: 'console', with: {} }] },
            },
          ],
        },
      ]),
    });
    const meta = extractWorkflowMetadata(wf);
    expect(meta.stepCount).toBe(3);
    expect(meta.stepTypeCounts).toEqual({ foreach: 1, console: 2 });
  });

  it('reflects root field: triggers as triggerTypes and triggerCount', () => {
    const meta = extractWorkflowMetadata(
      baseWorkflow({
        triggers: [{ type: 'manual' }, { type: 'scheduled', with: { every: '1h' } }],
      })
    );
    expect(meta.triggerCount).toBe(2);
    expect(meta.triggerTypes).toEqual(expect.arrayContaining(['manual', 'scheduled']));
    expect(meta.triggerTypes).toHaveLength(2);
  });

  it('tracks trigger condition presence without reporting condition text', () => {
    const withCondition = extractWorkflowMetadata(
      baseWorkflow({
        triggers: asRuntimeTriggers([
          { type: 'manual' },
          { type: 'cases.updated', on: { condition: 'event.action == "create"' } },
        ]),
      })
    );
    const withoutCondition = extractWorkflowMetadata(
      baseWorkflow({
        triggers: asRuntimeTriggers([
          { type: 'manual' },
          { type: 'cases.updated', on: { condition: '   ' } },
        ]),
      })
    );

    expect(withCondition.hasTriggerConditions).toBe(true);
    expect(withoutCondition.hasTriggerConditions).toBe(false);
  });

  it('reflects root field: inputs (array length)', () => {
    expect(
      extractWorkflowMetadata(
        baseWorkflow({
          inputs: asRuntimeInputs([
            { name: 'a', type: 'string' },
            { name: 'b', type: 'number' },
          ]),
        })
      ).inputCount
    ).toBe(2);
  });

  it('reflects root field: consts', () => {
    expect(extractWorkflowMetadata(baseWorkflow({ consts: { X: 1, Y: 2 } })).constCount).toBe(2);
  });

  it('reflects root field: description and tags', () => {
    expect(extractWorkflowMetadata(baseWorkflow({ description: '  hi  ' }))).toMatchObject({
      hasDescription: true,
    });
    expect(extractWorkflowMetadata(baseWorkflow({ description: '   ' }))).toMatchObject({
      hasDescription: false,
    });
    expect(extractWorkflowMetadata(baseWorkflow({ tags: ['a', 'b', 'c'] })).tagCount).toBe(3);
  });

  it('reflects settings: concurrency max and strategy', () => {
    expect(
      extractWorkflowMetadata(
        baseWorkflow({
          settings: { concurrency: { max: 5, strategy: 'cancel-in-progress' } },
        })
      )
    ).toMatchObject({
      concurrencyMax: 5,
      concurrencyStrategy: 'cancel-in-progress',
      settingsUsed: ['concurrency'],
    });
  });

  it('settingsUsed lists top-level keys present on settings', () => {
    const meta = extractWorkflowMetadata(
      baseWorkflow({
        settings: {
          timeout: '30s',
          timezone: 'UTC',
          'max-step-size': '10mb',
        } as WorkflowYaml['settings'],
      })
    );
    expect(meta.settingsUsed).toEqual(
      expect.arrayContaining(['timeout', 'timezone', 'max-step-size'])
    );
    expect(meta.settingsUsed).toHaveLength(3);
  });
});

describe('extractStepInfoFromWorkflowYaml', () => {
  const validYaml = `id: wf-telemetry-ui
name: example
steps:
  - name: my-step
    type: console
    with: {}
triggers:
  - type: manual
`;

  it('returns null for empty yaml input', () => {
    expect(extractStepInfoFromWorkflowYaml(undefined, 'my-step')).toBeNull();
    expect(extractStepInfoFromWorkflowYaml(null, 'my-step')).toBeNull();
    expect(extractStepInfoFromWorkflowYaml('', 'my-step')).toBeNull();
  });

  it('returns null when parsed document does not match the workflow schema', () => {
    expect(extractStepInfoFromWorkflowYaml('[1, 2, 3]', 'x')).toBeNull();
  });

  it('extracts step type and workflow id for a named step', () => {
    expect(extractStepInfoFromWorkflowYaml(validYaml, 'my-step')).toEqual({
      stepType: 'console',
      workflowId: 'wf-telemetry-ui',
    });
  });

  it('extracts connectorType when connector-id is present', () => {
    const yaml = `id: c-wf
name: example
steps:
  - name: conn
    type: slack.webhook
    connector-id: c-1
    with: {}
triggers:
  - type: manual
`;
    expect(extractStepInfoFromWorkflowYaml(yaml, 'conn')).toEqual({
      stepType: 'slack.webhook',
      connectorType: 'slack.webhook',
      workflowId: 'c-wf',
    });
  });

  it('returns unknown step type when step name is not found', () => {
    expect(extractStepInfoFromWorkflowYaml(validYaml, 'missing')).toEqual({
      stepType: 'unknown',
      workflowId: 'wf-telemetry-ui',
    });
  });
});
