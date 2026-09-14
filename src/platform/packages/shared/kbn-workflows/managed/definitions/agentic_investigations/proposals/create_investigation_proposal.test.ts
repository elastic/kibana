/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import CREATE_INVESTIGATION_PROPOSAL_YAML from './create_investigation_proposal.yaml';

/** Local shape: the parsed YAML is untyped, and only these fields are asserted on. */
interface WorkflowStep {
  name?: string;
  type?: string;
  condition?: string;
  if?: string;
  timeout?: string;
  with?: Record<string, unknown>;
  steps?: WorkflowStep[];
}

interface ParsedWorkflow {
  settings?: {
    timeout?: string;
    'on-failure'?: { fallback?: WorkflowStep[] };
  };
  triggers: Array<{
    type: string;
    inputs?: { properties?: Record<string, unknown>; required?: string[] };
  }>;
  outputs?: Array<{ name: string; type: string }>;
  steps: WorkflowStep[];
}

const workflow = parse(CREATE_INVESTIGATION_PROPOSAL_YAML) as ParsedWorkflow;

const findStep = (steps: WorkflowStep[], name: string): WorkflowStep | undefined => {
  for (const step of steps) {
    if (step.name === name) {
      return step;
    }
    const nested = (step as { steps?: WorkflowStep[] }).steps;
    if (nested) {
      const match = findStep(nested, name);
      if (match) {
        return match;
      }
    }
  }
  return undefined;
};

const durationToMs = (duration: string): number => {
  const match = /^(\d+)(ms|[smhdw])$/.exec(duration);
  if (!match) {
    throw new Error(`Unparseable duration: ${duration}`);
  }
  const unit = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 }[
    match[2]
  ] as number;
  return Number(match[1]) * unit;
};

describe('create-investigation-proposal workflow', () => {
  it('declares inputs under the manual trigger, since a top-level inputs block is not valid', () => {
    const manualTrigger = workflow.triggers.find(({ type }) => type === 'manual');

    expect(manualTrigger?.inputs?.properties).toEqual(
      expect.objectContaining({
        conversationId: expect.anything(),
        actionWorkflowId: expect.anything(),
        actionInput: expect.anything(),
        autoApprove: expect.anything(),
      })
    );
  });

  it('types actionInput as a free-form object so any action shape can pass through', () => {
    const actionInput = workflow.triggers.find(({ type }) => type === 'manual')?.inputs?.properties
      ?.actionInput as { type?: string; additionalProperties?: boolean };

    expect(actionInput.type).toBe('object');
    expect(actionInput.additionalProperties).toBe(true);
  });

  it('declares the outputs a caller gets back from workflow.execute', () => {
    expect(workflow.outputs?.map(({ name }) => name)).toEqual(['proposalId', 'status']);
  });

  it('gates on waitForApproval so the release signal is fail-closed', () => {
    const gate = findStep(workflow.steps, 'await_decision');

    expect(gate?.type).toBe('waitForApproval');
  });

  it('records the same deadline it gates on, so the queue and the gate cannot disagree', () => {
    const gate = findStep(workflow.steps, 'await_decision') as { timeout?: string };
    const create = findStep(workflow.steps, 'create_proposal');

    expect(gate.timeout).toBe(create?.with?.expiresIn);
  });

  it('keeps the gate timeout static, since the engine does not template-render it', () => {
    const gate = findStep(workflow.steps, 'await_decision') as { timeout?: string };

    // A template here reaches the duration parser unrendered and throws at
    // execution time. See elastic/kibana#290258.
    expect(gate.timeout).not.toContain('{{');
    expect(() => durationToMs(gate.timeout ?? '')).not.toThrow();
  });

  it('sets a workflow timeout longer than the gate timeout, or the parked wait expires early', () => {
    const gate = findStep(workflow.steps, 'await_decision') as { timeout?: string };

    expect(workflow.settings?.timeout).toBeDefined();
    expect(durationToMs(workflow.settings!.timeout!)).toBeGreaterThanOrEqual(
      durationToMs(gate.timeout!)
    );
  });

  it('records a failure from the workflow-level on-failure, since HITL steps take none', () => {
    const fallback = workflow.settings?.['on-failure']?.fallback ?? [];

    expect(fallback.map(({ type }) => type)).toContain('investigations.updateProposal');
  });

  it('skips the failure handler when creation itself failed and there is no proposal id', () => {
    const recordFailure = (workflow.settings?.['on-failure']?.fallback ?? []).find(
      ({ name }) => name === 'record_failure'
    );

    expect(recordFailure?.if).toContain('steps.create_proposal.output.proposalId');
  });

  it('skips the gate when the caller already resolved autonomy for an action', () => {
    const gateBranch = workflow.steps.find(({ name }) => name === 'decision_gate') as {
      condition?: string;
    };

    expect(gateBranch.condition).toContain('autoApprove');
  });

  it('always gates a non-action proposal, since there is no autonomy to resolve', () => {
    const gateBranch = workflow.steps.find(({ name }) => name === 'decision_gate') as {
      condition?: string;
    };

    // Without this the flag would skip the gate and nothing would ever move the
    // record off `pending`: there is no action run to report a result.
    expect(gateBranch.condition).toContain('inputs.actionWorkflowId');
  });

  it('lands an expired gate on dismissed rather than failed', () => {
    const fallback = workflow.settings?.['on-failure']?.fallback ?? [];
    const expiry = fallback.find(({ name }) => name === 'record_expiry');
    const failure = fallback.find(({ name }) => name === 'record_failure');

    expect(expiry?.with?.status).toBe('dismissed');
    expect(expiry?.if).toContain("error.type == 'TimeoutError'");
    // The two branches must be mutually exclusive or both would write.
    expect(failure?.if).toContain("error.type != 'TimeoutError'");
  });

  it('requires a comment so every proposal carries something a human can read', () => {
    const manualTrigger = workflow.triggers.find(({ type }) => type === 'manual');

    expect(manualTrigger?.inputs?.required).toEqual(['conversationId', 'comment']);
  });

  it('branches to dismissed unless the platform boolean is exactly true', () => {
    const dismissal = findStep(workflow.steps, 'handle_dismissal') as { condition?: string };

    expect(dismissal.condition).toContain('steps.await_decision.output.response.approved');
    expect(dismissal.condition).toContain('!= true');
  });

  it('executes the action only when the proposal carries one', () => {
    const runAction = workflow.steps.find(({ name }) => name === 'run_action') as {
      condition?: string;
    };

    expect(runAction.condition).toContain('inputs.actionWorkflowId');
  });

  it('passes the action input through under a single actionInput key', () => {
    const execute = findStep(workflow.steps, 'execute_action') as {
      with?: { 'workflow-id'?: string; inputs?: Record<string, unknown> };
    };

    // `workflow-id` is the only key the engine reads; `workflowId` is ignored.
    expect(execute.with?.['workflow-id']).toContain('inputs.actionWorkflowId');
    expect(Object.keys(execute.with?.inputs ?? {})).toEqual(['actionInput']);
  });

  it('records the execution outcome around the action', () => {
    expect(findStep(workflow.steps, 'mark_executing')?.type).toBe('investigations.updateProposal');
    expect(findStep(workflow.steps, 'record_success')?.type).toBe('investigations.updateProposal');
  });
});
