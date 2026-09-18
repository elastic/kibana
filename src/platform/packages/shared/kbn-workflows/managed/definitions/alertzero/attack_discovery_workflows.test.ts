/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { z } from '@kbn/zod/v4';
import {
  ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKFLOW_IDS,
  ALERTZERO_JOURNAL_NOTE_WORKFLOW,
  ALERTZERO_JOURNAL_NOTE_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW,
} from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils';
import {
  type ConcurrencySettings,
  DEFAULT_PARALLEL_MAX_FAN_OUT,
  type ParallelConcurrencyObject,
  WorkflowSchema,
} from '../../../spec/schema';

/**
 * Verdicts the FP/TP analysis workflow may return. Each one must have a dedicated
 * switch case in the review workflow, so a verdict never falls through to the
 * default arm.
 */
const VERDICTS = ['false_positive', 'true_positive', 'inconclusive', 'failed'] as const;

// These two interfaces describe the raw `parse(yaml)` tree, not the schema's output.
// `WorkflowSchema.parse` cannot stand in for them: every construct that nests steps
// types its children as `z.array(BaseStepSchema)` — `ForEachStepSchema` (schema.ts
// line 521), `SwitchCaseSchema` (596), `IfStepConfigSchema` (648, 649) and
// `ParallelStepConfigSchema` (775) — and `BaseStepSchema` (72) declares only `name`,
// `type`, `if` and `max-step-size`. Zod strips unknown keys, so `with`, `timeout`,
// `mode`, `foreach`, `expression` and `concurrency` are all dropped from any nested
// step. Assertions on `run_review`'s `with.inputs`, or on anything inside a `switch`
// case, would then read `undefined` and the negative ones would pass vacuously.
// Field shapes that the schema does define are imported rather than redeclared.
interface YamlStep {
  name: string;
  type: string;
  if?: string;
  timeout?: string;
  mode?: string;
  foreach?: string;
  expression?: string;
  concurrency?: ParallelConcurrencyObject;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  cases?: Array<{ match: string; steps: YamlStep[] }>;
  default?: YamlStep[];
  'on-failure'?: { continue?: boolean; fallback?: YamlStep[] };
}

interface YamlWorkflow {
  steps: YamlStep[];
  consts?: Record<string, unknown>;
  outputs?: Array<{ name: string; type?: string }>;
  settings?: { concurrency?: ConcurrencySettings; timeout?: string };
  triggers?: Array<{
    type: string;
    inputs?: {
      properties?: Record<
        string,
        {
          type?: string;
          maxLength?: number;
          enum?: string[];
          properties?: Record<string, unknown>;
          additionalProperties?: boolean;
        }
      >;
    };
  }>;
}

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [
    step,
    ...flatten(step.steps ?? []),
    ...flatten(step.else ?? []),
    ...flatten(step.default ?? []),
    ...(step.cases ?? []).flatMap((c) => flatten(c.steps)),
    ...flatten(step['on-failure']?.fallback ?? []),
  ]);

const worker = parse(ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW.yaml) as YamlWorkflow;
const review = parse(ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW.yaml) as YamlWorkflow;

const journalNote = parse(ALERTZERO_JOURNAL_NOTE_WORKFLOW.yaml) as YamlWorkflow;

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
const journalNoteSteps = flatten(journalNote.steps);
const reviewStepNames = reviewSteps.map((step) => step.name);

const stepIn = (steps: YamlStep[], name: string) => steps.find((step) => step.name === name);

const asInputs = (step: YamlStep | undefined): Record<string, string> =>
  (step?.with?.inputs ?? {}) as Record<string, string>;

const asWith = (step: YamlStep | undefined): Record<string, string> =>
  (step?.with ?? {}) as Record<string, string>;

// Every reference to the Investigation resolves through the derived id rather than
// through the create's output: on a re-review the create 409s and emits nothing.
const derivedInvestigationId = '{{ steps.resolve_investigation_id.output.investigation_id }}';
const journalWorkflowIdTemplate = '{{ consts.journal_note }}';

const journalExecutes = (steps: YamlStep[]) =>
  steps.filter(
    (step) =>
      step.type === 'workflow.execute' && step.with?.['workflow-id'] === journalWorkflowIdTemplate
  );

// Two persisted Attack Discovery ids. `kibana.alert.uuid` is the SHA-256 hex the
// ad-hoc write path ids each attack by, so these are real digests written out
// literally: `crypto` is a Node builtin this browser-safe package cannot import.
const AN_ATTACK_ID = '50e2f8aef56286bd953f8e0e1f72b9ddc9c454244a5623bf812a1657b6e82e40';
const ANOTHER_ATTACK_ID = 'c62d0bf382e6ce929360081730e6353d0e528ca3580b16892854fe4375a0486f';

// Renders the derivation exactly as the engine will, so the assertions read the
// value a real execution produces rather than the template source.
const renderInvestigationId = (attackDiscoveryId: string): Promise<string> =>
  createWorkflowLiquidEngine().parseAndRender(
    asWith(stepIn(reviewSteps, 'resolve_investigation_id')).investigation_id,
    { inputs: { attack_discovery_id: attackDiscoveryId } }
  );

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
    ['journal note', ALERTZERO_JOURNAL_NOTE_WORKFLOW, ALERTZERO_JOURNAL_NOTE_WORKFLOW_ID],
  ])('registers the %s under its expected id', (_name, workflow, id) => {
    expect(workflow.id).toBe(id);
  });

  // Managed install only runs lightweight validation, where `steps` is
  // `z.array(z.unknown())`, so an authoring error in these files would otherwise
  // surface at execution time rather than in CI. This is the assertion that catches it.
  it.each([
    ['worker', ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW.yaml],
    ['review', ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW.yaml],
    ['journal note', ALERTZERO_JOURNAL_NOTE_WORKFLOW.yaml],
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

    it.each([
      ['autonomy', '${{ consts.worker_settings.autonomy }}'],
      ['schedule_interval', '${{ consts.worker_settings.scheduleInterval }}'],
    ])('forwards %s with a type-preserving template', (input, template) => {
      expect(asInputs(dispatch)[input]).toBe(template);
    });

    it('keeps the scheduled trigger and adds no second scheduler', () => {
      expect((floor.triggers ?? []).map((trigger) => trigger.type)).toEqual(['scheduled']);
    });

    // Workflow-level concurrency must be an object: unlike a `parallel` step's
    // `concurrency`, ConcurrencySettingsSchema does not accept a bare number.
    it('cancels overlapping scheduled floor runs in progress', () => {
      expect(floor.settings?.concurrency?.strategy).toBe('cancel-in-progress');
    });

    it('limits overlapping scheduled floor runs to one', () => {
      expect(floor.settings?.concurrency?.max).toBe(1);
    });
  });

  // The worker is installed globally but executes per space. Concurrency is always
  // checked within a single space, so the space in the key is for readability rather
  // than isolation. `workflow.spaceId` comes from the execution document and is
  // resolvable in a concurrency key, unlike templated `inputs.*`, which are evaluated
  // after the key.
  it('scopes the global worker concurrency key to the space', () => {
    expect(worker.settings?.concurrency?.key).toContain('{{ workflow.spaceId }}');
  });

  it('cancels overlapping global runner runs in progress', () => {
    expect(worker.settings?.concurrency?.strategy).toBe('cancel-in-progress');
  });

  it('limits overlapping global worker runs to one', () => {
    expect(worker.settings?.concurrency?.max).toBe(1);
  });

  describe('generation step', () => {
    const run = stepIn(workerSteps, 'run_generation');

    it('delegates generation with workflow.execute', () => {
      expect(run?.type).toBe('workflow.execute');
    });

    it('delegates generation to the batched sub-workflow', () => {
      expect(run?.with?.['workflow-id']).toBe(
        'system-security-attack-discovery-batched-generation'
      );
    });

    // `workflow.execute`, not `executeAsync`: the fan-out below needs the
    // discoveries inline, and a child failure must fail this run.
    it('waits for the child rather than firing it off', () => {
      expect(run?.type).not.toBe('workflow.executeAsync');
    });

    // The child runs N pipelines, each with its own 30m branch-timeout, so this
    // bounds the whole batched run rather than a single pipeline's 30m budget.
    it('sets a step timeout that bounds the whole batched child', () => {
      expect(run?.timeout).toBe('4h');
    });

    it('leaves failure propagation alone so a failed generation fails the run', () => {
      expect(run?.['on-failure']).toBeUndefined();
    });
  });

  // The batched child already reads the persisted discoveries back from the index
  // and emits their `_source`, which carries `kibana.alert.uuid` — the same value
  // the bulk create used as the document `_id`. So the runner has the persisted
  // document id in hand and a second read here would be the same query twice.
  it('does not repeat the index read the batched child already performed', () => {
    expect(workerSteps.filter((step) => step.type === 'elasticsearch.search')).toEqual([]);
  });

  describe('fan-out', () => {
    const resolve = stepIn(workerSteps, 'resolve_fanout');
    const parallel = stepIn(workerSteps, 'run_reviews');
    const branch = (parallel?.steps ?? [])[0];
    const branchInputs = asInputs(branch);

    // The fan-out is over what PERSISTED, not over what the model produced: the
    // child's `attack_discoveries` is its read-back of the index, so every item
    // carries a real Attack Discovery document id. That is also what lets
    // `attacks_generated` and `reviews_requested` disagree.
    it('resolves fan-out from the persisted discoveries', () => {
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
      // Strips either delimiter: `data.set` steps author `${{ }}` to preserve type,
      // while `workflow.output` uses `{{ }}`.
      const evaluate = (expression: string, context: Record<string, unknown>): unknown =>
        liquid.evalValueSync(
          expression
            .replace(/^\$?\{\{/, '')
            .replace(/\}\}$/, '')
            .trim(),
          context
        );
      const contextFor = (attackDiscoveries: unknown): Record<string, unknown> => ({
        consts: { no_discoveries: worker.consts?.no_discoveries },
        steps: {
          run_generation: {
            output:
              attackDiscoveries === undefined ? {} : { attack_discoveries: attackDiscoveries },
          },
        },
      });
      // Shaped like the persisted `_source` documents the batched child emits,
      // whose fields are flat dotted keys.
      const discoveries = (count: number): Array<{ 'kibana.alert.uuid': string }> =>
        Array.from({ length: count }, (_, index) => ({
          'kibana.alert.uuid': `discovery-${index}`,
        }));

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
        ) as Array<Array<{ 'kibana.alert.uuid': string }>>;

        expect(batches.flat()).toEqual(discoveries(overflowCount));
      });

      it('fits a generation at the fan-out ceiling into one batch', () => {
        const batches = evaluate(
          String(resolve?.with?.batches),
          contextFor(discoveries(DEFAULT_PARALLEL_MAX_FAN_OUT))
        ) as unknown[][];

        expect(batches.map((batch) => batch.length)).toEqual([DEFAULT_PARALLEL_MAX_FAN_OUT]);
      });

      it.each([
        ['an empty array', []],
        ['null', null],
        ['no hits at all', undefined],
      ])('does not invent a batch when the read returned %s', (_name, attackDiscoveries) => {
        expect(evaluate(String(resolve?.with?.batches), contextFor(attackDiscoveries))).toEqual([]);
      });

      it('requests a review for every discovery in an oversized generation', () => {
        const attackCount = evaluate(
          String(resolve?.with?.attack_count),
          contextFor(discoveries(overflowCount))
        );

        expect(
          evaluate(String(stepIn(workerSteps, 'emit_result')?.with?.reviews_requested), {
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
      expect(parallel?.concurrency?.max).toBeGreaterThan(0);
    });

    it('sets parallel concurrency within the schema ceiling', () => {
      expect(parallel?.concurrency?.max).toBeLessThanOrEqual(20);
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

    // Generation now comes from the batched child, which emits persisted alert
    // `_source` documents. Their discovery fields are namespaced AND written as
    // flat dotted keys, so a dotted-path read resolves to empty and every review
    // would be dispatched with no title and no alert ids -- silently, because the
    // review steps are stubs and an empty title still satisfies `required`.
    // Rendering against the real `_source` shape is what makes this a real check;
    // asserting the template text alone would not catch the shape mismatch.
    describe('per-attack review inputs', () => {
      const liquidEngine = createWorkflowLiquidEngine();
      // Exactly what `transform_to_alert_documents` writes.
      const persistedAttack = {
        'kibana.alert.attack_discovery.title': 'Suspicious lateral movement',
        'kibana.alert.attack_discovery.alert_ids': ['alert-1', 'alert-2'],
        'kibana.alert.attack_discovery.summary_markdown': 'A **summary**',
        'kibana.alert.uuid': 'attack-hash-1',
      };

      const render = (template: unknown) =>
        liquidEngine.parseAndRender(
          String(template).replace(/^\$\{\{(.*)\}\}$/s, '{{$1| json }}'),
          {
            foreach: { item: persistedAttack },
          }
        );

      // The bulk create indexes each candidate under `kibana.alert.uuid`, so the
      // `_source` field and the document `_id` are the same value and the runner
      // needs no second index read to recover it. Everything the review does to
      // the attack — the by-reference attachment and every `setAttackStatus`
      // write — keys on `attack_discovery_id`.
      it.each([
        ['title', 'Suspicious lateral movement'],
        ['alert_ids', '["alert-1","alert-2"]'],
        ['summary_markdown', 'A **summary**'],
        ['attack_discovery_id', 'attack-hash-1'],
      ])('resolves %s against a persisted attack document', async (field, expected) => {
        await expect(render(branchInputs[field])).resolves.toBe(expected);
      });

      // `${{ }}` preserves the array type; `{{ }}` would stringify it.
      it('passes alert_ids as a typed array rather than a string', () => {
        expect(String(branchInputs.alert_ids).startsWith('${{')).toBe(true);
      });

      // The anonymized fields, matching what the previous inline handover passed.
      // De-anonymizing reviews is a behaviour change owned by #19022 / #19211.
      it.each(['title', 'alert_ids', 'summary_markdown'])(
        'reads the anonymized %s, not its _with_replacements twin',
        (field) => {
          expect(String(branchInputs[field])).not.toContain('with_replacements');
        }
      );
    });

    it('passes autonomy through as a typed enum', () => {
      expect(branchInputs.autonomy).toBe('${{ inputs.autonomy }}');
    });

    // The runner only forwards the value, so a level it accepts that the review rejects
    // fails validation on the child rather than on the input that supplied it.
    it('accepts exactly the autonomy levels the review accepts', () => {
      expect(worker.triggers?.[0]?.inputs?.properties?.autonomy?.enum).toEqual(
        review.triggers?.[0]?.inputs?.properties?.autonomy?.enum
      );
    });

    // The handover `id` is the LLM UUID, not the persisted ES `_id`. Passing it
    // would give the review an identifier that resolves to nothing.
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

    it('requests a review for every persisted attack', () => {
      expect(stepIn(workerSteps, 'emit_result')?.with?.reviews_requested).toContain(
        'steps.resolve_fanout.output.attack_count'
      );
    });

    // dej611 on elastic/kibana#290732 asked whether `reviews_requested` is worth
    // reporting when it can never disagree with `attacks_generated`. On merged
    // main he was right: both read `resolve_fanout`. These four assertions are
    // the fix, and they exist to stop the two collapsing back onto one source.
    describe('generation and dispatch counts measure different things', () => {
      const emit = stepIn(workerSteps, 'emit_result');

      it('sources attacks_generated from the pre-persist count', () => {
        expect(emit?.with?.attacks_generated).toContain(
          'steps.run_generation.output.discoveries_generated'
        );
      });

      // `attack_discoveries` is the child's read-back of what PERSISTED, so
      // sizing it would measure dispatch a second time under a generation name.
      it('does not size attacks_generated off the persisted discoveries', () => {
        expect(emit?.with?.attacks_generated).not.toContain('attack_discoveries');
      });

      it('does not source attacks_generated from the fan-out', () => {
        expect(emit?.with?.attacks_generated).not.toContain('resolve_fanout');
      });

      it('does not source reviews_requested from the run step', () => {
        expect(emit?.with?.reviews_requested).not.toContain('run_generation');
      });
    });

    // `init_review_counts` seeds the variable and each batch adds to it, so the
    // output has to read the accumulator rather than a copy of it.
    it('reports the accumulated failed-review count', () => {
      expect(stepIn(workerSteps, 'emit_result')?.with?.reviews_failed).toContain(
        'variables.reviews_failed'
      );
    });
  });

  describe('review workflow', () => {
    const verdictSwitch = stepIn(reviewSteps, 'apply_verdict');
    const caseStep = (match: string) =>
      (verdictSwitch?.cases ?? []).find((c) => c.match === match)?.steps[0];

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

    it('switches on the stub verdict', () => {
      expect(verdictSwitch?.expression).toContain('inputs.stub_verdict');
    });

    // #19276 AC1. A default run then exercises the escalation path, the same one
    // true_positive takes.
    it('defaults the stub verdict from consts.default_verdict', () => {
      expect(verdictSwitch?.expression).toContain('default: consts.default_verdict');
    });

    it('defaults consts.default_verdict to inconclusive', () => {
      expect(review.consts?.default_verdict).toBe('inconclusive');
    });

    it('names the inconclusive branch promote_inconclusive_per_autonomy', () => {
      expect(caseStep('inconclusive')?.name).toBe('promote_inconclusive_per_autonomy');
    });

    it('stubs the inconclusive branch as a console step', () => {
      expect(caseStep('inconclusive')?.type).toBe('console');
    });

    it('routes inconclusive onto the Promote-to-Incident path', () => {
      expect(caseStep('inconclusive')?.with?.message).toContain('Promote-to-Incident');
    });

    it('does not tag inconclusive for a downstream worker', () => {
      expect(caseStep('inconclusive')?.with?.message).not.toContain('tagging');
    });

    it('exposes every verdict as an input so all branches stay reachable', () => {
      expect(review.triggers?.[0]?.inputs?.properties?.stub_verdict?.enum).toEqual([...VERDICTS]);
    });

    // #19214 replaces the four-arm console `apply_verdict`. Until then the skeleton
    // switch stays, including the stale "Promote-to-Incident" copy. `run_fp_tp_analysis`
    // stays a console until #19211.
    it('leaves apply_verdict as console stubs pending #19214', () => {
      expect(
        reviewSteps.filter((step) => step.type === 'console').map((step) => step.name)
      ).toEqual([
        'run_fp_tp_analysis',
        'report_unknown_verdict',
        'close_as_false_positive',
        'promote_per_autonomy',
        'promote_inconclusive_per_autonomy',
        'record_analysis_failure',
      ]);
    });

    it.each([
      ['resolve_investigation_id', 'data.set'],
      ['open_investigation', 'ai.conversation.create'],
      ['verify_investigation', 'ai.conversation.metadata.read'],
      ['attach_discovery', 'ai.attachment.add'],
      ['attach_alerts', 'foreach'],
      ['attach_alert_batch', 'ai.attachment.add'],
      ['verify_evidence', 'ai.attachment.read'],
      ['attach_verdict', 'ai.attachment.add'],
    ] as const)('implements %s as a real %s step', (name, type) => {
      expect(stepIn(reviewSteps, name)?.type).toBe(type);
    });

    it('still stubs run_fp_tp_analysis pending #19211', () => {
      expect(stepIn(reviewSteps, 'run_fp_tp_analysis')?.type).toBe('console');
    });

    describe('the Investigation', () => {
      const open = stepIn(reviewSteps, 'open_investigation');

      it('applies the investigation template', () => {
        expect(open?.with?.template_id).toBe('investigation');
      });

      // A Worker-private Investigation is invisible to the analysts it exists for.
      it('is readable by anyone in the space', () => {
        expect((open?.with?.access_control as { access_mode?: string })?.access_mode).toBe(
          'public'
        );
      });

      // A re-review of the same attack derives the same `conversation_id`, and
      // `ai.conversation.create` indexes with `op_type: 'create'`, so the second
      // create 409s. That 409 is the expected outcome, not a failure — it is what
      // proves the first Investigation is still the only one. `verify_investigation`
      // below is what keeps a GENUINE create failure fatal.
      it('continues past a 409 from a re-review', () => {
        expect(open?.['on-failure']).toEqual({ continue: true });
      });

      // The RUNNER's execution, which is the only record of which attacks came out of
      // one Worker run. This review's own `execution.id` is unique per attack, so
      // recording it here would group nothing and quietly break the telemetry that
      // reads this field.
      it('records the Worker run that produced it, not its own execution', () => {
        const metadata = open?.with?.metadata as Record<string, string> | undefined;

        expect(metadata?.workflow_execution_id).toBe('{{ inputs.parent_run_id }}');
      });

      // #19022 asks for the narrative on the Investigation itself, not only in an
      // attachment, so it is readable without resolving anything.
      it('seeds the attack narrative into summary', () => {
        const metadata = open?.with?.metadata as Record<string, string> | undefined;

        expect(metadata?.summary).toBe('{{ inputs.summary_markdown }}');
      });

      // kibana-q0t5. The Investigation id is a pure function of the attack, so every
      // execution that reviews the same attack addresses the same Investigation.
      // Nothing downstream may read the id back off the create: on a re-review that
      // step 409s and produces no output.
      it('addresses the Investigation by the id derived from the attack', () => {
        expect(open?.with?.conversation_id).toBe(derivedInvestigationId);
      });

      it('derives that id from the attack, not from the execution', () => {
        expect(asWith(stepIn(reviewSteps, 'resolve_investigation_id')).investigation_id).toContain(
          'inputs.attack_discovery_id'
        );
      });

      // `ai.conversation.create` types `conversation_id` as `z.uuid()`, which enforces
      // the RFC 9562 version and variant nibbles. `attack_discovery_id` is a SHA-256
      // hex, so a raw 8-4-4-4-12 slice of it satisfies that only about one time in
      // eight. Both nibbles are forced instead, making this a UUIDv8 — the version
      // reserved for ids derived from custom data. Rendered here rather than asserted
      // as a string, because what matters is the value the engine produces.
      it('derives an id the create step will accept', async () => {
        expect(z.uuid().safeParse(await renderInvestigationId(AN_ATTACK_ID)).success).toBe(true);
      });

      it('derives the same id every time for one attack', async () => {
        expect(await renderInvestigationId(AN_ATTACK_ID)).toBe(
          await renderInvestigationId(AN_ATTACK_ID)
        );
      });

      it('derives a different id for a different attack', async () => {
        expect(await renderInvestigationId(AN_ATTACK_ID)).not.toBe(
          await renderInvestigationId(ANOTHER_ATTACK_ID)
        );
      });

      it('leaves no step reading the conversation id back off the create', () => {
        expect(
          reviewSteps.filter((step) =>
            JSON.stringify(step.with ?? {}).includes('open_investigation.output')
          )
        ).toEqual([]);
      });

      it('does not re-fetch the Attack Discovery from the ad-hoc index', () => {
        expect(reviewSteps.filter((step) => step.type === 'elasticsearch.search')).toEqual([]);
      });

      it('does not run an agent against the Investigation', () => {
        expect(reviewSteps.filter((step) => step.type === 'ai.agent')).toEqual([]);
      });

      // kibana-d7aa: uniqueness is the persist 409 on the attack hash, not a
      // review-side lookup. A regrouped alert set, and Kibana scheduled AD vs this
      // Worker (`ownerId` differs; `generation_source` is not passed yet), are
      // intentional producer splits.
      it('derives the Investigation id first, with no lookup before it', () => {
        expect(review.steps.map((step) => step.name).slice(0, 2)).toEqual([
          'resolve_investigation_id',
          'open_investigation',
        ]);
      });
    });

    // `open_investigation` can no longer fail the review on its own: a 409 from a
    // re-review has to continue. This read is what restores the hard stop, so a
    // create that failed for any other reason still ends the run before anything
    // tries to attach to an Investigation that is not there.
    describe('the Investigation guard', () => {
      const verify = stepIn(reviewSteps, 'verify_investigation');

      it('reads the Investigation the review will write to', () => {
        expect(verify?.type).toBe('ai.conversation.metadata.read');
      });

      it('reads it by the derived id', () => {
        expect(verify?.with?.conversation_id).toBe(derivedInvestigationId);
      });

      it('fails the review when the Investigation is not there', () => {
        expect(verify?.['on-failure']).toBeUndefined();
      });

      it('runs before anything attaches to the Investigation', () => {
        expect(reviewStepNames.indexOf('verify_investigation')).toBeLessThan(
          reviewStepNames.indexOf('attach_discovery')
        );
      });
    });

    // The same split the Investigation guard above makes, applied to the evidence: the
    // adds have to continue past the 409 a re-review raises, which also swallows a
    // genuine failure, so the discovery is read back to tell the two apart. Without it
    // a review that attached nothing would journal that it attached evidence and then
    // publish a verdict about evidence that is not there.
    describe('the evidence guard', () => {
      const verify = stepIn(reviewSteps, 'verify_evidence');

      it('reads the discovery attachment back', () => {
        expect(verify?.type).toBe('ai.attachment.read');
      });

      it('reads the fixed discovery attachment id', () => {
        expect(verify?.with?.attachment_id).toBe('attack-discovery');
      });

      it('reads from the derived Investigation', () => {
        expect(verify?.with?.conversation_id).toBe(derivedInvestigationId);
      });

      it('fails the review when the discovery attachment is not there', () => {
        expect(verify?.['on-failure']).toBeUndefined();
      });

      it('runs after the evidence attaches', () => {
        expect(reviewStepNames.indexOf('verify_evidence')).toBeGreaterThan(
          reviewStepNames.indexOf('attach_alerts')
        );
      });

      // Both claims the guard exists to protect: the journal note and the verdict.
      it.each(['journal_evidence_attached', 'run_fp_tp_analysis', 'attach_verdict'])(
        'runs before %s',
        (name) => {
          expect(reviewStepNames.indexOf('verify_evidence')).toBeLessThan(
            reviewStepNames.indexOf(name)
          );
        }
      );

      // The alert batches stay best-effort: the discovery carries the full `alert_ids`
      // set, so a lost batch is a lost convenience rather than lost evidence.
      it('does not require the alert batches', () => {
        expect(JSON.stringify(verify?.with)).not.toContain('correlated-alerts');
      });
    });

    describe('attachments', () => {
      const attachments = reviewSteps.filter((step) => step.type === 'ai.attachment.add');

      // Evidence goes on as attachments, never as chat messages: a message would
      // wake the agent on a conversation the Worker is only writing to.
      it('adds exactly three attachments', () => {
        expect(attachments).toHaveLength(3);
      });

      // Every one domain-typed. A generic `text` attachment would carry the verdict
      // as prose, leaving nothing for a reader to branch on.
      it('attaches the discovery, its alerts, and the verdict', () => {
        expect(attachments.map((step) => step.with?.type)).toEqual([
          'security.attack_discovery',
          'security.alerts',
          'security.attack_discovery.verdict',
        ]);
      });

      // The heading and the narrative are rendered by the type from these fields, so
      // the workflow passes the verdict as an enum rather than as assembled markdown.
      it('passes the verdict as structured data rather than a markdown blob', () => {
        expect(stepIn(reviewSteps, 'attach_verdict')?.with?.data).toEqual({
          summary_markdown: '{{ inputs.summary_markdown }}',
          verdict: '{{ inputs.stub_verdict | default: consts.default_verdict }}',
        });
      });

      // By reference: the type resolves the discovery out of the ad-hoc index at
      // add time, so nothing has to be copied through the workflow.
      it('attaches the discovery by reference to its persisted document id', () => {
        expect(stepIn(reviewSteps, 'attach_discovery')?.with?.origin).toBe(
          '{{ inputs.attack_discovery_id }}'
        );
      });

      it('renders the discovery inline in the Investigation transcript', () => {
        expect(stepIn(reviewSteps, 'attach_discovery')?.with?.render_inline).toBe(true);
      });

      it('attaches the discovery before FP/TP analysis', () => {
        expect(reviewStepNames.indexOf('attach_discovery')).toBeLessThan(
          reviewStepNames.indexOf('run_fp_tp_analysis')
        );
      });

      // Reversed once the verdict got a client renderer: `render_inline` decides whether
      // the UI shows the attachment when the Investigation is opened, and shows nothing of
      // the sort for a type with no renderer. It is not a chat message and does not wake
      // the agent, so it is not a substitute comment — the journal is the narrative
      // surface, and the conclusion is what an analyst opens the Investigation to read.
      it('renders the verdict inline in the Investigation transcript', () => {
        expect(stepIn(reviewSteps, 'attach_verdict')?.with?.render_inline).toBe(true);
      });

      it('does not pass by-value data for the by-reference attachment', () => {
        expect(stepIn(reviewSteps, 'attach_discovery')?.with?.data).toBeUndefined();
      });

      // `security.alerts` caps `alertIds` at ALERTS_BATCH_MAX_SIZE, and an
      // oversized batch does not truncate — it fails validation, which under
      // `on-failure: continue` attaches nothing at all. So the chunk size is
      // load-bearing, not a tuning knob.
      it('batches the alert ids to the size the attachment schema accepts', () => {
        expect(review.consts?.alerts_per_attachment).toBe(20);
      });

      it('chunks the alert ids by that batch size', () => {
        expect(stepIn(reviewSteps, 'attach_alerts')?.foreach).toBe(
          '{{ inputs.alert_ids | default: consts.no_alert_ids | chunk: consts.alerts_per_attachment }}'
        );
      });

      // `${{ }}` preserves the array type; `{{ }}` would stringify the batch.
      it('attaches each batch as a typed array', () => {
        expect(
          (stepIn(reviewSteps, 'attach_alert_batch')?.with?.data as { alertIds?: string })?.alertIds
        ).toBe('${{ foreach.item }}');
      });

      // Written after the analysis so it reflects the result, and separate from the
      // evidence so the conclusion is visible apart from what it was drawn from.
      it('writes the verdict attachment after the analysis step', () => {
        expect(reviewStepNames.indexOf('attach_verdict')).toBeGreaterThan(
          reviewStepNames.indexOf('run_fp_tp_analysis')
        );
      });

      // Fixed ids so a retry against the SAME conversation 409s rather than
      // appending. They do not replace. The batch id is fixed per position, which
      // is the most a loop can promise.
      it('gives every attachment a fixed id', () => {
        expect(attachments.map((step) => step.with?.id)).toEqual([
          'attack-discovery',
          'correlated-alerts-{{ foreach.index }}',
          'analysis-verdict',
        ]);
      });

      // Losing one piece of evidence is not a reason to abandon the review that
      // produced it.
      it('continues past a failed attachment', () => {
        expect(attachments.map((step) => step['on-failure']?.continue)).toEqual([true, true, true]);
      });
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
        expect(stepIn(workerSteps, 'emit_result')?.with?.[name]).toEqual(
          expect.stringMatching(/^\{\{/)
        );
      }
    );

    it('echoes the schedule interval so a run records the cadence that launched it', () => {
      expect(stepIn(workerSteps, 'emit_result')?.with?.schedule_interval).toContain(
        'inputs.schedule_interval'
      );
    });

    it('reports the generation execution_uuids so a run can be traced to its discoveries', () => {
      expect((worker.outputs ?? []).map((output) => output.name)).toContain('execution_uuids');
    });

    // The Attack Discovery generation ids from the generation step, not this
    // workflow's execution id: each keys the AD generations API and the persisted
    // discoveries of its batch. Plural because generation is batched 1:N.
    it('takes execution_uuids from the generation step rather than the workflow execution', () => {
      expect(stepIn(workerSteps, 'emit_result')?.with?.execution_uuids).toContain(
        'steps.run_generation.output.execution_uuids'
      );
    });

    it.each(['investigation_opened', 'title', 'verdict'])('returns %s from each review', (name) => {
      expect((review.outputs ?? []).map((output) => output.name)).toContain(name);
    });

    // Sourced from the guard rather than from the create: the create now continues
    // past the 409 a re-review produces, so its output is empty on exactly the runs
    // where the Investigation does exist. `verify_investigation` has no `on-failure`,
    // so reaching `emit_result` at all means the read succeeded. The value does not
    // depend on the verdict or on autonomy — the Investigation is opened before
    // either is known.
    it('asserts investigation_opened from the Investigation it verified', () => {
      expect(stepIn(reviewSteps, 'emit_result')?.with?.investigation_opened).toBe(
        '${{ steps.verify_investigation.output.metadata != null }}'
      );
    });

    it.each(['attack_discovery_id', 'investigation_id'])(
      'returns %s from each review so the worker can trace what it did',
      (name) => {
        expect((review.outputs ?? []).map((output) => output.name)).toContain(name);
      }
    );
  });

  describe('input bounds', () => {
    it.each([
      ['worker', worker],
      ['review', review],
      ['journal note', journalNote],
    ])('%s declares at least one input', (_name, workflow) => {
      expect(Object.keys(workflow.triggers?.[0]?.inputs?.properties ?? {}).length).toBeGreaterThan(
        0
      );
    });

    it.each([
      ['worker', worker],
      ['review', review],
      ['journal note', journalNote],
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
      ['journal note', journalNote],
    ])('%s stays manual-only so the Watch Floor worker owns the schedule', (_name, workflow) => {
      expect((workflow.triggers ?? []).map((trigger) => trigger.type)).toEqual(['manual']);
    });
  });

  describe('the Investigation journal helper', () => {
    const append = stepIn(journalNoteSteps, 'append_note');
    const request = append?.with?.request as
      | { body?: { trigger_mode?: string }; path?: string }
      | undefined;

    it('POSTs the chat converse route, not the agent_builder converse route', () => {
      expect(request?.path).toContain('/api/chat/converse');
    });

    it('prefixes the converse path with the executing space', () => {
      expect(request?.path).toContain('/s/{{ workflow.spaceId }}/');
    });

    it('persists a user_message without running the agent', () => {
      expect(request?.body?.trigger_mode).toBe('never');
    });

    it('continues when the converse call fails', () => {
      expect(append?.['on-failure']?.continue).toBe(true);
    });

    it('is installed with the Attack Discovery workflows so Review can execute it', () => {
      expect(ALERTZERO_ATTACK_DISCOVERY_WORKFLOW_IDS).toContain(ALERTZERO_JOURNAL_NOTE_WORKFLOW_ID);
    });
  });

  describe('the Investigation journal', () => {
    // host steps, so the last five land with #19214's verdict switch and gate.
    const reviewJournal = journalExecutes(reviewSteps);

    const INFLECTIONS = [
      'journal_review_started',
      'journal_evidence_attached',
      'journal_analysis_started',
      'journal_analysis_finished',
    ] as const;

    it('points journal executes at the helper id', () => {
      expect(review.consts?.journal_note).toBe(ALERTZERO_JOURNAL_NOTE_WORKFLOW_ID);
    });

    it('calls the journal helper at each agreed inflection', () => {
      expect(reviewJournal.map((step) => step.name)).toEqual([...INFLECTIONS]);
    });

    it.each(INFLECTIONS)('continues past a failed %s note', (name) => {
      expect(stepIn(reviewSteps, name)?.['on-failure']?.continue).toBe(true);
    });

    it('journals review started after the Investigation is verified', () => {
      expect(reviewStepNames.indexOf('journal_review_started')).toBeGreaterThan(
        reviewStepNames.indexOf('verify_investigation')
      );
    });

    it('journals review started before evidence attaches', () => {
      expect(reviewStepNames.indexOf('journal_review_started')).toBeLessThan(
        reviewStepNames.indexOf('attach_discovery')
      );
    });

    it('journals evidence after the alerts are attached', () => {
      expect(reviewStepNames.indexOf('journal_evidence_attached')).toBeGreaterThan(
        reviewStepNames.indexOf('attach_alerts')
      );
    });

    // An alert batch can fail its add and continue, so the note distinguishes the
    // discovery `verify_evidence` guarantees from the batches nothing checked.
    it('does not claim the alert batches landed', () => {
      expect(JSON.stringify(stepIn(reviewSteps, 'journal_evidence_attached')?.with)).toContain(
        'Attempted attachment of'
      );
    });

    it('journals analysis start before the FP/TP stub', () => {
      expect(reviewStepNames.indexOf('journal_analysis_started')).toBeLessThan(
        reviewStepNames.indexOf('run_fp_tp_analysis')
      );
    });

    it('journals analysis finished after the verdict attachment', () => {
      expect(reviewStepNames.indexOf('journal_analysis_finished')).toBeGreaterThan(
        reviewStepNames.indexOf('attach_verdict')
      );
    });

    it('does not add a HITL gate', () => {
      expect(reviewSteps.filter((step) => step.type === 'waitForApproval')).toEqual([]);
    });

    it('does not use per-event text attachments as fake comments', () => {
      expect(
        reviewSteps
          .filter((step) => step.type === 'ai.attachment.add' && step.with?.type === 'text')
          .map((step) => step.name)
      ).toEqual([]);
    });

    it('does not journal from the worker or the Watch Floor', () => {
      expect([...journalExecutes(workerSteps), ...journalExecutes(floorSteps)]).toEqual([]);
    });
  });

  // Overlapping runner runs are already cancelled by the floor / runner concurrency
  // policy. Sequential re-generation of the same attack is a #19022 Investigation
  // concern (and AD hash-dedup), not a per-attack concurrency key on this review.
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

  // Systemic guard, not a point fix. Three separate references to the batched
  // child's output went stale during this re-site (`title` / `alert_ids` /
  // `summary_markdown`, then `alerts_context_count` and `status`), each failing
  // silently: an unknown field renders empty rather than erroring, so nothing
  // downstream notices. Enumerating what the child actually emits and checking
  // every reference against it catches the whole class.
  describe('runner references to the batched generation child', () => {
    const childYaml = ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW.yaml;
    const child = parse(childYaml) as YamlWorkflow;
    const runnerYaml = ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW.yaml;

    const emitted = Object.keys(
      (child.steps ?? []).find(({ name }) => name === 'emit_result')?.with ?? {}
    );

    it('the child emits a non-empty output contract', () => {
      expect(emitted.length).toBeGreaterThan(0);
    });

    const referenced = [
      ...new Set(
        Array.from(
          runnerYaml.matchAll(/steps\.run_generation\.output\.([a-zA-Z_][a-zA-Z0-9_]*)/g),
          (match) => match[1]
        )
      ),
    ];

    it('references at least one field of the child output', () => {
      expect(referenced.length).toBeGreaterThan(0);
    });

    it('every steps.run_generation.output.<field> reference is a field the child emits', () => {
      expect(referenced.filter((field) => !emitted.includes(field))).toEqual([]);
    });
  });
});
