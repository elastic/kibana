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
import { ALERTZERO_ACTION_WORKFLOW_IDS } from '../..';
import { WorkflowSchema } from '../../../../../spec/schema';

/**
 * These three actions probe Actions-log privilege, dispatch via the
 * public response-action API, then poll GET /api/endpoint/action/{id}
 * until `isCompleted` (or the 10-minute / 60-attempt ceiling). The
 * YAML is the source of truth; this suite pins the shared pre-flight,
 * poll contract, and catalog shape.
 */

interface YamlStep {
  name: string;
  type: string;
  condition?: string;
  timeout?: string;
  'max-iterations'?: { limit?: number; 'on-limit'?: string } | number;
  'on-failure'?: { retry?: { 'max-attempts'?: number; delay?: string }; continue?: boolean };
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
}

interface YamlWorkflow {
  name: string;
  tags?: string[];
  consts?: {
    actionMetadata?: { category?: string; impact?: string };
    privilege_probe_action_id?: string;
  };
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

    it('probes Actions-log privilege with a sentinel GET before dispatching', () => {
      // GET details requires Actions log; the POST does not. A missing privilege
      // must fail closed so we never isolate/kill/suspend a host we cannot wait on.
      const probeIndex = parsed.steps.findIndex((step) => step.name === 'probe_action_details');
      const dispatchIndex = parsed.steps.findIndex((step) => step.name === 'dispatch');
      const probe = stepByName('probe_action_details');
      const capture = stepByName('capture_probe_status');
      const failIfCannotPoll = stepByName('fail_if_cannot_poll');
      const failStep = stepByName('missing_actions_log_privilege');

      expect(parsed.consts?.privilege_probe_action_id).toBe('00000000-0000-0000-0000-000000000000');

      expect(probe?.type).toBe('kibana.request');
      expect(probe?.with?.method).toBe('GET');
      expect(probe?.with?.path).toBe(
        '/s/{{ workflow.spaceId }}/api/endpoint/action/{{ consts.privilege_probe_action_id }}'
      );
      expect(probe?.['on-failure']).toEqual({ continue: true });

      expect(capture?.type).toBe('data.set');
      expect(capture?.with?.probe_http_status).toContain(
        'steps.probe_action_details.error.message'
      );

      expect(failIfCannotPoll?.type).toBe('if');
      expect(failIfCannotPoll?.condition).toContain('HTTP 404');
      expect(failStep?.type).toBe('workflow.fail');
      expect(failStep?.with?.message).toEqual(expect.stringContaining('Actions log privilege'));

      expect(probeIndex).toBeGreaterThanOrEqual(0);
      expect(probeIndex).toBeLessThan(dispatchIndex);
    });

    it('dispatches the response action to the public API with the versioned header and no retry', () => {
      const dispatch = stepByName('dispatch');

      expect(dispatch?.type).toBe('kibana.request');
      expect(dispatch?.with?.method).toBe('POST');
      expect(dispatch?.with?.path).toBe(spec.dispatchPath);
      expect(
        (dispatch?.with?.headers as Record<string, string> | undefined)?.['elastic-api-version']
      ).toBe('2023-10-31');
      // POST is non-idempotent: retrying would issue duplicate isolate/kill/suspend commands.
      expect(dispatch?.['on-failure']).toBeUndefined();
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

    it('branches on wasSuccessful: succeeds with output fields, fails the workflow otherwise', () => {
      const emitResult = stepByName('emit_result');
      const emitSuccess = stepByName('emit_success');
      const emitFailure = stepByName('emit_failure');
      const outputNames = (parsed.outputs ?? []).map((output) => output.name);

      // emit_result gates on wasSuccessful so the proposal gate's on-failure path fires
      expect(emitResult?.type).toBe('if');
      expect(emitResult?.condition).toContain('wasSuccessful');

      // success path: workflow.output with the same shape callers expect
      expect(emitSuccess?.type).toBe('workflow.output');
      expect(outputNames).toEqual(['action_id', 'status', 'was_successful', 'message']);
      expect(emitSuccess?.with).toEqual(
        expect.objectContaining({
          action_id: expect.stringContaining('steps.poll_status.output.data.id'),
          status: expect.stringContaining('steps.poll_status.output.data.status'),
        })
      );

      // failure path: workflow.fail so the parent workflow.execute propagates an error
      expect(emitFailure?.type).toBe('workflow.fail');
      expect(emitFailure?.with?.message).toEqual(
        expect.stringContaining('steps.poll_status.output.data.id')
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
