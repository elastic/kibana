/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import type { z } from '@kbn/zod/v4';
import CREATE_INVESTIGATION_PROPOSAL_YAML from './create_investigation_proposal.yaml';
import {
  DataSetStepSchema,
  IfStepSchema,
  LoopBreakStepSchema,
  LoopContinueStepSchema,
  WaitForApprovalStepSchema,
  WhileStepSchema,
  WorkflowExecuteStepSchema,
  WorkflowOutputStepSchema,
} from '../../../../spec/schema';

/** Local shape: the parsed YAML is untyped, and only these fields are asserted on. */
interface WorkflowStep {
  name?: string;
  type?: string;
  condition?: string;
  if?: string;
  timeout?: string;
  'on-failure'?: {
    continue?: boolean | string;
    fallback?: WorkflowStep[];
    retry?: { 'max-attempts'?: number; delay?: string; condition?: string };
  };
  'max-iterations'?: number | { limit?: number; 'on-limit'?: string };
  'iteration-timeout'?: string;
  with?: Record<string, unknown>;
  steps?: WorkflowStep[];
}

interface ParsedWorkflow {
  consts?: Record<string, unknown>;
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
    const nested = step.steps;
    if (nested) {
      const match = findStep(nested, name);
      if (match) {
        return match;
      }
    }
  }
  return undefined;
};

/** Every descendant of a step, so containment can be asserted. */
const collectNames = (steps: WorkflowStep[]): string[] =>
  steps.flatMap((step) => [step.name ?? '', ...collectNames(step.steps ?? [])]);

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

const gate = () => findStep(workflow.steps, 'await_decision')!;
const loop = () => findStep(workflow.steps, 'decision_loop')!;

/**
 * Mirrors `VALID_STATUSES` in the plugin's `proposals_service`. Duplicated
 * rather than imported because a package cannot depend on a plugin, and the
 * pairing rule is worth enforcing here: the service rejects an illegal pair at
 * runtime, which in a workflow means a failed execution rather than a type
 * error.
 */
const VALID_STATUSES: Record<string, readonly string[]> = {
  undecided: ['pending', 'expired'],
  dismissed: ['no_action'],
  approved: ['no_action', 'executing', 'succeeded', 'failed'],
};

/**
 * The schemas the engine models built-in steps with. The custom `proposals.*`
 * steps are absent on purpose: this repo owns their schemas, so a key written
 * here is a key it declared.
 */
const BUILT_IN_STEP_SCHEMAS: Record<string, z.ZodType> = {
  'data.set': DataSetStepSchema,
  if: IfStepSchema,
  'loop.break': LoopBreakStepSchema,
  'loop.continue': LoopContinueStepSchema,
  waitForApproval: WaitForApprovalStepSchema,
  while: WhileStepSchema,
  'workflow.execute': WorkflowExecuteStepSchema,
  'workflow.output': WorkflowOutputStepSchema,
};

/** Every step in the definition, including the failure handler's fallback. */
const allSteps = (): WorkflowStep[] => {
  const flatten = (steps: WorkflowStep[]): WorkflowStep[] =>
    steps.flatMap((step) => [step, ...flatten(step.steps ?? [])]);

  return [
    ...flatten(workflow.steps),
    ...flatten(workflow.settings?.['on-failure']?.fallback ?? []),
  ];
};

/** Every `proposals.updateProposal` step anywhere in the definition. */
const updateProposalSteps = (): WorkflowStep[] => {
  const collect = (steps: WorkflowStep[]): WorkflowStep[] =>
    steps.flatMap((step) => [
      ...(step.type === 'proposals.updateProposal' ? [step] : []),
      ...collect(step.steps ?? []),
    ]);

  return [
    ...collect(workflow.steps),
    ...collect(workflow.settings?.['on-failure']?.fallback ?? []),
  ];
};

describe('create-investigation-proposal workflow', () => {
  describe('contract', () => {
    it('declares inputs under the manual trigger, since a top-level inputs block is not valid', () => {
      const manualTrigger = workflow.triggers.find(({ type }) => type === 'manual');

      expect(manualTrigger?.inputs?.properties).toEqual(
        expect.objectContaining({
          conversationId: expect.anything(),
          actionWorkflowId: expect.anything(),
          actionInput: expect.anything(),
          impact: expect.anything(),
          category: expect.anything(),
          autoApprove: expect.anything(),
        })
      );
    });

    it('forwards the grouping overrides, or a non-action proposal cannot be grouped', () => {
      // `category` is the only way a proposal with no action gets one, and
      // consumers drop what they cannot group.
      const create = findStep(workflow.steps, 'create_proposal');

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

      expect(manualTrigger?.inputs?.required).toEqual(['conversationId', 'comment']);
    });

    it('declares the outputs a caller gets back from workflow.execute', () => {
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

    it('keeps the gate timeout static, since the engine does not template-render it', () => {
      // A template here reaches the duration parser unrendered and throws at
      // execution time. See elastic/kibana#290258.
      expect(gate().timeout).not.toContain('{{');
      expect(() => durationToMs(gate().timeout ?? '')).not.toThrow();
    });

    it('records the same deadline it applies to the gate', () => {
      const create = findStep(workflow.steps, 'create_proposal');

      expect(create?.with?.expiresIn).toBe(gate().timeout);
    });

    it('keeps the workflow ceiling above the gate, so the gate times out first', () => {
      // The ceiling must never fire first. Its timeout runs no handler at all
      // — `EnterWorkflowTimeoutZoneNodeImpl.monitor()` marks the execution
      // TIMED_OUT and `catchError` returns early — whereas the gate's timeout
      // reaches the workflow-level handler, which settles the record as
      // `expired`. The workflow clock also starts before the gate is entered,
      // so equal values put the ceiling first and no proposal would ever
      // settle.
      const ceiling = durationToMs(workflow.settings?.timeout ?? '');

      expect(ceiling).toBeGreaterThan(durationToMs(gate().timeout ?? ''));
    });

    it('does not set iteration-timeout, which would truncate the parked gate', () => {
      expect(loop()['iteration-timeout']).toBeUndefined();
    });
  });

  describe('schema parity', () => {
    /**
     * A zod object drops a key it does not model rather than complaining, and
     * every other assertion in this file reads the raw YAML — so a step can
     * declare something no schema has heard of and still look wired.
     *
     * Managed workflows install under `lightweightValidation`, which does not
     * validate steps at all, so production neither rejects nor strips such a
     * key: whether it does anything is entirely up to the engine. Both keys
     * below are honoured by it — `handleStepLevelOnFailure` wraps any step
     * that declares `on-failure`, with no exclusion by type — but neither
     * `WaitForApprovalStepSchema` nor `WorkflowExecuteStepSchema` merges
     * `StepWithOnFailureSchema`, unlike the connector-derived schema every
     * custom step gets. This is the only place that names what is load-bearing
     * by accident, so the list shrinks when
     * elastic/security-team#19315 lands rather than silently staying stale.
     */
    it('declares no unmodelled key beyond the two the platform still owes us', () => {
      const unmodelled = allSteps().flatMap((step) => {
        const schema = step.type ? BUILT_IN_STEP_SCHEMAS[step.type] : undefined;
        if (!schema) {
          return [];
        }
        const parsed = schema.safeParse(step);
        if (!parsed.success) {
          return [`${step.name} (${step.type}): does not satisfy its own schema`];
        }
        const modelled = new Set(Object.keys(parsed.data as object));
        return Object.keys(step)
          .filter((key) => !modelled.has(key))
          .map((key) => `${step.name} (${step.type}): ${key}`);
      });

      // Both are load-bearing and both are covered end to end by the plugin's
      // integration tests: the gate's handler settles an unanswered proposal
      // as `expired`, and the action's keeps a failed action inside the loop
      // so it can be cloned and re-offered. Pinned, not removed.
      // The two settle blocks use the same engine-honoured-but-schema-unmodelled
      // key on `if` steps: their `on-failure.retry` re-resolves the live head
      // before rewriting when a revision wins the TOCTOU race against
      // `record_expiry`/`record_exhaustion`. Same #19315 gap, pinned likewise.
      expect(unmodelled.sort()).toEqual([
        'await_decision (waitForApproval): on-failure',
        'execute_action (workflow.execute): on-failure',
        'settle_exhausted (if): on-failure',
        'settle_expired (if): on-failure',
      ]);
    });
  });

  describe('the decision loop', () => {
    it('loops while no decision has settled the proposal', () => {
      expect(loop().type).toBe('while');
      expect(loop().condition).toContain('variables.completed');
    });

    it('bounds itself in-loop as well as with max-iterations', () => {
      const maxIterations = loop()['max-iterations'] as { limit?: number; 'on-limit'?: string };

      // `on-limit: fail` alone cannot settle the record: a `while` is a
      // flow-control step, so it is excluded from the workflow-level
      // `on-failure` wrapping and its throw reaches no handler. The in-loop
      // budget check is what actually writes a terminal status.
      expect(maxIterations.limit).toBe(workflow.consts?.max_attempts);
      expect(maxIterations['on-limit']).toBe('fail');
      expect(findStep(workflow.steps, 'settle_exhausted')).toBeDefined();
      expect(findStep(workflow.steps, 'break_exhausted')?.type).toBe('loop.break');
    });

    it('derives each attempt from the fixed deadline, so a retry cannot extend it', () => {
      const init = findStep(workflow.steps, 'init_state');
      const remaining = findStep(workflow.steps, 'compute_remaining');

      expect(String(init?.with?.expires_epoch)).toContain('steps.create_proposal.output.expiresAt');
      expect(String(remaining?.with?.remaining_seconds)).toContain('variables.expires_epoch');
    });

    it('computes the epoch and the difference in separate steps', () => {
      // Liquid cannot read a variable written by the same `data.set`.
      expect(findStep(workflow.steps, 'compute_now')?.with?.now_epoch).toBeDefined();
      expect(findStep(workflow.steps, 'compute_remaining')?.with?.remaining_seconds).toBeDefined();
    });

    it('settles an expired proposal rather than parking on a non-positive duration', () => {
      const settle = findStep(workflow.steps, 'settle_expired');

      expect(settle?.condition).toContain('variables.remaining_seconds <= 0');
      expect(findStep(workflow.steps, 'record_expiry')?.with?.status).toBe('expired');
      expect(findStep(workflow.steps, 'break_expired')?.type).toBe('loop.break');
    });

    it('only treats a deadline as passed when the proposal has one', () => {
      expect(findStep(workflow.steps, 'settle_expired')?.condition).toContain(
        'variables.has_deadline'
      );
    });

    it('avoids mixing and/or in a condition, which Liquid binds unpredictably', () => {
      const conditions = collectNames(workflow.steps)
        .map((name) => findStep(workflow.steps, name)?.condition)
        .filter((condition): condition is string => typeof condition === 'string');

      for (const condition of conditions) {
        expect(condition.includes(' and ') && condition.includes(' or ')).toBe(false);
      }
    });

    it('copies the gate output into variables inside the iteration that produced it', () => {
      // A step output resolves to its latest execution, so a later iteration
      // that skipped the gate would otherwise read this pass's values.
      const resolve = findStep(workflow.steps, 'resolve_gate');

      expect(resolve?.type).toBe('data.set');
      expect(collectNames(findStep(workflow.steps, 'gate_branch')?.steps ?? [])).toContain(
        'resolve_gate'
      );
    });

    it('reads only variables after the loop, since loop step outputs are evicted', () => {
      const output = workflow.steps.find(({ name }) => name === 'output_result');

      for (const value of Object.values(output?.with ?? {})) {
        expect(String(value)).not.toContain('steps.');
      }
    });
  });

  describe('the decision/status pairs it writes', () => {
    it('pairs every decision it writes with a status the service accepts', () => {
      // The service enforces this at runtime, where a violation is a failed
      // execution rather than a type error, so it is worth catching statically.
      // A decision written on its own leaves the record at `pending`, which is
      // illegal under either decision — the bug this guards against.
      const decisionWrites = updateProposalSteps().filter(
        (step) => step.with?.decision !== undefined
      );

      expect(decisionWrites.length).toBeGreaterThan(0);
      for (const step of decisionWrites) {
        const decision = step.with!.decision as string;
        const status = step.with!.status as string | undefined;

        expect(VALID_STATUSES[decision]).toBeDefined();
        expect(status).toBeDefined();
        expect(VALID_STATUSES[decision]).toContain(status);
      }
    });

    it('writes a recognised status everywhere else', () => {
      // A status-only write inherits whatever decision the record already
      // carries, which the YAML cannot know — so this only catches a status
      // outside the vocabulary altogether.
      const known = new Set(Object.values(VALID_STATUSES).flat());
      const statusWrites = updateProposalSteps().filter(
        (step) => step.with?.decision === undefined && step.with?.status !== undefined
      );

      for (const step of statusWrites) {
        expect(known).toContain(step.with!.status as string);
      }
    });
  });

  describe('privilege check', () => {
    it('checks the resumer after the gate and before any write', () => {
      const body = (loop().steps ?? []).map(({ name }) => name);
      const checkIndex = body.indexOf('authorize_decision');

      expect(checkIndex).toBeGreaterThan(body.indexOf('gate_branch'));
      // If a write came first and threw instead, the gate would already be
      // spent and the proposal would strand with no way to retry.
      for (const branch of ['handle_dismissal', 'approve_without_action', 'approve_with_action']) {
        expect(body.indexOf(branch)).toBeGreaterThan(checkIndex);
      }
    });

    it('only checks when a human answered, since the auto path has no decider', () => {
      // On the autonomy path the principal is the Worker, which necessarily
      // holds the privilege — it created the proposal — so the check could
      // only ever pass, at the cost of a round trip per iteration.
      expect(findStep(workflow.steps, 'authorize_decision')?.condition).toContain(
        'variables.needs_gate == true'
      );
    });

    it('re-parks on a denial and writes nothing', () => {
      const reject = findStep(workflow.steps, 'reject_unprivileged');

      expect(reject?.condition).toContain('steps.check_privileges.output.canDecide');
      expect(reject?.steps?.map(({ type }) => type)).toEqual(['loop.continue']);
    });

    it('passes the gate responder, or an external resume decides as the Worker', () => {
      // An external resume carries no request, so the execution wakes under the
      // workflow runner's key — which always holds the privilege, having
      // created the proposal. `respondedBy` is the only thing that tells that
      // apart from a human.
      expect(String(findStep(workflow.steps, 'check_privileges')?.with?.respondedBy)).toContain(
        'variables.decided_by'
      );
    });
  });

  describe('the deadline after the gate returns', () => {
    it('re-reads the clock before deciding, not only before parking', () => {
      // The pre-gate check was evaluated before a park that may have lasted
      // days, and only the HTTP routes refuse an expired decision — so a
      // resume through the platform API or the Inbox would otherwise be
      // recorded and run its action past the deadline.
      const body = (loop().steps ?? []).map(({ name }) => name);

      expect(body.indexOf('recompute_remaining')).toBeGreaterThan(body.indexOf('gate_branch'));
      expect(body.indexOf('recompute_remaining')).toBeLessThan(body.indexOf('authorize_decision'));
    });

    it('settles a late decision as expired and breaks', () => {
      const settle = findStep(workflow.steps, 'settle_expired_after_gate');

      expect(settle?.condition).toContain('variables.remaining_seconds <= 0');
      expect(findStep(workflow.steps, 'record_late_expiry')?.with?.status).toBe('expired');
      expect(findStep(workflow.steps, 'break_late_expiry')?.type).toBe('loop.break');
    });

    it('recomputes in separate steps, since Liquid cannot chain within one', () => {
      expect(findStep(workflow.steps, 'recompute_now')?.with?.now_epoch).toBeDefined();
      expect(
        findStep(workflow.steps, 'recompute_remaining')?.with?.remaining_seconds
      ).toBeDefined();
    });
  });

  describe('gate failures', () => {
    it('keeps a gate failure inside the loop, so the loop settles it', () => {
      // Without this the workflow-level handler settles the record too, but
      // ends the run as `failed` and skips the output step — and a timeout is
      // the expected end of an unanswered proposal, not a malfunction.
      expect(gate()['on-failure']?.continue).toBe(true);
    });

    it('settles a timed-out gate as expired before reading its answer', () => {
      const handle = findStep(workflow.steps, 'handle_gate_timeout');
      const record = findStep(workflow.steps, 'record_gate_expiry');

      // A timed-out gate answers blank, which `resolve_gate` would record as a
      // dismissal, so the branch has to come first.
      const gateBranchOrder = (findStep(workflow.steps, 'gate_branch')?.steps ?? []).map(
        ({ name }) => name
      );
      expect(gateBranchOrder).toEqual([
        'await_decision',
        // The adoption sits between the wait and everything that reads or
        // writes on the carried id: a revision that landed during the park
        // makes that id a superseded row, which the timeout write and the
        // release route both refuse.
        'adopt_live_head_after_wait_branch',
        'handle_gate_timeout',
        'resolve_gate',
      ]);

      expect(handle?.condition).toContain('steps.await_decision.error != blank');
      expect(record?.with?.status).toBe('expired');
      expect(findStep(workflow.steps, 'break_gate_expiry')?.type).toBe('loop.break');
    });
  });

  describe('dismissal', () => {
    it('branches to dismissed unless the platform boolean is exactly true', () => {
      const dismissal = findStep(workflow.steps, 'handle_dismissal');

      expect(dismissal?.condition).toContain('variables.gate_approved');
      expect(dismissal?.condition).toContain('!= true');
    });

    it('records dismissed with no_action, since a human answered and nothing runs', () => {
      const record = findStep(workflow.steps, 'record_dismissal');

      expect(record?.with?.decision).toBe('dismissed');
      expect(record?.with?.status).toBe('no_action');
      expect(findStep(workflow.steps, 'break_dismissed')?.type).toBe('loop.break');
    });

    it('adopts the live head after the gate, since a revision moves the chain under it', () => {
      // The gate belongs to the chain, not to one revision: a revision appended
      // while it was parked marks the row this execution created `superseded`,
      // which is terminal, so a decision written on the carried id would be
      // refused. This is the adoption the dismissal branch used to defer.
      const resolve = findStep(workflow.steps, 'resolve_live_head_after_wait');
      const adopt = findStep(workflow.steps, 'adopt_live_head_after_wait');

      expect(resolve?.type).toBe('proposals.getLatestRevision');
      expect(String(resolve?.with?.proposalId)).toContain('variables.current_proposal_id');
      expect(String(adopt?.with?.current_proposal_id)).toContain(
        'steps.resolve_live_head_after_wait.output.proposalId'
      );
      // The input travels with the id: resolving the head but keeping the
      // trigger's input would approve one revision and execute another's.
      expect(String(adopt?.with?.action_input)).toContain(
        'steps.resolve_live_head_after_wait.output.actionInput'
      );
    });

    it('adopts inside the gate branch, before the timeout write and the release call', () => {
      // A timed-out gate writes `expired` on the carried id, and `resolve_gate`
      // hands that id to the release route, which refuses a row that is already
      // `superseded`. Adopting after the branch would therefore settle the
      // superseded predecessor — or fail the resume outright.
      const gateSteps = (findStep(workflow.steps, 'gate_branch')?.steps ?? []).map(
        ({ name }) => name
      );
      const adoptIndex = gateSteps.indexOf('adopt_live_head_after_wait_branch');

      expect(adoptIndex).toBeGreaterThan(gateSteps.indexOf('await_decision'));
      expect(adoptIndex).toBeLessThan(gateSteps.indexOf('handle_gate_timeout'));
      expect(adoptIndex).toBeLessThan(gateSteps.indexOf('resolve_gate'));

      const expiry = findStep(workflow.steps, 'record_gate_expiry');
      expect(String(expiry?.with?.proposalId)).toBe('{{ variables.current_proposal_id }}');
    });

    it('adopts in the auto branch too, for a loop parked by an earlier iteration', () => {
      const autoSteps = (findStep(workflow.steps, 'auto_branch')?.steps ?? []).map(
        ({ name }) => name
      );
      const adoptIndex = autoSteps.indexOf('adopt_live_head_before_auto_branch');

      expect(adoptIndex).toBeGreaterThanOrEqual(0);
      expect(adoptIndex).toBeLessThan(autoSteps.indexOf('resolve_auto'));
    });

    it('adopts the live head before the first write of an iteration, not only after the gate', () => {
      // `settle_expired` and `settle_exhausted` are the iteration's earliest
      // writes. A revision appended between iterations moves the chain head, so
      // resolving only inside `gate_branch` leaves those two settling a row the
      // service now refuses -- the run fails and the live revision stays pending.
      const body = (loop().steps ?? []).map(({ name }) => name);
      const adoptIndex = body.indexOf('adopt_live_head_each_iteration_branch');
      expect(adoptIndex).toBeGreaterThanOrEqual(0);
      for (const write of ['settle_expired', 'settle_exhausted']) {
        expect(body.indexOf(write)).toBeGreaterThan(adoptIndex);
      }
    });
    it('resolves the chain head from the carried id when adopting each iteration', () => {
      const resolve = findStep(workflow.steps, 'resolve_live_head_each_iteration');
      const adopt = findStep(workflow.steps, 'adopt_live_head_each_iteration');
      expect(resolve?.type).toBe('proposals.getLatestRevision');
      expect(String(resolve?.with?.proposalId)).toContain('variables.current_proposal_id');
      expect(String(adopt?.with?.current_proposal_id)).toContain(
        'steps.resolve_live_head_each_iteration.output.proposalId'
      );
    });
    it('adopts before every write after the gate, so each lands on the current revision', () => {
      // Ordering is the whole point: adopting after a write would leave that
      // write on a row the service now refuses to settle.
      const body = (loop().steps ?? []).map(({ name }) => name);
      const adoptIndex = body.indexOf('gate_branch');

      expect(adoptIndex).toBeGreaterThanOrEqual(0);
      for (const write of [
        'settle_expired_after_gate',
        'handle_dismissal',
        'approve_without_action',
        'approve_with_action',
      ]) {
        expect(body.indexOf(write)).toBeGreaterThan(adoptIndex);
      }
    });

    it('settles onto the live head when a revision wins the race to record_expiry', () => {
      // TOCTOU: the top-of-loop adoption resolves the head, but a revision can
      // still supersede it before `record_expiry` writes. The write then throws
      // ConflictError; the retry re-runs the block's children, so a re-resolve
      // placed first lands the write on the new head instead of failing the run
      // and stranding the live revision pending.
      const block = findStep(workflow.steps, 'settle_expired');
      const retry = block?.['on-failure']?.retry;
      expect(retry?.['max-attempts']).toBeGreaterThanOrEqual(2);
      expect(String(retry?.condition)).toContain('ConflictError');
      const names = (block?.steps ?? []).map(({ name }) => name);
      expect(names.indexOf('resolve_live_head_on_expiry_conflict')).toBeGreaterThanOrEqual(0);
      expect(names.indexOf('resolve_live_head_on_expiry_conflict')).toBeLessThan(
        names.indexOf('record_expiry')
      );
      const adopt = findStep(workflow.steps, 'adopt_live_head_on_expiry_conflict');
      expect(String(adopt?.with?.current_proposal_id)).toContain(
        'steps.resolve_live_head_on_expiry_conflict.output.proposalId'
      );
      const write = findStep(workflow.steps, 'record_expiry');
      expect(String(write?.with?.proposalId)).toContain('variables.current_proposal_id');
    });

    it('settles onto the live head when a revision wins the race to record_exhaustion', () => {
      const block = findStep(workflow.steps, 'settle_exhausted');
      const retry = block?.['on-failure']?.retry;
      expect(retry?.['max-attempts']).toBeGreaterThanOrEqual(2);
      expect(String(retry?.condition)).toContain('ConflictError');
      const names = (block?.steps ?? []).map(({ name }) => name);
      expect(names.indexOf('resolve_live_head_on_exhaustion_conflict')).toBeGreaterThanOrEqual(0);
      expect(names.indexOf('resolve_live_head_on_exhaustion_conflict')).toBeLessThan(
        names.indexOf('record_exhaustion')
      );
      const adopt = findStep(workflow.steps, 'adopt_live_head_on_exhaustion_conflict');
      expect(String(adopt?.with?.current_proposal_id)).toContain(
        'steps.resolve_live_head_on_exhaustion_conflict.output.proposalId'
      );
    });

    it('does not retry a non-conflict settle failure', () => {
      // Only a ConflictError means "the head moved under us"; a transport or
      // service fault wants the workflow-level fallback, not a blind rewrite.
      for (const name of ['settle_expired', 'settle_exhausted']) {
        const retry = findStep(workflow.steps, name)?.['on-failure']?.retry;
        expect(String(retry?.condition)).toContain('ConflictError');
        expect(String(retry?.condition)).not.toContain('ApiError');
      }
    });
  });

  describe('approval', () => {
    it.each([
      ['record_approval_no_action', 'no_action'],
      ['record_approval_executing', 'executing'],
    ])('writes the decision and status together in %s', (step, status) => {
      // `approved` + `pending` is not a legal pair, so writing the decision on
      // its own would leave the record claiming an approval with no outcome.
      const write = findStep(workflow.steps, step);

      expect(write?.with?.decision).toBe('approved');
      expect(write?.with?.status).toBe(status);
    });

    it('settles a non-action approval at no_action rather than leaving it awaiting', () => {
      const noAction = findStep(workflow.steps, 'approve_without_action');

      expect(noAction?.condition).toContain('variables.action_workflow_id == blank');
      expect(findStep(workflow.steps, 'break_no_action')?.type).toBe('loop.break');
    });

    it('executes the action only when the proposal carries one', () => {
      expect(findStep(workflow.steps, 'approve_with_action')?.condition).toContain(
        'variables.action_workflow_id != blank'
      );
    });

    it('passes the action input through under a single actionInput key', () => {
      const execute = findStep(workflow.steps, 'execute_action');
      const settings = execute?.with as {
        'workflow-id'?: string;
        inputs?: Record<string, unknown>;
      };

      // `workflow-id` is the only key the engine reads; `workflowId` is ignored.
      expect(settings['workflow-id']).toContain('variables.action_workflow_id');
      expect(Object.keys(settings.inputs ?? {})).toEqual(['actionInput']);
    });

    it('executes the live revision input, not the trigger input a revision may have corrected', () => {
      // The trigger value is captured before the gate is parked, so a revision
      // that corrected the parameters would otherwise be approved and then
      // ignored: the analyst approves one input and the action runs another.
      const execute = findStep(workflow.steps, 'execute_action');
      const settings = execute?.with as { inputs?: Record<string, unknown> };

      expect(String(settings.inputs?.actionInput)).toContain('variables.action_input');
      expect(String(settings.inputs?.actionInput)).not.toContain('inputs.actionInput');
    });

    it('records the execution outcome after the action', () => {
      expect(findStep(workflow.steps, 'record_success')?.with?.status).toBe('succeeded');
      expect(findStep(workflow.steps, 'break_succeeded')?.type).toBe('loop.break');
    });

    it('keeps an action failure inside the loop so it can be re-offered', () => {
      // Without the step-level continue the workflow-level handler would settle
      // the proposal and stop, making the clone branch unreachable.
      expect(findStep(workflow.steps, 'execute_action')?.['on-failure']?.continue).toBe(true);
      expect(findStep(workflow.steps, 'record_action_failure')?.with?.status).toBe('failed');
      expect(findStep(workflow.steps, 'clone_proposal')?.type).toBe('proposals.cloneProposal');
    });

    it('advances the carried id inside the branch that produced the clone', () => {
      const adopt = findStep(workflow.steps, 'adopt_clone');

      expect(String(adopt?.with?.current_proposal_id)).toContain(
        'steps.clone_proposal.output.proposalId'
      );
      expect(adopt?.with?.needs_gate).toBe(true);
      expect(findStep(workflow.steps, 'park_on_clone')?.type).toBe('loop.continue');
    });
  });

  describe('autonomy', () => {
    it('skips the gate when the caller already resolved autonomy for an action', () => {
      expect(String(findStep(workflow.steps, 'init_state')?.with?.needs_gate)).toContain(
        'autoApprove'
      );
    });

    it('always gates a non-action proposal, since there is no autonomy to resolve', () => {
      // Without this the flag would skip the gate and approval — the whole
      // lifecycle of a non-action proposal — would never be recorded.
      expect(String(findStep(workflow.steps, 'init_state')?.with?.needs_gate)).toContain(
        'inputs.actionWorkflowId'
      );
    });
  });

  describe('workflow-level failure handling', () => {
    it('records a failure from the workflow-level on-failure, since HITL steps take none', () => {
      const fallback = workflow.settings?.['on-failure']?.fallback ?? [];

      expect(fallback.map(({ type }) => type)).toContain('proposals.updateProposal');
    });

    it('settles from the carried id, not the create step output that a clone invalidates', () => {
      const fallback = workflow.settings?.['on-failure']?.fallback ?? [];

      for (const step of fallback) {
        expect(String(step.with?.proposalId)).toContain('variables.current_proposal_id');
      }
    });

    it('skips every handler when creation itself failed and there is no proposal id', () => {
      const fallback = workflow.settings?.['on-failure']?.fallback ?? [];

      for (const step of fallback) {
        expect(step.if).toContain('variables.current_proposal_id != blank');
      }
    });

    it('discriminates on the proposal decision rather than on the error type', () => {
      // All three timeout sources share `type: TimeoutError`, and
      // `ExecutionError` carries nothing else to tell them apart.
      const fallback = workflow.settings?.['on-failure']?.fallback ?? [];
      const afterDecision = fallback.find(({ name }) => name === 'record_failure_after_decision');
      const beforeDecision = fallback.find(({ name }) => name === 'record_expiry_before_decision');

      expect(afterDecision?.if).toContain(
        'steps.read_proposal_on_failure.output.decision != blank'
      );
      expect(afterDecision?.with?.status).toBe('failed');
      // `expired` is the only terminal status an undecided proposal has.
      expect(beforeDecision?.if).toContain(
        'steps.read_proposal_on_failure.output.decision == blank'
      );
      expect(beforeDecision?.with?.status).toBe('expired');
    });
  });
});
