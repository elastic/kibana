/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import {
  ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW,
  ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID,
} from './action_isolate_host';
import {
  ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW,
  ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID,
} from './action_kill_process';
import {
  ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW,
  ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID,
} from './action_suspend_process';
import { ALERTZERO_ACTION_WORKFLOW_IDS } from '..';
import { WorkflowSchema } from '../../../../spec/schema';

/**
 * These three actions replace custom workflow steps. They dispatch via the
 * public response-action API, then poll GET /api/endpoint/action/{id} until
 * `isCompleted` (or the 10-minute / 60-attempt ceiling). The YAML is the
 * source of truth; this suite pins the shared poll contract and catalog shape.
 */

interface YamlStep {
  name: string;
  type: string;
  condition?: string;
  timeout?: string;
  'max-iterations'?: { limit?: number; 'on-limit'?: string } | number;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
}

interface YamlWorkflow {
  name: string;
  tags?: string[];
  consts?: { actionMetadata?: { category?: string; impact?: string } };
  outputs?: Array<{ name: string; type?: string }>;
  steps: YamlStep[];
}

interface ResponseActionCase {
  id: string;
  workflow: { id: string; yaml: string };
  dispatchPath: string;
}

const CASES: ResponseActionCase[] = [
  {
    id: ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID,
    workflow: ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW,
    dispatchPath: '/s/{{ workflow.spaceId }}/api/endpoint/action/isolate',
  },
  {
    id: ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID,
    workflow: ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW,
    dispatchPath: '/s/{{ workflow.spaceId }}/api/endpoint/action/kill_process',
  },
  {
    id: ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID,
    workflow: ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW,
    dispatchPath: '/s/{{ workflow.spaceId }}/api/endpoint/action/suspend_process',
  },
];

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [step, ...flatten(step.steps ?? []), ...flatten(step.else ?? [])]);

const parseWorkflow = (yaml: string): YamlWorkflow => parse(yaml) as YamlWorkflow;

describe('AlertZero response-action workflows', () => {
  it.each(CASES.map((c) => [c.id, c] as const))(
    '%s is in the AlertZero action install set',
    (id) => {
      expect(ALERTZERO_ACTION_WORKFLOW_IDS).toContain(id);
    }
  );

  it.each(CASES.map((c) => [c.id, c.workflow.yaml] as const))(
    '%s passes strict workflow schema validation',
    (_id, yaml) => {
      const result = WorkflowSchema.safeParse(parse(yaml));

      expect(result.success ? null : result.error.issues).toBeNull();
    }
  );

  describe.each(CASES.map((c) => [c.id, c] as const))('%s', (_id, spec) => {
    const parsed = parseWorkflow(spec.workflow.yaml);
    const allSteps = flatten(parsed.steps);
    const stepByName = (name: string) => allSteps.find((step) => step.name === name);
    const requestSteps = allSteps.filter((step) => step.type === 'kibana.request');

    it('declares contain catalog metadata so the action catalog can group it', () => {
      expect(parsed.consts?.actionMetadata?.category).toBe('contain');
    });

    it('space-scopes every kibana.request path', () => {
      // Raw kibana.request is sent verbatim. An unprefixed path hits the default
      // space and still returns 200, so this has to be asserted, not eyeballed.
      const unscoped = requestSteps.filter((step) => {
        const path = (step.with?.path as string | undefined) ?? '';
        return !path.startsWith('/s/{{ workflow.spaceId }}/');
      });

      expect(requestSteps.length).toBeGreaterThan(0);
      expect(unscoped.map((step) => `${step.name}: ${String(step.with?.path)}`)).toEqual([]);
    });

    it('dispatches the response action to the public API with the versioned header', () => {
      const dispatch = stepByName('dispatch');

      expect(dispatch?.type).toBe('kibana.request');
      expect(dispatch?.with?.method).toBe('POST');
      expect(dispatch?.with?.path).toBe(spec.dispatchPath);
      expect(
        (dispatch?.with?.headers as Record<string, string> | undefined)?.['elastic-api-version']
      ).toBe('2023-10-31');
    });

    it('polls action details until isCompleted, with the same 10s / 60 / 10m ceiling as the custom steps', () => {
      const poll = stepByName('poll');
      const pollStatus = stepByName('poll_status');
      const pollDelay = stepByName('poll_delay');

      expect(poll?.type).toBe('while');
      expect(poll?.condition).toContain('isCompleted != true');
      expect(poll?.['max-iterations']).toEqual({ limit: 60, 'on-limit': 'fail' });
      expect(poll?.timeout).toBe('10m');

      expect(pollStatus?.type).toBe('kibana.request');
      expect(pollStatus?.with?.method).toBe('GET');
      expect(pollStatus?.with?.path).toBe(
        '/s/{{ workflow.spaceId }}/api/endpoint/action/{{ steps.dispatch.output.data.id }}'
      );

      expect(pollDelay?.type).toBe('wait');
      expect(pollDelay?.with?.duration).toBe('10s');
    });

    it('emits the same result shape the custom steps returned', () => {
      const emit = stepByName('emit_result');
      const outputNames = (parsed.outputs ?? []).map((output) => output.name);

      expect(emit?.type).toBe('workflow.output');
      expect(outputNames).toEqual(['action_id', 'status', 'was_successful', 'message']);
      expect(emit?.with).toEqual(
        expect.objectContaining({
          action_id: expect.stringContaining('steps.poll_status.output.data.id'),
          status: expect.stringContaining('steps.poll_status.output.data.status'),
          was_successful: expect.stringContaining('steps.poll_status.output.data.wasSuccessful'),
        })
      );
    });
  });

  it('kill and suspend pass parameters through to the request body', () => {
    const kill = parseWorkflow(ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW.yaml);
    const suspend = parseWorkflow(ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW.yaml);
    const killDispatch = flatten(kill.steps).find((step) => step.name === 'dispatch');
    const suspendDispatch = flatten(suspend.steps).find((step) => step.name === 'dispatch');
    const killBody = killDispatch?.with?.body as Record<string, string> | undefined;
    const suspendBody = suspendDispatch?.with?.body as Record<string, string> | undefined;

    expect(killBody?.parameters).toContain('inputs.actionInput.parameters');
    expect(suspendBody?.parameters).toContain('inputs.actionInput.parameters');
  });
});
