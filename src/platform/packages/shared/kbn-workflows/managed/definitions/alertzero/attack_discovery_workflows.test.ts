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
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW,
} from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils';
import { DEFAULT_PARALLEL_MAX_FAN_OUT, WorkflowSchema } from '../../../spec/schema';

/**
 * Verdicts the FP/TP analysis workflow may return. Each one must have a dedicated
 * switch case in the review workflow, so a verdict never falls through to the
 * default arm.
 */
const VERDICTS = ['false_positive', 'true_positive', 'inconclusive', 'failed'] as const;

interface YamlStep {
  name: string;
  type: string;
  if?: string;
  timeout?: string;
  mode?: string;
  foreach?: string;
  expression?: string;
  concurrency?: number | { max?: number; 'count-waiting'?: boolean };
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  cases?: Array<{ match: string; steps: YamlStep[] }>;
  default?: YamlStep[];
  'on-failure'?: { continue?: boolean };
}

interface YamlWorkflow {
  steps: YamlStep[];
  consts?: Record<string, unknown>;
  outputs?: Array<{ name: string; type?: string }>;
  settings?: { concurrency?: unknown; timeout?: string };
  triggers?: Array<{
    type: string;
    inputs?: {
      properties?: Record<string, { type?: string; maxLength?: number; enum?: string[] }>;
      required?: string[];
    };
  }>;
}

interface ConcurrencySettings {
  key?: string;
  max?: number;
  strategy?: string;
}

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [
    step,
    ...flatten(step.steps ?? []),
    ...flatten(step.else ?? []),
    ...flatten(step.default ?? []),
    ...(step.cases ?? []).flatMap((c) => flatten(c.steps)),
  ]);

const worker = parse(ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW.yaml) as YamlWorkflow;
const review = parse(ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW.yaml) as YamlWorkflow;

// The Watch Floor worker is a template, so it has to be rendered before parsing.
const floor = parse(
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW.yamlTemplate({
    autonomyLevel: 'manual',
    scheduleInterval: '24h',
    settingsVersion: 1,
  })
) as YamlWorkflow;

const workerSteps = flatten(worker.steps);
const reviewSteps = flatten(review.steps);
const floorSteps = flatten(floor.steps);

const stepIn = (steps: YamlStep[], name: string) => steps.find((step) => step.name === name);

const asInputs = (step: YamlStep | undefined): Record<string, string> =>
  (step?.with?.inputs ?? {}) as Record<string, string>;

const asConcurrency = (value: unknown): ConcurrencySettings => (value ?? {}) as ConcurrencySettings;

describe('Attack Discovery worker chain', () => {
  it.each([
    [
      'worker',
      ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW,
      ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
    ],
    [
      'review',
      ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW,
      ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
    ],
  ])('registers the %s under its expected id', (_name, workflow, id) => {
    expect(workflow.id).toBe(id);
  });

  // Managed install only runs lightweight validation, where `steps` is
  // `z.array(z.unknown())`, so an authoring error in these files would otherwise
  // surface at execution time rather than in CI. This is the assertion that catches it.
  it.each([
    ['worker', ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW.yaml],
    ['review', ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW.yaml],
    [
      'floor worker',
      ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW.yamlTemplate({
        autonomyLevel: 'manual',
        scheduleInterval: '24h',
        settingsVersion: 1,
      }),
    ],
  ])('%s passes strict workflow schema validation', (_name, yaml) => {
    const result = WorkflowSchema.safeParse(parse(yaml));

    expect(result.success ? null : result.error.issues).toBeNull();
  });

  describe('Watch Floor worker dispatch', () => {
    const dispatch = stepIn(floorSteps, 'run_attack_discovery');

    it('replaces the console stub', () => {
      expect(floorSteps.map((step) => step.type)).not.toContain('console');
    });

    it('dispatches to the Attack Discovery worker', () => {
      expect(dispatch?.with?.['workflow-id']).toBe(ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID);
    });

    // Only the sync strategy propagates the child's failure. With executeAsync the
    // worker run would report success while generation had failed, which #19276
    // explicitly forbids.
    it('dispatches with workflow.execute', () => {
      expect(dispatch?.type).toBe('workflow.execute');
    });

    it('does not dispatch with workflow.executeAsync', () => {
      expect(floorSteps.map((step) => step.type)).not.toContain('workflow.executeAsync');
    });

    it('leaves dispatch failure propagation alone', () => {
      expect(dispatch?.['on-failure']).toBeUndefined();
    });

    // #19276 names all three settings. `scheduleInterval` has no behavioral use in the
    // skeleton, so dropping it would be easy and would silently break the contract.
    it.each([
      ['autonomy', 'consts.worker_settings.autonomy'],
      ['settings_version', 'consts.worker_settings.settingsVersion'],
      ['schedule_interval', 'consts.worker_settings.scheduleInterval'],
    ])('forwards the %s worker setting', (input, reference) => {
      expect(asInputs(dispatch)[input]).toContain(reference);
    });

    it('forwards enum and interval settings with type-preserving templates', () => {
      expect(asInputs(dispatch).autonomy).toBe('${{ consts.worker_settings.autonomy }}');
      expect(asInputs(dispatch).schedule_interval).toBe(
        '${{ consts.worker_settings.scheduleInterval }}'
      );
    });

    it('keeps the scheduled trigger and adds no second scheduler', () => {
      expect((floor.triggers ?? []).map((trigger) => trigger.type)).toEqual(['scheduled']);
    });

    // Workflow-level concurrency must be an object: unlike a `parallel` step's
    // `concurrency`, ConcurrencySettingsSchema does not accept a bare number.
    it('cancels overlapping scheduled floor runs in progress', () => {
      expect(asConcurrency(floor.settings?.concurrency).strategy).toBe('cancel-in-progress');
    });

    it('limits overlapping scheduled floor runs to one', () => {
      expect(asConcurrency(floor.settings?.concurrency).max).toBe(1);
    });
  });

  // The worker is installed globally but executes per space. Concurrency is always
  // checked within a single space, so the space in the key is for readability rather
  // than isolation. `workflow.spaceId` comes from the execution document and is
  // resolvable in a concurrency key, unlike templated `inputs.*`, which are evaluated
  // after the key.
  it('scopes the global worker concurrency key to the space', () => {
    expect(asConcurrency(worker.settings?.concurrency).key).toContain('{{ workflow.spaceId }}');
  });

  it('cancels overlapping global runner runs in progress', () => {
    expect(asConcurrency(worker.settings?.concurrency).strategy).toBe('cancel-in-progress');
  });

  it('limits overlapping global worker runs to one', () => {
    expect(asConcurrency(worker.settings?.concurrency).max).toBe(1);
  });

  describe('generation step', () => {
    const run = stepIn(workerSteps, 'run_generation');

    it('reuses the existing generation engine through the run step', () => {
      expect(run?.type).toBe('security.attack-discovery.run');
    });

    it('runs generation in sync mode', () => {
      expect(run?.with?.mode).toBe('sync');
    });

    // The pipeline enforces its own 30m budget internally. A step timeout at or below
    // it would win the race and produce an opaque engine kill that does NOT cancel the
    // background pipeline, instead of an attributed PipelineStepError.
    it('sets a step timeout above the 30m pipeline budget', () => {
      expect(run?.timeout).toBe('35m');
    });

    it('leaves failure propagation alone so a failed generation fails the run', () => {
      expect(run?.['on-failure']).toBeUndefined();
    });
  });

  describe('fan-out', () => {
    const resolve = stepIn(workerSteps, 'resolve_fanout');
    const parallel = stepIn(workerSteps, 'run_reviews');
    const branch = (parallel?.steps ?? [])[0];
    const branchInputs = asInputs(branch);

    it('resolves fan-out from the generated discoveries', () => {
      expect(resolve?.with?.attacks).toContain('steps.run_generation.output.attack_discoveries');
    });

    it('fans out over the resolved attacks', () => {
      expect(parallel?.foreach).toContain('steps.current_batch.output.attacks');
    });

    it('copies each batch so the inner foreach.item is the attack', () => {
      expect(stepIn(workerSteps, 'current_batch')?.with?.attacks).toBe('${{ foreach.item }}');
    });

    it('drains discoveries in batches so parallel never exceeds its fan-out ceiling', () => {
      expect(stepIn(workerSteps, 'run_review_batches')?.foreach).toContain(
        'steps.resolve_fanout.output.batches'
      );
    });

    // The ONLY permitted fallback is an empty array. A fallback that substituted
    // fabricated attacks would make the artifact synthetic, and would later have #19022
    // opening real Investigations for attacks that never existed.
    it('falls back to consts.no_discoveries', () => {
      expect(resolve?.with?.attacks).toContain('default: consts.no_discoveries');
    });

    it('defines no_discoveries as an empty array', () => {
      expect(worker.consts?.no_discoveries).toEqual([]);
    });

    it('declares no synthetic discovery data anywhere in either workflow', () => {
      const constNames = [...Object.keys(worker.consts ?? {}), ...Object.keys(review.consts ?? {})];

      expect(constNames.filter((name) => /stub_discover|fake|sample_attack/i.test(name))).toEqual(
        []
      );
    });

    it('does not slice discoveries off the fan-out list', () => {
      expect(resolve?.with?.attacks).not.toContain('slice:');
    });

    it('chunks discoveries to DEFAULT_PARALLEL_MAX_FAN_OUT', () => {
      expect(resolve?.with?.batches).toContain(`chunk: ${DEFAULT_PARALLEL_MAX_FAN_OUT}`);
    });

    describe('drain of an oversized generation', () => {
      // Evaluates the authored `${{ }}` expressions, not a copy of them, so a YAML
      // edit that reintroduces a slice or a tighter chunk is a failed test rather
      // than a comment drift. This is the data plane of a 150-discovery run; it
      // does not claim Task Manager workers.
      const liquid = createWorkflowLiquidEngine();
      const overflowCount = DEFAULT_PARALLEL_MAX_FAN_OUT + 50;
      const evaluate = (expression: string, context: Record<string, unknown>): unknown =>
        liquid.evalValueSync(expression.slice(3, -2).trim(), context);
      const contextFor = (attackDiscoveries: unknown): Record<string, unknown> => ({
        consts: { no_discoveries: worker.consts?.no_discoveries },
        steps: {
          run_generation: {
            output:
              attackDiscoveries === undefined ? {} : { attack_discoveries: attackDiscoveries },
          },
        },
      });
      const discoveries = (count: number): Array<{ title: string }> =>
        Array.from({ length: count }, (_, index) => ({ title: `Attack ${index}` }));

      it('counts every discovery in an oversized generation', () => {
        expect(
          evaluate(String(resolve?.with?.attack_count), contextFor(discoveries(overflowCount)))
        ).toBe(overflowCount);
      });

      it('splits an oversized generation into a full batch and a remainder', () => {
        const batches = evaluate(
          String(resolve?.with?.batches),
          contextFor(discoveries(overflowCount))
        ) as unknown[][];

        expect(batches.map((batch) => batch.length)).toEqual([DEFAULT_PARALLEL_MAX_FAN_OUT, 50]);
      });

      it('keeps every discovery across batches', () => {
        const batches = evaluate(
          String(resolve?.with?.batches),
          contextFor(discoveries(overflowCount))
        ) as Array<Array<{ title: string }>>;

        expect(batches.flat()).toEqual(discoveries(overflowCount));
      });

      it('fits a generation at the fan-out ceiling into one batch', () => {
        const batches = evaluate(
          String(resolve?.with?.batches),
          contextFor(discoveries(DEFAULT_PARALLEL_MAX_FAN_OUT))
        ) as unknown[][];

        expect(batches.map((batch) => batch.length)).toEqual([DEFAULT_PARALLEL_MAX_FAN_OUT]);
      });

      it('does not invent a batch when generation returned an empty array', () => {
        expect(evaluate(String(resolve?.with?.batches), contextFor([]))).toEqual([]);
      });

      it('does not invent a batch when generation returned null', () => {
        expect(evaluate(String(resolve?.with?.batches), contextFor(null))).toEqual([]);
      });

      it('does not invent a batch when generation omitted attack_discoveries', () => {
        expect(evaluate(String(resolve?.with?.batches), contextFor(undefined))).toEqual([]);
      });

      it('requests a review for every discovery in an oversized generation', () => {
        const attackCount = evaluate(
          String(resolve?.with?.attack_count),
          contextFor(discoveries(overflowCount))
        );

        expect(
          evaluate(String(stepIn(workerSteps, 'summarize_run')?.with?.reviews_requested), {
            steps: { resolve_fanout: { output: { attack_count: attackCount } } },
          })
        ).toBe(overflowCount);
      });

      it('does not skip fan-out for an oversized generation', () => {
        expect(
          evaluate(String(stepIn(workerSteps, 'log_empty_run')?.if), {
            steps: { resolve_fanout: { output: { attack_count: overflowCount } } },
          })
        ).toBe(false);
      });
    });

    // DEFAULT_PARALLEL_MAX_CONCURRENCY is 20, enforced by the schema as an error.
    it('sets parallel concurrency above zero', () => {
      expect(asConcurrency(parallel?.concurrency).max).toBeGreaterThan(0);
    });

    it('sets parallel concurrency within the schema ceiling', () => {
      expect(asConcurrency(parallel?.concurrency).max).toBeLessThanOrEqual(20);
    });

    it('settles every branch so one failed review does not abandon the rest', () => {
      expect(parallel?.mode).toBe('settled');
    });

    it('puts exactly one step in each parallel branch', () => {
      expect(parallel?.steps).toHaveLength(1);
    });

    it('launches each review with workflow.execute', () => {
      expect(branch?.type).toBe('workflow.execute');
    });

    it('launches the review workflow once per attack', () => {
      expect(branch?.with?.['workflow-id']).toBe(ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID);
    });

    // A parallel branch body must be a straight-line sequence of steps: no nested flow
    // control, and no step-level `if`, `timeout`, or `on-failure`.
    it.each(['cases', 'foreach', 'if', 'on-failure', 'timeout'] as const)(
      'keeps the branch body free of %s',
      (field) => {
        expect(flatten(parallel?.steps ?? []).filter((step) => step[field] !== undefined)).toEqual(
          []
        );
      }
    );

    it('passes title through to the review', () => {
      expect(branchInputs.title).toContain('foreach.item.title');
    });

    // `${{ }}` preserves the array type; `{{ }}` would stringify it.
    it('passes alert_ids through as a typed array', () => {
      expect(branchInputs.alert_ids).toBe('${{ foreach.item.alert_ids }}');
    });

    it('passes autonomy through as a typed enum', () => {
      expect(branchInputs.autonomy).toBe('${{ inputs.autonomy }}');
    });

    // Handover `id` is the LLM UUID, not the persisted ES `_id`. #19022 will
    // consume persist ids once the run step returns them in-context. Until then
    // this stub must not pass `foreach.item.id`.
    it('does not pass the handover id through to the review', () => {
      expect(branchInputs.id).toBeUndefined();
    });

    it('passes parent_run_id through to the review', () => {
      expect(branchInputs.parent_run_id).toContain('execution.id');
    });

    it('logs an empty generation with a console step', () => {
      expect(stepIn(workerSteps, 'log_empty_run')?.type).toBe('console');
    });

    it('skips the fan-out when attack_count is zero', () => {
      expect(stepIn(workerSteps, 'log_empty_run')?.if).toContain('attack_count == 0');
    });

    it('requests a review for every generated attack', () => {
      expect(stepIn(workerSteps, 'summarize_run')?.with?.reviews_requested).toContain(
        'steps.resolve_fanout.output.attack_count'
      );
    });
  });

  describe('review workflow', () => {
    const verdictSwitch = stepIn(reviewSteps, 'apply_verdict');
    const inconclusiveStep = (verdictSwitch?.cases ?? []).find((c) => c.match === 'inconclusive')
      ?.steps[0];
    const actionSteps = reviewSteps.filter(
      (step) => !['data.set', 'switch', 'workflow.output'].includes(step.type)
    );

    it('has a switch case for every known verdict', () => {
      expect(new Set((verdictSwitch?.cases ?? []).map((c) => c.match))).toEqual(new Set(VERDICTS));
    });

    it('has no stray switch cases beyond the known verdicts', () => {
      expect(verdictSwitch?.cases ?? []).toHaveLength(VERDICTS.length);
    });

    it('still routes an out-of-enum verdict somewhere rather than dropping it', () => {
      expect(verdictSwitch?.default ?? []).not.toHaveLength(0);
    });

    it('applies the verdict with a switch', () => {
      expect(verdictSwitch?.type).toBe('switch');
    });

    it('switches on the stub verdict with the default fallback', () => {
      expect(verdictSwitch?.expression).toContain('inputs.stub_verdict');
      expect(verdictSwitch?.expression).toContain('default: consts.default_verdict');
    });

    // #19276 AC1. A default run then exercises the decided Promote-to-Incident
    // path (same as true_positive); the branch is still a console stub.
    it('defaults the stub verdict from consts.default_verdict', () => {
      expect(verdictSwitch?.expression).toContain('default: consts.default_verdict');
    });

    it('defaults consts.default_verdict to inconclusive', () => {
      expect(review.consts?.default_verdict).toBe('inconclusive');
    });

    it('names the inconclusive branch promote_inconclusive_per_autonomy', () => {
      expect(inconclusiveStep?.name).toBe('promote_inconclusive_per_autonomy');
    });

    it('stubs the inconclusive branch as a console step', () => {
      expect(inconclusiveStep?.type).toBe('console');
    });

    it('routes inconclusive onto the Promote-to-Incident path', () => {
      expect(inconclusiveStep?.with?.message).toContain('Promote-to-Incident');
    });

    it('does not tag inconclusive for a downstream worker', () => {
      expect(inconclusiveStep?.with?.message).not.toContain('tagging');
    });

    it('exposes every verdict as an input so all branches stay reachable', () => {
      expect(review.triggers?.[0]?.inputs?.properties?.stub_verdict?.enum).toEqual([...VERDICTS]);
    });

    // The whole point of this PR: nothing here may touch a real Investigation, a real
    // proposal, or a real conversation. Those land in #19022 / #19211 / #19214.
    it('has at least one action step in the review', () => {
      expect(actionSteps).not.toHaveLength(0);
    });

    it('implements every action as a console stub', () => {
      expect(actionSteps.map((step) => step.type)).toEqual(actionSteps.map(() => 'console'));
    });

    it.each(['ai.conversation.create', 'kibana.request', 'waitForApproval', 'workflow.execute'])(
      'makes no %s call',
      (type) => {
        expect(reviewSteps.map((step) => step.type)).not.toContain(type);
      }
    );

    it.each(['open_investigation', 'run_fp_tp_analysis'])('stubs %s as a console step', (name) => {
      expect(stepIn(reviewSteps, name)?.type).toBe('console');
    });
  });

  describe('handoff contracts', () => {
    // `workflow.execute` resolves to the child's `context.output`, so a child without an
    // explicit `workflow.output` step hands its parent nothing.
    it.each([
      ['worker', workerSteps],
      ['review', reviewSteps],
    ])('%s emits an explicit workflow.output', (_name, steps) => {
      expect(steps.filter((step) => step.type === 'workflow.output')).toHaveLength(1);
    });

    it.each(['alerts_analyzed', 'attacks_generated', 'reviews_failed', 'reviews_requested'])(
      'reports %s so a caller can tell an empty run from a failed one',
      (name) => {
        expect((worker.outputs ?? []).map((output) => output.name)).toContain(name);
      }
    );

    // The editor type-checks `workflow.output` `with:` source text, so a
    // `type: number` field cannot be filled with `"${{ ... }}"`.
    it.each(['alerts_analyzed', 'attacks_generated', 'reviews_failed', 'reviews_requested'])(
      'declares %s as a string so the templated emit passes editor type checks',
      (name) => {
        expect((worker.outputs ?? []).find((output) => output.name === name)?.type).toBe('string');
      }
    );

    // `${{ }}` keeps the Liquid value's type. Runtime output validation then
    // rejects a number against `type: string`. `{{ }}` stringifies so the
    // emitted value matches the declared schema.
    it.each(['alerts_analyzed', 'attacks_generated', 'reviews_failed', 'reviews_requested'])(
      'stringifies %s in emit_result so runtime matches the string output schema',
      (name) => {
        const value = stepIn(workerSteps, 'emit_result')?.with?.[name];

        expect(value).toEqual(expect.any(String));
        expect(value).toMatch(/^\{\{/);
        expect(value).not.toMatch(/^\$\{\{/);
      }
    );

    it('echoes the schedule interval so a run records the cadence that launched it', () => {
      expect(stepIn(workerSteps, 'emit_result')?.with?.schedule_interval).toContain(
        'inputs.schedule_interval'
      );
    });

    it('reports the generation execution_uuid so a run can be traced to its discoveries', () => {
      expect((worker.outputs ?? []).map((output) => output.name)).toContain('execution_uuid');
    });

    // The Attack Discovery generation id from the run step, not this workflow's
    // execution id: it keys the AD generations API and every persisted discovery.
    it('takes execution_uuid from the run step rather than the workflow execution', () => {
      expect(stepIn(workerSteps, 'emit_result')?.with?.execution_uuid).toContain(
        'steps.run_generation.output.execution_uuid'
      );
    });

    it.each(['investigation_opened', 'title', 'verdict'])('returns %s from each review', (name) => {
      expect((review.outputs ?? []).map((output) => output.name)).toContain(name);
    });
  });

  describe('input bounds', () => {
    it.each([
      ['worker', worker],
      ['review', review],
    ])('%s declares at least one input', (_name, workflow) => {
      expect(Object.keys(workflow.triggers?.[0]?.inputs?.properties ?? {}).length).toBeGreaterThan(
        0
      );
    });

    it.each([
      ['worker', worker],
      ['review', review],
    ])('%s bounds every free-text input', (_name, workflow) => {
      const props = workflow.triggers?.[0]?.inputs?.properties ?? {};
      // A closed enum is inherently bounded; anything else needs an explicit maxLength.
      const unbounded = Object.entries(props)
        .filter(([, schema]) => schema.type === 'string' && !schema.maxLength && !schema.enum)
        .map(([name]) => name);

      expect(unbounded).toEqual([]);
    });

    it.each([
      ['worker', worker],
      ['review', review],
    ])('%s stays manual-only so the Watch Floor worker owns the schedule', (_name, workflow) => {
      expect((workflow.triggers ?? []).map((trigger) => trigger.type)).toEqual(['manual']);
    });
  });

  // Overlapping runner runs are already cancelled by the floor / runner concurrency
  // policy. Sequential
  // re-generation of the same attack is a #19022 Investigation concern (and AD
  // hash-dedup), not a per-attack concurrency key on this review.
  it('gives the review workflow no per-attack concurrency policy', () => {
    expect(review.settings?.concurrency).toBeUndefined();
  });

  // The default workflow timeout (6h) must stay above the 35m generation step.
  it.each([
    ['floor', floor],
    ['worker', worker],
  ])('leaves the %s workflow-level timeout at its generous default', (_name, workflow) => {
    expect(workflow.settings?.timeout).toBeUndefined();
  });
});
