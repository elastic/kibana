/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  findStep,
  mixedConditions,
  parseWorkflow,
  stepsOfType,
  unmodelledKeys,
  VALID_STATUSES,
} from './proposal_workflows.test_helpers';
import { RESOLVE_PROPOSAL_WORKFLOW } from './resolve_proposal';
import RESOLVE_PROPOSAL_YAML from './resolve_proposal.yaml';
import { parseDuration } from '../../../common/utils';
import { ACTION_WORKFLOW_TAG } from '../../action_workflow';

const workflow = parseWorkflow(RESOLVE_PROPOSAL_YAML);

const step = (name: string) => findStep(workflow.steps, name);
const topLevel = () => workflow.steps.map(({ name }) => name);

describe('resolve-proposal workflow', () => {
  describe('contract', () => {
    it('takes the gate answer under the manual trigger, and nothing else', () => {
      const inputs = workflow.triggers.find(({ type }) => type === 'manual')?.inputs;

      expect(Object.keys(inputs?.properties ?? {}).sort()).toEqual(
        ['actionWorkflowId', 'approved', 'autoApproved', 'decidedBy', 'proposalId'].sort()
      );
      expect(inputs?.required).toEqual(['proposalId', 'approved']);
      expect(inputs?.additionalProperties).toBe(false);
    });

    it('declares the outputs the gate branches on', () => {
      expect(workflow.outputs?.map(({ name }) => name)).toEqual([
        'resolution',
        'proposalId',
        'status',
        'decision',
      ]);
    });

    it('reports only the resolutions the gate knows how to handle', () => {
      const resolutions = stepsOfType(workflow, 'workflow.output').map(
        ({ with: settings }) => settings?.resolution
      );

      expect(new Set(resolutions)).toEqual(new Set(['settled', 'refused', 'action_failed']));
    });

    it('ends every branch as completed, so the gate reads its outputs', () => {
      for (const output of stepsOfType(workflow, 'workflow.output')) {
        expect(output.status).toBe('completed');
      }
    });

    it('keeps the ceiling a sentinel, since it waits on the action', () => {
      // A ceiling that fired first would end this run while the action kept
      // going, and the gate would re-offer an action that may still succeed.
      expect(parseDuration(String(workflow.settings?.timeout))).toBeGreaterThanOrEqual(
        parseDuration('52w')
      );
    });

    it('is not billable', () => {
      expect(RESOLVE_PROPOSAL_WORKFLOW.billable).toBe(false);
    });
  });

  describe('schema parity', () => {
    it('declares no key its step schema does not model', () => {
      expect(unmodelledKeys(workflow)).toEqual([]);
    });

    it('avoids mixing and/or in a condition, which Liquid binds unpredictably', () => {
      expect(mixedConditions(workflow)).toEqual([]);
    });
  });

  describe('privilege check', () => {
    it('checks the decider before anything reads or writes on their behalf', () => {
      expect(topLevel()[0]).toBe('authorize_decision');
      expect((step('authorize_decision')?.steps ?? []).map(({ name }) => name)).toEqual([
        'check_privileges',
        'reject_unprivileged',
      ]);
    });

    it('only checks when someone answered, since autonomy has no decider', () => {
      // On the autonomy path the principal is the Worker, which necessarily
      // holds the privilege — it created the proposal.
      expect(step('authorize_decision')?.condition).toBe('${{ inputs.autoApproved != true }}');
    });

    it('passes the gate responder, or an external resume decides as the workflow runner', () => {
      expect(String(step('check_privileges')?.with?.respondedBy)).toContain('inputs.decidedBy');
    });

    it('reports a refusal and writes nothing', () => {
      const reject = step('reject_unprivileged');
      const output = step('output_refused');

      expect(reject?.condition).toContain('steps.check_privileges.output.canDecide != true');
      expect(reject?.steps?.map(({ type }) => type)).toEqual(['workflow.output']);
      expect(output?.with?.resolution).toBe('refused');
      expect(String(output?.with?.proposalId)).toContain('inputs.proposalId');
    });
  });

  describe('the live revision', () => {
    it('adopts the live head before any write, since a revision moves the chain under the gate', () => {
      // A revision appended while the gate was parked marks the row the gate
      // created `superseded`, which is terminal, so a decision written on the
      // carried id would be refused.
      const get = step('get_last_revision');
      const adopt = step('adopt_last_revision');

      expect(get?.type).toBe('proposals.getLatestRevision');
      expect(String(get?.with?.proposalId)).toContain('inputs.proposalId');
      expect(String(adopt?.with?.proposal_id)).toContain(
        'steps.get_last_revision.output.proposalId'
      );
      // The input travels with the id: resolving the head but keeping the
      // trigger's input would approve one revision and execute another's.
      expect(String(adopt?.with?.action_input)).toContain(
        'steps.get_last_revision.output.actionInput'
      );
      expect(topLevel().indexOf('adopt_last_revision')).toBeLessThan(
        topLevel().indexOf('handle_dismissal')
      );
    });

    it('writes every update against the adopted head, which survives the wait on the action', () => {
      for (const write of stepsOfType(workflow, 'proposals.updateProposal')) {
        expect(write.with?.proposalId).toBe('{{ variables.proposal_id }}');
      }
    });
  });

  describe('the decision/status pairs it writes', () => {
    it('pairs every decision it writes with a status the service accepts', () => {
      // A decision written on its own leaves the record at `pending`, which is
      // illegal under either decision.
      const decisionWrites = stepsOfType(workflow, 'proposals.updateProposal').filter(
        ({ with: settings }) => settings?.decision !== undefined
      );

      expect(decisionWrites.length).toBeGreaterThan(0);
      for (const write of decisionWrites) {
        const decision = write.with!.decision as string;

        expect(VALID_STATUSES[decision]).toContain(write.with!.status as string);
        expect(String(write.with?.decidedBy)).toContain('inputs.decidedBy');
      }
    });

    it('writes a recognised status everywhere else', () => {
      const known = new Set(Object.values(VALID_STATUSES).flat());
      const statusWrites = stepsOfType(workflow, 'proposals.updateProposal').filter(
        ({ with: settings }) => settings?.decision === undefined
      );

      for (const write of statusWrites) {
        expect(known).toContain(write.with!.status as string);
      }
    });
  });

  describe('dismissal', () => {
    it('branches to dismissed unless the answer is exactly true', () => {
      expect(step('handle_dismissal')?.condition).toBe('${{ inputs.approved != true }}');
    });

    it('records dismissed with no_action and reports it settled', () => {
      expect(step('record_dismissal')?.with).toEqual(
        expect.objectContaining({ decision: 'dismissed', status: 'no_action' })
      );
      expect(step('output_dismissed')?.with).toEqual(
        expect.objectContaining({
          resolution: 'settled',
          status: 'no_action',
          decision: 'dismissed',
        })
      );
    });
  });

  describe('approval', () => {
    it('settles a non-action approval at no_action rather than leaving it awaiting', () => {
      expect(step('approve_without_action')?.condition).toBe(
        '${{ inputs.actionWorkflowId == blank }}'
      );
      expect(step('record_approval_no_action')?.with).toEqual(
        expect.objectContaining({ decision: 'approved', status: 'no_action' })
      );
      expect(step('output_no_action')?.with?.resolution).toBe('settled');
    });

    it('records the approval as executing before running the action', () => {
      const order = topLevel();

      expect(step('record_approval_executing')?.with).toEqual(
        expect.objectContaining({ decision: 'approved', status: 'executing' })
      );
      expect(order.indexOf('record_approval_executing')).toBeGreaterThan(
        order.indexOf('approve_without_action')
      );
      expect(order.indexOf('record_approval_executing')).toBeLessThan(
        order.indexOf('execute_by_approval_mode')
      );
    });

    const EXECUTE_STEPS = ['execute_as_approver', 'execute_as_worker'];

    it.each(EXECUTE_STEPS)(
      '%s passes the live revision input through under a single actionInput key',
      (name) => {
        const settings = step(name)?.with as {
          'workflow-id'?: string;
          inputs?: Record<string, unknown>;
        };

        // `workflow-id` is the only key the engine reads; `workflowId` is ignored.
        expect(settings['workflow-id']).toContain('inputs.actionWorkflowId');
        expect(Object.keys(settings.inputs ?? {})).toEqual(['actionInput']);
        expect(String(settings.inputs?.actionInput)).toContain('variables.action_input');
      }
    );

    it.each(EXECUTE_STEPS)('%s keeps an action failure inside this run, to report it', (name) => {
      expect(step(name)?.['on-failure']?.continue).toBe(true);
    });

    describe('identity by approval mode', () => {
      it('branches on whether the caller autonomy approved', () => {
        const branch = step('execute_by_approval_mode');

        expect(branch?.type).toBe('if');
        expect(branch?.condition).toBe('${{ inputs.autoApproved != true }}');
        expect((branch?.steps ?? []).map(({ name }) => name)).toEqual([
          'execute_as_approver',
          'adopt_approver_result',
        ]);
        expect((branch?.else ?? []).map(({ name }) => name)).toEqual([
          'execute_as_worker',
          'adopt_worker_result',
        ]);
      });

      it('runs a human-approved action with the default identity, so as the approver', () => {
        expect(step('execute_as_approver')?.with?.['run-as-mode']).toBeUndefined();
      });

      it("runs an auto-approved action as the caller's service account", () => {
        expect(step('execute_as_worker')?.with?.['run-as-mode']).toBe('inherit');
      });

      // Inheritance through a templated id needs a literal allowlist. The generic
      // action tag keeps this shared workflow product-agnostic; `always-gate`
      // actions never reach this branch because the gate holds them back.
      it('lets only action workflows run as the service account', () => {
        const settings = step('execute_as_worker')?.with;

        expect(settings?.['allowed-workflow-tags']).toEqual([ACTION_WORKFLOW_TAG]);
        expect(settings?.['allowed-workflow-ids']).toBeUndefined();
      });

      it.each([
        ['adopt_approver_result', 'execute_as_approver'],
        ['adopt_worker_result', 'execute_as_worker'],
      ])('%s adopts only the result of %s', (adopt, execute) => {
        const adoptStep = step(adopt);

        expect(adoptStep?.type).toBe('data.set');
        expect(adoptStep?.with?.action_failed).toBe(`\${{ steps.${execute}.error != blank }}`);
        expect(adoptStep?.with?.action_error_message).toBe(`{{ steps.${execute}.error.message }}`);
      });
    });

    it('records a failed action and reports it for the gate to re-offer', () => {
      expect(step('handle_action_failure')?.condition).toBe(
        '${{ variables.action_failed == true }}'
      );
      expect(step('record_action_failure')?.with).toEqual(
        expect.objectContaining({
          status: 'failed',
          executionError: '{{ variables.action_error_message }}',
        })
      );
      expect(step('output_action_failed')?.with).toEqual(
        expect.objectContaining({ resolution: 'action_failed', status: 'failed' })
      );
    });

    it('records the outcome of a successful action and reports it settled', () => {
      const order = topLevel();

      expect(step('record_success')?.with?.status).toBe('succeeded');
      expect(step('output_succeeded')?.with).toEqual(
        expect.objectContaining({
          resolution: 'settled',
          status: 'succeeded',
          decision: 'approved',
        })
      );
      expect(order.slice(-2)).toEqual(['record_success', 'output_succeeded']);
    });
  });

  describe('what it leaves to the gate', () => {
    it('never parks, loops or re-offers: the gate owns all three', () => {
      for (const type of ['waitForApproval', 'while', 'loop.continue', 'loop.break']) {
        expect(stepsOfType(workflow, type)).toEqual([]);
      }
      expect(stepsOfType(workflow, 'proposals.cloneProposal')).toEqual([]);
    });

    it('creates nothing, so every proposal keeps pointing at the parked gate execution', () => {
      expect(stepsOfType(workflow, 'proposals.createProposal')).toEqual([]);
    });
  });
});
