/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CREATE_PROPOSAL_WORKFLOW } from './create_proposal';
import CREATE_PROPOSAL_YAML from './create_proposal.yaml';
import {
  collectNames,
  findStep,
  mixedConditions,
  parseWorkflow,
  stepsOfType,
  unmodelledKeys,
  VALID_STATUSES,
} from './proposal_workflows.test_helpers';
import { RESOLVE_PROPOSAL_WORKFLOW_ID } from './resolve_proposal';
import RESOLVE_PROPOSAL_YAML from './resolve_proposal.yaml';
import { isValidDuration, parseDuration } from '../../../common/utils';

const workflow = parseWorkflow(CREATE_PROPOSAL_YAML);
const resolveWorkflow = parseWorkflow(RESOLVE_PROPOSAL_YAML);

/** The deadline a caller gets when it does not ask for one. */
const DEFAULT_EXPIRES_IN = '72h';

const step = (name: string) => findStep(workflow.steps, name);
const gate = () => step('await_decision')!;
const loop = () => step('decision_loop')!;
const loopBody = () => (loop().steps ?? []).map(({ name }) => name);

/** Every resolution a condition in the gate tests for. */
const handledResolutions = (): string[] =>
  stepsOfType(workflow, 'if').flatMap(({ condition }) =>
    [...String(condition).matchAll(/variables\.resolution == '([a-z_]+)'/g)].map(
      ([, resolution]) => resolution
    )
  );

describe('create-investigation-proposal workflow', () => {
  describe('contract', () => {
    it('declares inputs under the manual trigger, since a top-level inputs block is not valid', () => {
      const manualTrigger = workflow.triggers.find(({ type }) => type === 'manual');

      expect(manualTrigger?.inputs?.properties).toEqual(
        expect.objectContaining({
          conversationId: expect.anything(),
          title: expect.anything(),
          actionWorkflowId: expect.anything(),
          actionInput: expect.anything(),
          impact: expect.anything(),
          category: expect.anything(),
          origin: expect.anything(),
          autoApprove: expect.anything(),
        })
      );
    });

    it('forwards the caller-owned display and provenance fields rather than naming any itself', () => {
      // This workflow is solution-agnostic: an `origin` hardcoded here would
      // stamp every caller with one solution's name, and a `title` dropped here
      // would leave the queue showing the action's name for all of them.
      const create = step('create_proposal');

      expect(String(create?.with?.origin)).toContain('inputs.origin');
      expect(String(create?.with?.title)).toContain('inputs.title');
    });

    it('forwards the grouping overrides, or a non-action proposal cannot be grouped', () => {
      // `category` is the only way a proposal with no action gets one, and
      // consumers drop what they cannot group.
      const create = step('create_proposal');

      expect(String(create?.with?.category)).toContain('inputs.category');
      expect(String(create?.with?.impact)).toContain('inputs.impact');
    });

    it('types actionInput as a free-form object so any action shape can pass through', () => {
      const actionInput = workflow.triggers.find(({ type }) => type === 'manual')?.inputs
        ?.properties?.actionInput as { type?: string; additionalProperties?: boolean };

      expect(actionInput.type).toBe('object');
      expect(actionInput.additionalProperties).toBe(true);
    });

    it('requires a comment so every proposal carries something a human can read', () => {
      const manualTrigger = workflow.triggers.find(({ type }) => type === 'manual');

      // `origin` is required for a different reason: it is an open vocabulary,
      // so an omitted one would be stored as a value nothing ever filters on.
      expect(manualTrigger?.inputs?.required).toEqual(['conversationId', 'comment', 'origin']);
    });

    it('declares the outputs a caller gets back from workflow.execute', () => {
      expect(workflow.outputs?.map(({ name }) => name)).toEqual([
        'proposalId',
        'status',
        'decision',
      ]);
    });

    it('is not billable', () => {
      expect(CREATE_PROPOSAL_WORKFLOW.billable).toBe(false);
    });
  });

  describe('a caller-supplied proposalId', () => {
    it('takes an optional proposalId and forwards it to the create step', () => {
      const manual = workflow.triggers.find(({ type }) => type === 'manual');
      const input = manual?.inputs?.properties?.proposalId as { type?: string } | undefined;

      expect(input?.type).toBe('string');
      expect(manual?.inputs?.required).not.toContain('proposalId');
      expect(String(step('create_proposal')?.with?.proposalId)).toContain('inputs.proposalId');
    });

    it('adds no branch of its own: a duplicate id fails the create step, before any gate', () => {
      // A duplicate is an error from the service, and the workflow does not
      // interpret it. Nothing before the create step could park a gate or
      // record a proposal id, so a failed create has nothing to settle.
      expect(step('stop_if_reused')).toBeUndefined();
      expect(workflow.outputs?.map(({ name }) => name)).toEqual([
        'proposalId',
        'status',
        'decision',
      ]);
    });
  });

  describe('timeouts', () => {
    it('gates on waitForApproval so the release signal is fail-closed', () => {
      expect(gate().type).toBe('waitForApproval');
    });

    it('parks for what is left of the deadline rather than a duration of its own', () => {
      // A literal here restarts the wait on every re-park, so a proposal
      // re-parked just before its deadline would wait out a second full
      // window. It would also be a second deadline that could drift from the
      // one on the record; the gate has none, so `expiresIn` is the only one.
      // Rendered once at wait-entry — elastic/kibana#291744.
      expect(gate().timeout).toBe('{{ variables.remaining_seconds | at_least: 1 }}s');
    });

    it('floors the park at a second, which is what removes the pre-gate expiry check', () => {
      // A proposal can reach the gate already expired — a cloned retry after a
      // long action. Without the floor that renders as a zero or negative
      // duration, which `assertValidDuration` rejects, and the loop needed its
      // own expiry branch to avoid ever getting there. With it, such a
      // proposal parks for a second and times out into the one branch that
      // settles an expiry.
      expect(gate().timeout).toContain('at_least: 1');
      expect(step('settle_expired')).toBeUndefined();
    });

    it('always creates with a deadline, which the gate timeout depends on', () => {
      // `remaining_seconds` only counts down from an `expiresAt`. The caller
      // may supply one, but the default has to be a duration the service can
      // resolve, or the gate has nothing to park against.
      const expiresIn = String(step('create_proposal')?.with?.expiresIn);

      expect(expiresIn).toContain('inputs.expiresIn');
      expect(isValidDuration(DEFAULT_EXPIRES_IN)).toBe(true);
      expect(expiresIn).toContain(`default: '${DEFAULT_EXPIRES_IN}'`);
    });

    it('keeps the ceiling a sentinel, not a bound sized to any particular deadline', () => {
      // The ceiling runs no handler at all — `EnterWorkflowTimeoutZoneNodeImpl
      // .monitor()` marks the execution TIMED_OUT and `catchError` returns
      // early — so a ceiling that can fire before the gate settles strands the
      // record, which is the outcome this definition exists to prevent. The
      // engine has no "no timeout", so the only safe value is one far beyond
      // any deadline a caller would pass. Orders of magnitude, not margin.
      const ceiling = parseDuration(String(workflow.settings?.timeout));

      expect(ceiling).toBeGreaterThan(parseDuration(DEFAULT_EXPIRES_IN) * 50);
    });

    it('does not bound the deadline a caller may ask for', () => {
      // Bounding it would only ever exist to protect the ceiling, and the
      // ceiling is a sentinel precisely so no such bound is needed.
      const expiresIn = workflow.triggers.find(({ type }) => type === 'manual')?.inputs?.properties
        ?.expiresIn as { type?: string; enum?: string[]; maxLength?: number } | undefined;

      expect(expiresIn?.type).toBe('string');
      expect(expiresIn?.enum).toBeUndefined();
      expect(expiresIn?.maxLength).toBeUndefined();
    });

    it('does not set iteration-timeout, which would truncate the parked gate', () => {
      expect(loop()['iteration-timeout']).toBeUndefined();
    });
  });

  describe('schema parity', () => {
    // Keeps every key the gate declares — including `on-failure` on the gate
    // and on both resolution calls, which their handlers rely on — modelled by
    // a schema.
    it('declares no key its step schema does not model', () => {
      expect(unmodelledKeys(workflow)).toEqual([]);
    });
  });

  describe('the decision loop', () => {
    it('loops while no decision has settled the proposal', () => {
      expect(loop().type).toBe('while');
      expect(loop().condition).toContain('variables.completed');
    });

    it('leaves the loop on max-iterations rather than throwing, and counts it only once', () => {
      // `ExitWhileNodeImpl` throws on `on-limit: fail`, and a `while` is in
      // `flowControlStepTypes`, which `handleWorkflowLevelOnFailure` skips —
      // so that throw would reach no handler and strand the record. `continue`
      // exits the loop and falls through to `output_result`.
      //
      // The budget used to be counted twice: `max-iterations` plus a
      // hand-rolled `attempts_left` compared in a `settle_exhausted` block,
      // which existed only because the throw was unreachable. One counter now.
      const maxIterations = loop()['max-iterations'] as { limit?: number; 'on-limit'?: string };

      expect(maxIterations['on-limit']).toBe('continue');
      expect(maxIterations.limit).toBeGreaterThanOrEqual(200);
      expect(step('settle_exhausted')).toBeUndefined();
      expect(workflow.consts?.max_attempts).toBeUndefined();
    });

    it('settles the record when the loop exits without having settled it', () => {
      // `on-limit: continue` leaves the loop with nothing written, and the run
      // would otherwise report `pending` against an execution that is over —
      // a proposal nothing can ever decide, which is the outcome the rest of
      // this definition exists to prevent. The budget gets the same treatment
      // as every other way out of the loop.
      const top = workflow.steps.map(({ name }) => name);
      const settle = step('settle_unfinished');
      const record = step('record_unfinished');

      expect(settle?.condition).toContain('variables.completed != true');
      expect(record?.type).toBe('proposals.settleIncompleteProposal');
      expect(record?.with?.status).toBe('expired');
      expect(top.indexOf('settle_unfinished')).toBeGreaterThan(top.indexOf('decision_loop'));
      expect(top.indexOf('settle_unfinished')).toBeLessThan(top.indexOf('output_result'));
    });

    it('derives each attempt from the fixed deadline, so a retry cannot extend it', () => {
      expect(String(step('init_state')?.with?.expires_epoch)).toContain(
        'steps.create_proposal.output.expiresAt'
      );
      expect(String(step('compute_remaining')?.with?.remaining_seconds)).toContain(
        'variables.expires_epoch'
      );
    });

    it('reads the clock and subtracts it in one step, only where the gate needs it', () => {
      // Liquid cannot read a variable written by the same `data.set`, which
      // would otherwise mean storing `now_epoch` and subtracting it in a
      // second step. Negating `now` and adding it needs no intermediate.
      //
      // Only the gate reads the clock, so the step lives inside `gate_branch`:
      // the autonomy path never waits, and nothing after the gate re-reads it.
      const gateSteps = (step('gate_branch')?.steps ?? []).map(({ name }) => name);

      expect(gateSteps).toContain('compute_remaining');
      expect(String(step('compute_remaining')?.with?.remaining_seconds)).toContain(
        'times: -1 | plus: variables.expires_epoch'
      );
      expect(step('recompute_remaining')).toBeUndefined();
    });

    it('carries "no deadline" as a date the loop never reaches, not as a second flag', () => {
      // A proposal with no `expiresAt` would otherwise need a `has_deadline`
      // guard wherever the deadline is read. Defaulting the epoch to a
      // far-future date says the same thing arithmetically, and the gate just
      // parks for a very long time.
      expect(String(step('init_state')?.with?.expires_epoch)).toContain('default:');
    });

    it('avoids mixing and/or in a condition, which Liquid binds unpredictably', () => {
      expect(mixedConditions(workflow)).toEqual([]);
    });

    it('copies the gate output into variables inside the iteration that produced it', () => {
      // A step output resolves to its latest execution, so a later iteration
      // that skipped the gate would otherwise read this pass's values.
      expect(step('resolve_gate')?.type).toBe('data.set');
      expect(collectNames(step('gate_branch')?.steps ?? [])).toContain('resolve_gate');
    });

    it('reads only variables after the loop, since loop step outputs are evicted', () => {
      const output = workflow.steps.find(({ name }) => name === 'output_result');

      for (const value of Object.values(output?.with ?? {})) {
        expect(String(value)).not.toContain('steps.');
      }
    });
  });

  describe('what it writes itself', () => {
    it('checks and records no decision, since it would attribute its own identity', () => {
      // This run may execute as the caller's service account. A decide check
      // here would authorize that account, and a decision written here would
      // record it, whoever answered the gate.
      expect(stepsOfType(workflow, 'proposals.checkDecidePrivileges')).toEqual([]);
      expect(
        stepsOfType(workflow, 'proposals.updateProposal').filter(
          ({ with: settings }) => settings?.decision !== undefined
        )
      ).toEqual([]);
    });

    it('writes a recognised status everywhere it writes one', () => {
      const known = new Set(Object.values(VALID_STATUSES).flat());

      for (const write of stepsOfType(workflow, 'proposals.updateProposal')) {
        expect(known).toContain(write.with?.status as string);
      }
    });

    it('creates and clones every proposal itself, so each one points at this execution', () => {
      // `createProposal` stamps the execution it runs in, and a clone copies
      // the original's. Both run here, where the gate is parked, so approving
      // any proposal resumes the execution that can still act on it.
      expect(stepsOfType(workflow, 'proposals.createProposal')).toHaveLength(1);
      expect(stepsOfType(workflow, 'proposals.cloneProposal')).toHaveLength(1);
      expect(stepsOfType(resolveWorkflow, 'proposals.createProposal')).toEqual([]);
      expect(stepsOfType(resolveWorkflow, 'proposals.cloneProposal')).toEqual([]);
    });
  });

  describe('resolving the answer', () => {
    const RESOLVE_STEPS = ['resolve_as_approver', 'resolve_as_worker'];

    it('resolves after the timeout branch and before any outcome branch', () => {
      const body = loopBody();
      const resolve = body.indexOf('resolve_by_approval_mode');

      expect(resolve).toBeGreaterThan(body.indexOf('gate_branch'));
      expect(resolve).toBeGreaterThan(body.indexOf('handle_gate_timeout'));
      for (const branch of [
        'handle_resolution_failure',
        'handle_settled',
        'handle_action_failure',
        'handle_unapplied_answer',
      ]) {
        expect(body.indexOf(branch)).toBeGreaterThan(resolve);
      }
    });

    it('resolves as whoever answered, and as the inherited service account otherwise', () => {
      const branch = step('resolve_by_approval_mode');

      expect(branch?.type).toBe('if');
      expect(branch?.condition).toBe('${{ variables.gate_answered == true }}');
      expect((branch?.steps ?? []).map(({ name }) => name)).toEqual([
        'resolve_as_approver',
        'adopt_approver_resolution',
      ]);
      expect((branch?.else ?? []).map(({ name }) => name)).toEqual([
        'resolve_as_worker',
        'adopt_worker_resolution',
      ]);
    });

    it.each(RESOLVE_STEPS)(
      '%s names the child by a literal id, which inheriting an identity requires',
      (name) => {
        const resolve = step(name);

        expect(resolve?.type).toBe('workflow.execute');
        expect(resolve?.with?.['workflow-id']).toBe(RESOLVE_PROPOSAL_WORKFLOW_ID);
      }
    );

    it.each(RESOLVE_STEPS)('%s keeps a failed child inside the loop, to be recovered', (name) => {
      expect(step(name)?.['on-failure']?.continue).toBe(true);
    });

    it.each(RESOLVE_STEPS)('%s passes exactly the inputs the child declares', (name) => {
      const declared = Object.keys(
        resolveWorkflow.triggers.find(({ type }) => type === 'manual')?.inputs?.properties ?? {}
      );
      const inputs = step(name)?.with?.inputs as Record<string, unknown>;

      expect(Object.keys(inputs).sort()).toEqual(declared.sort());
      expect(String(inputs.proposalId)).toContain('variables.current_proposal_id');
      expect(String(inputs.actionWorkflowId)).toContain('variables.action_workflow_id');
    });

    it('runs a human answer with the default identity, so as whoever answered', () => {
      const resolve = step('resolve_as_approver');
      const inputs = resolve?.with?.inputs as Record<string, unknown>;

      expect(resolve?.with?.['run-as-mode']).toBeUndefined();
      expect(String(inputs.approved)).toContain('variables.gate_approved');
      expect(String(inputs.decidedBy)).toContain('variables.decided_by');
      expect(inputs.autoApproved).toBe(false);
    });

    it("runs an autonomous approval as the caller's service account, attributed to it", () => {
      const resolve = step('resolve_as_worker');
      const inputs = resolve?.with?.inputs as Record<string, unknown>;

      expect(resolve?.with?.['run-as-mode']).toBe('inherit');
      expect(inputs.approved).toBe(true);
      expect(inputs.decidedBy).toBe('');
      expect(inputs.autoApproved).toBe(true);
    });

    // A step that did not run this pass still returns its previous value, so
    // each branch adopts only the result of its own step.
    it.each([
      ['adopt_approver_resolution', 'resolve_as_approver'],
      ['adopt_worker_resolution', 'resolve_as_worker'],
    ])('%s adopts only the result of %s, reading a failure as `failed`', (adopt, resolve) => {
      const values = step(adopt)?.with ?? {};

      expect(step(adopt)?.type).toBe('data.set');
      expect(values.resolution).toBe(
        `{{ steps.${resolve}.output.resolution | default: 'failed' }}`
      );
      expect(values.resolution_error).toBe(`{{ steps.${resolve}.error.message }}`);
      for (const value of Object.values(values)) {
        expect(String(value)).toContain(`steps.${resolve}.`);
      }
    });

    it('handles every resolution the child reports', () => {
      const reported = stepsOfType(resolveWorkflow, 'workflow.output').map(
        ({ with: settings }) => settings?.resolution as string
      );

      expect(reported.length).toBeGreaterThan(0);
      expect(new Set(handledResolutions())).toEqual(new Set([...reported, 'failed', 'unresolved']));
    });
  });

  describe('a failed resolution', () => {
    it('reads the live revision to find out how far the child got', () => {
      const get = step('get_unresolved_revision');

      expect(step('handle_resolution_failure')?.condition).toBe(
        "${{ variables.resolution == 'failed' }}"
      );
      expect(get?.type).toBe('proposals.getLatestRevision');
      expect(String(get?.with?.proposalId)).toContain('variables.current_proposal_id');
    });

    it('takes the revision as settled unless it finds otherwise', () => {
      const adopt = step('adopt_unresolved_revision')?.with ?? {};
      const recovery = (step('handle_resolution_failure')?.steps ?? []).map(({ name }) => name);

      expect(adopt.resolution).toBe('settled');
      expect(String(adopt.resolved_status)).toContain(
        'steps.get_unresolved_revision.output.status'
      );
      expect(recovery.indexOf('adopt_unresolved_revision')).toBe(1);
    });

    it('re-parks an undecided revision, since the answer never landed', () => {
      expect(step('handle_unanswered_revision')?.condition).toContain(
        'steps.get_unresolved_revision.output.decision == blank'
      );
      expect(step('adopt_unanswered_revision')?.with?.resolution).toBe('unresolved');
    });

    it('records an approval caught mid-action as failed, to re-offer it', () => {
      const record = step('record_interrupted_action');

      expect(step('handle_interrupted_action')?.condition).toContain(
        "steps.get_unresolved_revision.output.status == 'executing'"
      );
      expect(record?.type).toBe('proposals.updateProposal');
      expect(record?.with?.status).toBe('failed');
      expect(record?.with?.decision).toBeUndefined();
      expect(String(record?.with?.proposalId)).toContain('variables.resolved_proposal_id');
      expect(String(record?.with?.executionError)).toContain('variables.resolution_error');
      // The approver of the clone must know the first attempt may have taken effect.
      expect(String(record?.with?.executionError)).toContain('may have run');
      expect(step('adopt_interrupted_action')?.with?.resolution).toBe('action_failed');
    });

    it('re-offers a failure the child recorded but did not report', () => {
      expect(step('handle_unreported_failure')?.condition).toContain(
        "steps.get_unresolved_revision.output.status == 'failed'"
      );
      expect(step('adopt_unreported_failure')?.with?.resolution).toBe('action_failed');
    });
  });

  describe('the outcome of a resolution', () => {
    it('completes on a settled resolution, with what the child recorded', () => {
      const complete = step('complete_settled')?.with ?? {};

      expect(step('handle_settled')?.condition).toBe("${{ variables.resolution == 'settled' }}");
      expect(complete.completed).toBe(true);
      expect(String(complete.current_proposal_id)).toContain('variables.resolved_proposal_id');
      expect(String(complete.final_status)).toContain('variables.resolved_status');
      expect(String(complete.final_decision)).toContain('variables.resolved_decision');
      expect(step('break_settled')?.type).toBe('loop.break');
    });

    it('re-offers a failed action as a clone parked on this execution', () => {
      expect(step('handle_action_failure')?.condition).toBe(
        "${{ variables.resolution == 'action_failed' }}"
      );
      expect(step('clone_proposal')?.type).toBe('proposals.cloneProposal');
      expect(String(step('clone_proposal')?.with?.proposalId)).toContain(
        'variables.resolved_proposal_id'
      );
    });

    it('advances the carried id inside the branch that produced the clone', () => {
      const adopt = step('adopt_clone');

      expect(String(adopt?.with?.current_proposal_id)).toContain(
        'steps.clone_proposal.output.proposalId'
      );
      expect(adopt?.with?.needs_gate).toBe(true);
      expect(step('park_on_clone')?.type).toBe('loop.continue');
    });

    it('waits for a human when the answer was not applied, even under autonomy', () => {
      const handle = step('handle_unapplied_answer');
      const adopt = step('adopt_unapplied_answer');

      expect(handle?.condition).toContain("variables.resolution == 'refused'");
      expect(handle?.condition).toContain("variables.resolution == 'unresolved'");
      expect(String(adopt?.with?.current_proposal_id)).toContain('variables.resolved_proposal_id');
      expect(adopt?.with?.needs_gate).toBe(true);
      expect(step('park_again')?.type).toBe('loop.continue');
    });
  });

  describe('gate failures', () => {
    it('settles an expiry in one place, since the gate timeout is the deadline', () => {
      // The loop used to check the clock again after the gate, to catch a
      // decision resumed past the deadline. The engine's own timeout task
      // fires at the deadline, so that only covered the seconds before the
      // task was claimed — and the release route refuses an expired decision
      // anyway. One branch, keyed on the timeout, is the whole expiry story.
      const body = loopBody();

      expect(body.filter((name) => name?.startsWith('settle_expired'))).toEqual([]);
      expect(body).toContain('handle_gate_timeout');
    });

    it('keeps a gate failure inside the loop, so the loop settles it', () => {
      // Without this the workflow-level handler settles the record too, but
      // ends the run as `failed` and skips the output step — and a timeout is
      // the expected end of an unanswered proposal, not a malfunction.
      expect(gate()['on-failure']?.continue).toBe(true);
    });

    it('carries the timeout out of the gate branch as a variable, since the output is evicted', () => {
      // `handle_gate_timeout` runs after the gate branch, where
      // `steps.await_decision` is no longer readable, so `resolve_gate` has to
      // hand the failure on the same way it hands on the answer.
      const gateBranchOrder = (step('gate_branch')?.steps ?? []).map(({ name }) => name);
      expect(gateBranchOrder).toEqual(['compute_remaining', 'await_decision', 'resolve_gate']);

      const resolve = step('resolve_gate');
      expect(String(resolve?.with?.gate_timed_out)).toContain('steps.await_decision.error');
      expect(String(resolve?.with?.gate_error)).toContain('steps.await_decision.error.message');

      // Variables outlive an iteration, so the autonomy branch has to set
      // every one of them or a later pass reads the gated pass's answer.
      const auto = step('resolve_auto');
      expect(Object.keys(auto?.with ?? {}).sort()).toEqual(Object.keys(resolve?.with ?? {}).sort());
    });

    it("puts the autonomy path in the gate step's else, so the two cannot both run", () => {
      // They were two `if` steps with complementary conditions, which left the
      // mutual exclusivity to the reader and to whoever edits either condition.
      const gateStep = step('gate_branch');

      expect(gateStep?.condition).toContain('variables.needs_gate == true');
      expect((gateStep?.else ?? []).map(({ name }) => name)).toEqual(['resolve_auto']);
      expect(step('auto_branch')).toBeUndefined();
    });

    it('settles a timed-out gate as expired, on the deadline it was parked against', () => {
      const record = step('record_gate_expiry');

      expect(step('handle_gate_timeout')?.condition).toContain('variables.gate_timed_out == true');
      expect(record?.type).toBe('proposals.settleIncompleteProposal');
      expect(record?.with?.status).toBe('expired');
      expect(String(record?.with?.executionError)).toContain('variables.gate_error');
      expect(step('break_gate_expiry')?.type).toBe('loop.break');
    });

    it('settles a timeout before the resolution, which would record a dismissal nobody made', () => {
      // A timed-out gate answers blank, so `gate_approved` is false and the
      // child would record it as a dismissal.
      const body = loopBody();

      expect(body.indexOf('handle_gate_timeout')).toBeLessThan(
        body.indexOf('resolve_by_approval_mode')
      );
    });
  });

  describe('autonomy', () => {
    it('skips the gate when the caller already resolved autonomy for an action', () => {
      expect(String(step('init_state')?.with?.needs_gate)).toContain('autoApprove');
    });

    it('always gates a non-action proposal, since there is no autonomy to resolve', () => {
      // Without this the flag would skip the gate and approval — the whole
      // lifecycle of a non-action proposal — would never be recorded.
      expect(String(step('init_state')?.with?.needs_gate)).toContain('inputs.actionWorkflowId');
    });

    it('always gates an action that declares always-gate, whatever the caller resolved', () => {
      // The action's own policy has to outrank the flag, or a Worker could
      // auto-approve an action whose author declared it must never be.
      expect(String(step('init_state')?.with?.needs_gate)).toContain(
        'steps.create_proposal.output.alwaysGate'
      );
    });

    it('combines the gating reasons with or alone, since Liquid cannot bind a mixed expression', () => {
      // No parentheses and no operator precedence: one `and` among the `or`s
      // would silently gate the wrong proposals.
      expect(String(step('init_state')?.with?.needs_gate)).not.toContain(' and ');
    });
  });

  describe('workflow-level failure handling', () => {
    const fallback = () => workflow.settings?.['on-failure']?.fallback ?? [];

    it('settles from a single incomplete-settle step, not a get-then-update chain', () => {
      // Workflow-level fallback steps are renamed
      // `workflow-level-on-failure_<failed>_<name>`, so Liquid `steps.<name>`
      // references resolve to nothing. One step that adopts and settles keeps
      // the handler working.
      expect(fallback().map(({ name, type }) => ({ name, type }))).toEqual([
        { name: 'settle_on_failure', type: 'proposals.settleIncompleteProposal' },
      ]);
    });

    it('settles from the carried id, not the create step output that a clone invalidates', () => {
      expect(String(findStep(fallback(), 'settle_on_failure')?.with?.proposalId)).toContain(
        'variables.current_proposal_id'
      );
    });

    it('omits status so the step discriminates decided→failed / undecided→expired', () => {
      // All three timeout sources share `type: TimeoutError`, and
      // `ExecutionError` carries nothing else to tell them apart — so the
      // record's own decision is what chooses the terminal status.
      const settle = findStep(fallback(), 'settle_on_failure');

      expect(settle?.with?.status).toBeUndefined();
      expect(String(settle?.with?.executionError)).toContain('error.message');
    });

    it('guards the id only here, where creation itself may have failed', () => {
      // Inside the loop `current_proposal_id` is always set — `init_state`
      // runs right after `create_proposal`, and a failed creation skips it.
      // This handler is the one place that runs with no id to settle.
      const guarded = fallback().every((fallbackStep) =>
        String(fallbackStep.if).includes('current_proposal_id != blank')
      );
      const inLoop = collectNames(loop().steps ?? [])
        .map((name) => step(name))
        .filter((loopStep) => String(loopStep?.condition).includes('current_proposal_id != blank'));

      expect(guarded).toBe(true);
      expect(inLoop).toEqual([]);
    });
  });
});
