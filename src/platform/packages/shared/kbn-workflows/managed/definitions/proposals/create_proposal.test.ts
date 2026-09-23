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
      // re-parked just before its deadline waited out a second full window.
      // It was also a second deadline that could drift from the one on the
      // record; the gate now has none, so `expiresIn` is the only one left.
      // Rendered once at wait-entry — elastic/kibana#291744.
      expect(gate().timeout).toBe('{{ variables.remaining_seconds }}s');
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

      // All three are load-bearing and covered end to end by the plugin's
      // integration tests: the gate's handler keeps an unanswered proposal
      // inside the loop to be settled as `expired`, the action's keeps a
      // failed action inside the loop so it can be cloned and re-offered, and
      // `settle_expired`'s `on-failure.retry` re-resolves the live head when a
      // revision wins the TOCTOU race against `record_expiry`. Pinned, not
      // removed.
      //
      // `settle_exhausted` used to be a fourth. Its write is best-effort now,
      // so it carries `on-failure: continue` on `record_exhaustion` instead —
      // a `proposals.*` step, whose connector-derived schema does model the
      // key, which is why it does not appear here.
      expect(unmodelled.sort()).toEqual([
        'await_decision (waitForApproval): on-failure',
        'execute_action (workflow.execute): on-failure',
        'settle_expired (if): on-failure',
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

    it('derives each attempt from the fixed deadline, so a retry cannot extend it', () => {
      const init = findStep(workflow.steps, 'init_state');
      const remaining = findStep(workflow.steps, 'compute_remaining');

      expect(String(init?.with?.expires_epoch)).toContain('steps.create_proposal.output.expiresAt');
      expect(String(remaining?.with?.remaining_seconds)).toContain('variables.expires_epoch');
    });

    it('reads the clock and subtracts it in one step, on both sides of the gate', () => {
      // Liquid cannot read a variable written by the same `data.set`, which
      // used to mean storing `now_epoch` and subtracting it in a second step —
      // twice over, once each side of the gate. Negating `now` and adding it
      // needs no intermediate variable.
      for (const name of ['compute_remaining', 'recompute_remaining']) {
        expect(String(findStep(workflow.steps, name)?.with?.remaining_seconds)).toContain(
          'times: -1 | plus: variables.expires_epoch'
        );
      }
      expect(findStep(workflow.steps, 'compute_now')).toBeUndefined();
      expect(findStep(workflow.steps, 'recompute_now')).toBeUndefined();
    });

    it('settles an expired proposal rather than parking on a non-positive duration', () => {
      const settle = findStep(workflow.steps, 'settle_expired');

      expect(settle?.condition).toContain('variables.remaining_seconds <= 0');
      expect(findStep(workflow.steps, 'record_expiry')?.with?.status).toBe('expired');
      expect(findStep(workflow.steps, 'break_expired')?.type).toBe('loop.break');
    });

    it('carries "no deadline" as a date the loop never reaches, not as a second flag', () => {
      // A proposal with no `expiresAt` used to need a `has_deadline` guard
      // paired with every deadline check. Defaulting the epoch to a far-future
      // date says the same thing arithmetically and keeps both checks a single
      // comparison.
      const init = findStep(workflow.steps, 'init_state');

      expect(String(init?.with?.expires_epoch)).toContain('default:');
      for (const name of ['settle_expired', 'settle_expired_after_gate']) {
        expect(findStep(workflow.steps, name)?.condition).toBe(
          '${{ variables.remaining_seconds <= 0 }}'
        );
      }
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
        'settle_expired_after_gate',
        'handle_dismissal',
        'approve_without_action',
        'approve_with_action',
      ]) {
        expect(body.indexOf(branch)).toBeGreaterThan(checkIndex);
      }
      // The chain resolve reads the proposal, so it waits for the check too:
      // an unauthorized resumer is re-parked before anything reads on its
      // behalf.
      expect(body.indexOf('adopt_live_head_before_writes_branch')).toBeGreaterThan(checkIndex);
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

  describe('the deadline after the gate returns', () => {
    it('re-reads the clock before deciding, not only before parking', () => {
      // The pre-gate check was evaluated before a park that may have lasted
      // days, and only the HTTP routes refuse an expired decision — so a
      // resume through the platform API or the Inbox would otherwise be
      // recorded and run its action past the deadline.
      const body = (loop().steps ?? []).map(({ name }) => name);

      expect(body.indexOf('recompute_remaining')).toBeGreaterThan(body.indexOf('gate_branch'));
      // Both branches that read the recomputed clock come after it.
      expect(body.indexOf('recompute_remaining')).toBeLessThan(
        body.indexOf('settle_expired_after_gate')
      );
    });

    it('settles a late decision as expired and breaks', () => {
      const settle = findStep(workflow.steps, 'settle_expired_after_gate');

      expect(settle?.condition).toContain('variables.remaining_seconds <= 0');
      expect(findStep(workflow.steps, 'record_late_expiry')?.with?.status).toBe('expired');
      expect(findStep(workflow.steps, 'break_late_expiry')?.type).toBe('loop.break');
    });
  });

  describe('gate failures', () => {
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
      expect(gateBranchOrder).toEqual(['await_decision', 'resolve_gate']);

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

      expect(handle?.condition).toContain('variables.gate_timed_out == true');
      expect(findStep(workflow.steps, 'record_gate_expiry')?.with?.status).toBe('expired');
      expect(
        String(findStep(workflow.steps, 'record_gate_expiry')?.with?.executionError)
      ).toContain('variables.gate_error');
      expect(findStep(workflow.steps, 'break_gate_expiry')?.type).toBe('loop.break');
    });

    it('settles a timeout before the late-decision branch, which would misreport it', () => {
      // The gate's timeout *is* the time left on the deadline, so every
      // timeout also satisfies `settle_expired_after_gate`. Checking that
      // first would swallow every timeout and record that a decision arrived
      // after the deadline when none arrived at all.
      const body = (loop().steps ?? []).map(({ name }) => name);

      expect(body.indexOf('handle_gate_timeout')).toBeLessThan(
        body.indexOf('settle_expired_after_gate')
      );
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
      const resolve = findStep(workflow.steps, 'resolve_live_head_before_writes');
      const adopt = findStep(workflow.steps, 'adopt_live_head_before_writes');

      expect(resolve?.type).toBe('proposals.getLatestRevision');
      expect(String(resolve?.with?.proposalId)).toContain('variables.current_proposal_id');
      expect(String(adopt?.with?.current_proposal_id)).toContain(
        'steps.resolve_live_head_before_writes.output.proposalId'
      );
      // The input travels with the id: resolving the head but keeping the
      // trigger's input would approve one revision and execute another's.
      expect(String(adopt?.with?.action_input)).toContain(
        'steps.resolve_live_head_before_writes.output.actionInput'
      );
    });

    it('routes every post-gate write through that one adopt', () => {
      // One adopt, after the privilege check and before every branch that
      // writes, covers the timeout, autonomy and answered paths alike. It is
      // the only reason those branches can be read as a plain sequence.
      const body = (loop().steps ?? []).map(({ name }) => name);
      const adopt = body.indexOf('adopt_live_head_before_writes_branch');

      // `gate_branch` carries the autonomy path in its `else`, so both
      // decision paths are upstream of the adopt.
      expect(adopt).toBeGreaterThan(body.indexOf('gate_branch'));
      for (const write of [
        'handle_gate_timeout',
        'settle_expired_after_gate',
        'handle_dismissal',
        'approve_without_action',
        'approve_with_action',
      ]) {
        expect(body.indexOf(write)).toBeGreaterThan(adopt);
      }
    });

    it('keeps exactly two adopt sites in the loop, and none inside a branch that writes', () => {
      // The count is the simplification: five placements were five chances to
      // add a write without one. Any new adopt inside a branch means the
      // sequence above stopped being enough, which is worth noticing.
      const bodyNames = (loop().steps ?? []).map(({ name }) => name);
      const adoptsInBody = bodyNames.filter((name) => name?.startsWith('adopt_live_head'));

      expect(adoptsInBody).toEqual([
        'adopt_live_head_each_iteration_branch',
        'adopt_live_head_before_writes_branch',
      ]);
    });

    it('adopts the live head before the first write of an iteration, not only after the gate', () => {
      // `settle_expired` is the iteration's earliest write. A revision
      // appended between iterations moves the chain head, so resolving only
      // inside `gate_branch` leaves it settling a row the service now refuses
      // -- the run fails and the live revision stays pending.
      const body = (loop().steps ?? []).map(({ name }) => name);
      const adoptIndex = body.indexOf('adopt_live_head_each_iteration_branch');
      expect(adoptIndex).toBeGreaterThanOrEqual(0);
      for (const write of ['settle_expired']) {
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

    it('does not retry a non-conflict settle failure', () => {
      // Only a ConflictError means "the head moved under us"; a transport or
      // service fault wants the workflow-level fallback, not a blind rewrite.
      const retry = findStep(workflow.steps, 'settle_expired')?.['on-failure']?.retry;

      expect(String(retry?.condition)).toContain('ConflictError');
      expect(String(retry?.condition)).not.toContain('ApiError');
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
    it('records a failure from the workflow-level on-failure, since HITL steps take none', () => {
      const fallback = workflow.settings?.['on-failure']?.fallback ?? [];

      expect(fallback.map(({ type }) => type)).toContain('proposals.updateProposal');
    });

    it('settles from the carried id, not the create step output that a clone invalidates', () => {
      const fallback = workflow.settings?.['on-failure']?.fallback ?? [];
      const addressed = fallback.filter((step) => step.with?.proposalId !== undefined);

      expect(addressed.length).toBeGreaterThan(0);
      for (const step of addressed) {
        expect(String(step.with?.proposalId)).toContain('variables.current_proposal_id');
      }
    });

    it('adopts the live head before settling, or the handler fails the way the loop did', () => {
      // This is the last thing that can settle the record. A revision landing
      // during the park leaves the carried id superseded, which `updateProposal`
      // refuses — so without this the handler throws on the same conflict that
      // brought it here, and the live revision is left `pending` against an
      // execution that is already over.
      const fallback = workflow.settings?.['on-failure']?.fallback ?? [];
      const names = fallback.map(({ name }) => name);
      const resolve = findStep(fallback, 'resolve_live_head_on_failure');

      expect(resolve?.type).toBe('proposals.getLatestRevision');
      expect(
        String(findStep(fallback, 'adopt_live_head_on_failure')?.with?.current_proposal_id)
      ).toContain('steps.resolve_live_head_on_failure.output.proposalId');

      for (const write of ['record_failure_after_decision', 'record_expiry_before_decision']) {
        expect(names.indexOf(write)).toBeGreaterThan(names.indexOf('adopt_live_head_on_failure'));
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
