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
import CREATE_PROPOSAL_YAML from './create_proposal.yaml';
import { isValidDuration, parseDuration } from '../../../common/utils';
import {
  DataSetStepSchema,
  IfStepSchema,
  LoopBreakStepSchema,
  LoopContinueStepSchema,
  WaitForApprovalStepSchema,
  WhileStepSchema,
  WorkflowExecuteStepSchema,
  WorkflowOutputStepSchema,
} from '../../../spec/schema';

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
  /** An `if` step's false branch. Every traversal below has to include it. */
  else?: WorkflowStep[];
}

/** Both branches of a step, so nothing in an `else` escapes these assertions. */
const childrenOf = (step: WorkflowStep): WorkflowStep[] => [
  ...(step.steps ?? []),
  ...(step.else ?? []),
];

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

const workflow = parse(CREATE_PROPOSAL_YAML) as ParsedWorkflow;

/** The deadline a caller gets when it does not ask for one. */
const DEFAULT_EXPIRES_IN = '72h';

const findStep = (steps: WorkflowStep[], name: string): WorkflowStep | undefined => {
  for (const step of steps) {
    if (step.name === name) {
      return step;
    }
    const match = findStep(childrenOf(step), name);
    if (match) {
      return match;
    }
  }
  return undefined;
};

/** Every descendant of a step, so containment can be asserted. */
const collectNames = (steps: WorkflowStep[]): string[] =>
  steps.flatMap((step) => [step.name ?? '', ...collectNames(childrenOf(step))]);

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
    steps.flatMap((step) => [step, ...flatten(childrenOf(step))]);

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
      ...collect(childrenOf(step)),
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
      expect(findStep(workflow.steps, 'settle_expired')).toBeUndefined();
    });

    it('always creates with a deadline, which the gate timeout depends on', () => {
      // `remaining_seconds` only counts down from an `expiresAt`. The caller
      // may supply one, but the default has to be a duration the service can
      // resolve, or the gate has nothing to park against.
      const create = findStep(workflow.steps, 'create_proposal');
      const expiresIn = String(create?.with?.expiresIn);

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

      // Both are load-bearing and covered end to end by the plugin's
      // integration tests: the gate's handler keeps an unanswered proposal
      // inside the loop to be settled as `expired`, and the action's keeps a
      // failed action inside the loop so it can be cloned and re-offered.
      // Pinned, not removed.
      expect(unmodelled.sort()).toEqual([
        'await_decision (waitForApproval): on-failure',
        'execute_action (workflow.execute): on-failure',
      ]);
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
      expect(findStep(workflow.steps, 'settle_exhausted')).toBeUndefined();
      expect(workflow.consts?.max_attempts).toBeUndefined();
    });

    it('settles the record when the loop exits without having settled it', () => {
      // `on-limit: continue` leaves the loop with nothing written, and the run
      // would otherwise report `pending` against an execution that is over —
      // a proposal nothing can ever decide, which is the outcome the rest of
      // this definition exists to prevent. The budget gets the same treatment
      // as every other way out of the loop.
      const top = workflow.steps.map(({ name }) => name);
      const settle = findStep(workflow.steps, 'settle_unfinished');
      const record = findStep(workflow.steps, 'record_unfinished');

      expect(settle?.condition).toContain('variables.completed != true');
      expect(record?.type).toBe('proposals.settleIncompleteProposal');
      expect(record?.with?.status).toBe('expired');
      expect(top.indexOf('settle_unfinished')).toBeGreaterThan(top.indexOf('decision_loop'));
      expect(top.indexOf('settle_unfinished')).toBeLessThan(top.indexOf('output_result'));
    });

    it('derives each attempt from the fixed deadline, so a retry cannot extend it', () => {
      const init = findStep(workflow.steps, 'init_state');
      const remaining = findStep(workflow.steps, 'compute_remaining');

      expect(String(init?.with?.expires_epoch)).toContain('steps.create_proposal.output.expiresAt');
      expect(String(remaining?.with?.remaining_seconds)).toContain('variables.expires_epoch');
    });

    it('reads the clock and subtracts it in one step, only where the gate needs it', () => {
      // Liquid cannot read a variable written by the same `data.set`, which
      // would otherwise mean storing `now_epoch` and subtracting it in a
      // second step. Negating `now` and adding it needs no intermediate.
      //
      // Only the gate reads the clock, so the step lives inside `gate_branch`:
      // the autonomy path never waits, and nothing after the gate re-reads it.
      const gateSteps = (findStep(workflow.steps, 'gate_branch')?.steps ?? []).map(
        ({ name }) => name
      );

      expect(gateSteps).toContain('compute_remaining');
      expect(
        String(findStep(workflow.steps, 'compute_remaining')?.with?.remaining_seconds)
      ).toContain('times: -1 | plus: variables.expires_epoch');
      expect(findStep(workflow.steps, 'recompute_remaining')).toBeUndefined();
    });

    it('carries "no deadline" as a date the loop never reaches, not as a second flag', () => {
      // A proposal with no `expiresAt` would otherwise need a `has_deadline`
      // guard wherever the deadline is read. Defaulting the epoch to a
      // far-future date says the same thing arithmetically, and the gate just
      // parks for a very long time.
      expect(String(findStep(workflow.steps, 'init_state')?.with?.expires_epoch)).toContain(
        'default:'
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
      for (const branch of [
        'handle_gate_timeout',
        'handle_dismissal',
        'approve_without_action',
        'approve_with_action',
      ]) {
        expect(body.indexOf(branch)).toBeGreaterThan(checkIndex);
      }
      // The chain read waits for the check too: an unauthorized resumer is
      // re-parked before anything reads on its behalf.
      expect(body.indexOf('get_last_revision')).toBeGreaterThan(checkIndex);
    });

    it('only checks when someone answered, since neither autonomy nor a timeout has a decider', () => {
      // `gate_answered` rather than `needs_gate`: on the autonomy path the
      // principal is the Worker, which necessarily holds the privilege — it
      // created the proposal — and a timed-out gate has no resumer at all, so
      // in both cases the check could only ever pass as the workflow runner,
      // at the cost of a round trip per iteration.
      expect(findStep(workflow.steps, 'authorize_decision')?.condition).toContain(
        'variables.gate_answered == true'
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

  describe('gate failures', () => {
    it('settles an expiry in one place, since the gate timeout is the deadline', () => {
      // The loop used to check the clock again after the gate, to catch a
      // decision resumed past the deadline. The engine's own timeout task
      // fires at the deadline, so that only covered the seconds before the
      // task was claimed — and the release route refuses an expired decision
      // anyway. One branch, keyed on the timeout, is the whole expiry story.
      const body = (loop().steps ?? []).map(({ name }) => name);
      const expiryBranches = body.filter((name) => name?.startsWith('settle_expired'));

      expect(expiryBranches).toEqual([]);
      expect(body).toContain('handle_gate_timeout');
    });

    it('keeps a gate failure inside the loop, so the loop settles it', () => {
      // Without this the workflow-level handler settles the record too, but
      // ends the run as `failed` and skips the output step — and a timeout is
      // the expected end of an unanswered proposal, not a malfunction.
      expect(gate()['on-failure']?.continue).toBe(true);
    });

    it('carries the timeout out of the gate branch as a variable, since the output is evicted', () => {
      // `handle_gate_timeout` runs past the single adopt, where
      // `steps.await_decision` is no longer readable, so `resolve_gate` has to
      // hand the failure on the same way it hands on the answer.
      const gateBranchOrder = (findStep(workflow.steps, 'gate_branch')?.steps ?? []).map(
        ({ name }) => name
      );
      expect(gateBranchOrder).toEqual(['compute_remaining', 'await_decision', 'resolve_gate']);

      const resolve = findStep(workflow.steps, 'resolve_gate');
      expect(String(resolve?.with?.gate_timed_out)).toContain('steps.await_decision.error');
      expect(String(resolve?.with?.gate_error)).toContain('steps.await_decision.error.message');

      // Variables outlive an iteration, so the autonomy branch has to set
      // every one of them or a later pass reads the gated pass's answer.
      const auto = findStep(workflow.steps, 'resolve_auto');
      expect(Object.keys(auto?.with ?? {}).sort()).toEqual(Object.keys(resolve?.with ?? {}).sort());
    });

    it("puts the autonomy path in the gate step's else, so the two cannot both run", () => {
      // They were two `if` steps with complementary conditions, which left the
      // mutual exclusivity to the reader and to whoever edits either condition.
      const gateStep = findStep(workflow.steps, 'gate_branch');

      expect(gateStep?.condition).toContain('variables.needs_gate == true');
      expect((gateStep?.else ?? []).map(({ name }) => name)).toEqual(['resolve_auto']);
      expect(findStep(workflow.steps, 'auto_branch')).toBeUndefined();
    });

    it('settles a timed-out gate as expired, on the deadline it was parked against', () => {
      const handle = findStep(workflow.steps, 'handle_gate_timeout');
      const record = findStep(workflow.steps, 'record_gate_expiry');

      expect(handle?.condition).toContain('variables.gate_timed_out == true');
      expect(record?.type).toBe('proposals.settleIncompleteProposal');
      expect(record?.with?.status).toBe('expired');
      expect(String(record?.with?.executionError)).toContain('variables.gate_error');
      expect(findStep(workflow.steps, 'break_gate_expiry')?.type).toBe('loop.break');
    });

    it('settles a timeout before the dismissal branch, which would invent a decision', () => {
      // A timed-out gate answers blank, so `gate_approved` is false and
      // `handle_dismissal` would record a dismissal nobody made.
      const body = (loop().steps ?? []).map(({ name }) => name);

      expect(body.indexOf('handle_gate_timeout')).toBeLessThan(body.indexOf('handle_dismissal'));
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
      // refused.
      const get = findStep(workflow.steps, 'get_last_revision');
      const adopt = findStep(workflow.steps, 'adopt_last_revision');

      expect(get?.type).toBe('proposals.getLatestRevision');
      expect(String(get?.with?.proposalId)).toContain('variables.current_proposal_id');
      expect(String(adopt?.with?.current_proposal_id)).toContain(
        'steps.get_last_revision.output.proposalId'
      );
      // The input travels with the id: resolving the head but keeping the
      // trigger's input would approve one revision and execute another's.
      expect(String(adopt?.with?.action_input)).toContain(
        'steps.get_last_revision.output.actionInput'
      );
    });

    it('routes every write in the loop through that one adopt', () => {
      // It sits after both decision paths — `gate_branch` carries the autonomy
      // one in its `else` — and before every branch that writes. That is the
      // only reason those branches can be read as a plain sequence.
      const body = (loop().steps ?? []).map(({ name }) => name);
      const adopt = body.indexOf('adopt_last_revision');

      expect(adopt).toBeGreaterThan(body.indexOf('gate_branch'));
      for (const write of [
        'handle_gate_timeout',
        'handle_dismissal',
        'approve_without_action',
        'approve_with_action',
      ]) {
        expect(body.indexOf(write)).toBeGreaterThan(adopt);
      }
    });

    it('reads the chain once in the YAML; the incomplete-settle step adopts internally', () => {
      // The loop still needs an explicit adopt before every write. The
      // workflow-level fallback and the incomplete-settle call sites adopt
      // inside `settleIncompleteProposal` instead — workflow-level fallback
      // step names are engine-prefixed, so a YAML get-then-update chain cannot
      // reference its own outputs.
      const reads = allSteps()
        .filter(({ type }) => type === 'proposals.getLatestRevision')
        .map(({ name }) => name);

      expect(reads).toEqual(['get_last_revision']);
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

    it('always gates an action that declares always-gate, whatever the caller resolved', () => {
      // The action's own policy has to outrank the flag, or a Worker could
      // auto-approve an action whose author declared it must never be.
      expect(String(findStep(workflow.steps, 'init_state')?.with?.needs_gate)).toContain(
        'steps.create_proposal.output.alwaysGate'
      );
    });

    it('combines the gating reasons with or alone, since Liquid cannot bind a mixed expression', () => {
      // No parentheses and no operator precedence: one `and` among the `or`s
      // would silently gate the wrong proposals.
      const needsGate = String(findStep(workflow.steps, 'init_state')?.with?.needs_gate);

      expect(needsGate).not.toContain(' and ');
    });
  });

  describe('workflow-level failure handling', () => {
    it('settles from a single incomplete-settle step, not a get-then-update chain', () => {
      // Workflow-level fallback steps are renamed
      // `workflow-level-on-failure_<failed>_<name>`, so Liquid `steps.<name>`
      // references resolve to nothing. One step that adopts and settles keeps
      // the handler working.
      const fallback = workflow.settings?.['on-failure']?.fallback ?? [];

      expect(fallback.map(({ name, type }) => ({ name, type }))).toEqual([
        { name: 'settle_on_failure', type: 'proposals.settleIncompleteProposal' },
      ]);
    });

    it('settles from the carried id, not the create step output that a clone invalidates', () => {
      const settle = findStep(
        workflow.settings?.['on-failure']?.fallback ?? [],
        'settle_on_failure'
      );

      expect(String(settle?.with?.proposalId)).toContain('variables.current_proposal_id');
    });

    it('omits status so the step discriminates decided→failed / undecided→expired', () => {
      // All three timeout sources share `type: TimeoutError`, and
      // `ExecutionError` carries nothing else to tell them apart — so the
      // record's own decision is what chooses the terminal status.
      const settle = findStep(
        workflow.settings?.['on-failure']?.fallback ?? [],
        'settle_on_failure'
      );

      expect(settle?.with?.status).toBeUndefined();
      expect(String(settle?.with?.executionError)).toContain('error.message');
    });

    it('guards the id only here, where creation itself may have failed', () => {
      // Inside the loop `current_proposal_id` is always set — `init_state`
      // runs right after `create_proposal`, and a failed creation skips it.
      // This handler is the one place that runs with no id to settle.
      const guarded = (workflow.settings?.['on-failure']?.fallback ?? []).every((step) =>
        String(step.if).includes('current_proposal_id != blank')
      );
      const inLoop = collectNames(loop().steps ?? [])
        .map((name) => findStep(workflow.steps, name))
        .filter((step) => String(step?.condition).includes('current_proposal_id != blank'));

      expect(guarded).toBe(true);
      expect(inLoop).toEqual([]);
    });

    it('skips every handler when creation itself failed and there is no proposal id', () => {
      const fallback = workflow.settings?.['on-failure']?.fallback ?? [];

      for (const step of fallback) {
        expect(step.if).toContain('variables.current_proposal_id != blank');
      }
    });
  });
});
