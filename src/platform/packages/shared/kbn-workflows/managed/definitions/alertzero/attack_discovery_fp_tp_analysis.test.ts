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
  ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW,
  ALERTZERO_ATTACK_DISCOVERY_WORKFLOW_IDS,
} from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils';
import { WorkflowSchema } from '../../../spec/schema';

/**
 * Classifications the analysis may return. `failed` is deliberately absent: it is
 * an execution state, never a classification, and the review derives it from the
 * absence of a payload rather than reading it out of one.
 */
const CLASSIFICATIONS = ['false_positive', 'true_positive', 'inconclusive'] as const;

// Describes the raw `parse(yaml)` tree rather than the schema's output, for the
// reason `attack_discovery_workflows.test.ts` spells out: every nesting construct
// types its children as `BaseStepSchema`, which strips `with` and `on-failure`.
interface YamlStep {
  name: string;
  type: string;
  if?: string;
  with?: Record<string, unknown>;
  'on-failure'?: { continue?: boolean; retry?: Record<string, unknown> };
}

interface YamlWorkflow {
  steps: YamlStep[];
  tags?: string[];
  outputs?: Array<{ name: string; type?: string }>;
  settings?: {
    timeout?: string;
    concurrency?: unknown;
    'on-failure'?: { retry?: { 'max-attempts'?: number } };
  };
  triggers?: Array<{
    type: string;
    inputs?: {
      properties?: Record<string, { type?: string; maxLength?: number }>;
      required?: string[];
      additionalProperties?: boolean;
    };
  }>;
}

const analysis = parse(ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW.yaml) as YamlWorkflow;
const review = parse(ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW.yaml) as YamlWorkflow;

const steps = analysis.steps;
const stepNames = steps.map((step) => step.name);
const stepIn = (name: string) => steps.find((step) => step.name === name);
const trigger = analysis.triggers?.[0];
const properties = trigger?.inputs?.properties ?? {};
const outputNames = (analysis.outputs ?? []).map((output) => output.name);

describe('Attack Discovery FP/TP analysis workflow', () => {
  it('registers under its expected id', () => {
    expect(ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW.id).toBe(
      ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID
    );
  });

  // The review calls it via `workflow.execute`, which resolves nothing if the
  // definition was never installed.
  it('installs with the Attack Discovery chain so the review can execute it', () => {
    expect(ALERTZERO_ATTACK_DISCOVERY_WORKFLOW_IDS).toContain(
      ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID
    );
  });

  // Managed install only runs lightweight validation, where `steps` is
  // `z.array(z.unknown())`, so an authoring error here would otherwise surface at
  // execution time rather than in CI.
  it('passes strict workflow schema validation', () => {
    const result = WorkflowSchema.safeParse(
      parse(ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW.yaml)
    );

    expect(result.success ? null : result.error.issues).toBeNull();
  });

  // Launched by the review, never on a schedule of its own.
  it('owns no trigger but the manual one', () => {
    expect((analysis.triggers ?? []).map(({ type }) => type)).toEqual(['manual']);
  });

  describe('the input contract', () => {
    // The whole input surface. Space comes from `workflow.spaceId`, this attempt's
    // identity from `execution.id`, and everything about the attack from the loaded
    // document — so no caller can hand this workflow a stale copy of any of them.
    it('takes exactly the attack and the Investigation', () => {
      expect(Object.keys(properties).sort()).toEqual(['attack_discovery_id', 'investigation_id']);
    });

    it('requires both', () => {
      expect((trigger?.inputs?.required ?? []).slice().sort()).toEqual([
        'attack_discovery_id',
        'investigation_id',
      ]);
    });

    it('rejects anything else the caller sends', () => {
      expect(trigger?.inputs?.additionalProperties).toBe(false);
    });

    // Unbounded string input is an unbounded-input exposure, and the review's own
    // inputs are all bounded for the same reason.
    it.each(['attack_discovery_id', 'investigation_id'] as const)('bounds %s', (name) => {
      expect(properties[name]?.maxLength).toBeGreaterThan(0);
    });

    // A value that passed validation at the review's trigger must not fail here.
    it('bounds the attack id to the same length the review takes', () => {
      expect(properties.attack_discovery_id?.maxLength).toBe(
        review.triggers?.[0]?.inputs?.properties?.attack_discovery_id?.maxLength
      );
    });
  });

  describe('the output contract', () => {
    // The analyst-facing payload, matching the `security.attack_discovery.verdict`
    // attachment the review writes it into.
    it.each(['verdict', 'summary_markdown', 'rationale_markdown'] as const)('emits %s', (name) => {
      expect(outputNames).toContain(name);
    });

    it('declares a type for every output', () => {
      expect((analysis.outputs ?? []).filter(({ type }) => type == null)).toEqual([]);
    });

    // `failed` is an execution state, never a classification: a timeout, a
    // permission failure, an unavailable required source or a tool error fails the
    // run, and the REVIEW maps that absence onto the attachment's `failed` verdict.
    it('never emits failed as a classification', () => {
      expect(JSON.stringify(stepIn('emit_result')?.with)).not.toContain('failed');
    });

    it('never sets failed as a classification anywhere in the workflow', () => {
      expect(JSON.stringify(stepIn('analyze')?.with)).not.toContain('failed');
    });

    // The only terminal step, so the failure path cannot reach it: a failed run
    // never emits a payload at all, which is what keeps `failed` out of the enum.
    it('terminalizes as completed', () => {
      expect(stepIn('emit_result')?.type).toBe('workflow.output');
    });

    // `${{ }}`, not `{{ }}`: the rationale is optional and `{{ }}` stringifies an
    // absent value to `""`, which the attachment's renderer would show as an empty
    // `## Rationale` section.
    it('keeps an absent rationale absent rather than empty', () => {
      expect(stepIn('emit_result')?.with?.rationale_markdown).toBe(
        '${{ steps.analyze.output.rationale_markdown }}'
      );
    });

    // Read back off the loaded document, not echoed from input, so the caller can
    // confirm the payload describes the attack it asked about. `_id` IS
    // `kibana.alert.uuid` for a persisted discovery, so the two are the same value.
    it('echoes the attack id from the document it loaded', async () => {
      await expect(
        createWorkflowLiquidEngine().parseAndRender(
          String(stepIn('emit_result')?.with?.attack_discovery_id),
          {
            steps: {
              load_attack_discovery: { output: { hits: { hits: [{ _id: 'attack-hash-1' }] } } },
            },
          }
        )
      ).resolves.toBe('attack-hash-1');
    });

    it('does not echo the attack id back from its input', () => {
      expect(String(stepIn('emit_result')?.with?.attack_discovery_id)).not.toContain('inputs.');
    });

    // Distinct attempts are distinguishable by their execution id alone, so no
    // attempt counter has to be carried.
    it('records which attempt produced the payload', () => {
      expect(stepIn('emit_result')?.with?.analysis_execution_id).toBe('{{ execution.id }}');
    });
  });

  describe('the authoritative loads', () => {
    const loadAttack = stepIn('load_attack_discovery');

    // Every attempt reads the document fresh, so a retry cannot analyse a copy that
    // went stale between attempts.
    it('loads the Attack Discovery rather than receiving it', () => {
      expect(loadAttack?.type).toBe('elasticsearch.search');
    });

    it('reads it from the space-scoped ad-hoc discovery index', () => {
      expect(loadAttack?.with?.index).toBe(
        '.adhoc.alerts-security.attack.discovery.alerts-{{ workflow.spaceId }}'
      );
    });

    // The persisted document is indexed UNDER `kibana.alert.uuid`, so `_id` is the
    // same value and needs no mapping to be queryable.
    it('reads it by the id it was given', () => {
      expect(loadAttack?.with?.query).toEqual({
        ids: { values: ['{{ inputs.attack_discovery_id }}'] },
      });
    });

    it('loads the Investigation rather than trusting that it exists', () => {
      expect(stepIn('load_investigation')?.type).toBe('ai.conversation.metadata.read');
    });

    // A metadata READ, and nothing else against this conversation: posting to it, or
    // running `ai.agent` against it, wakes the Investigation agent.
    it('writes nothing to the Investigation', () => {
      expect(
        steps.filter((step) => step.type.startsWith('ai.') && step.name !== 'load_investigation')
      ).toEqual([]);
    });

    // A required source, so a failure fails the run. Guessing a classification from
    // an attack nobody could read is what the failure contract forbids.
    it.each(['load_attack_discovery', 'load_investigation'] as const)(
      'fails the run when %s fails',
      (name) => {
        expect(stepIn(name)?.['on-failure']).toBeUndefined();
      }
    );

    it('loads both before analysing', () => {
      expect(
        Math.max(
          stepNames.indexOf('load_attack_discovery'),
          stepNames.indexOf('load_investigation')
        )
      ).toBeLessThan(stepNames.indexOf('analyze'));
    });
  });

  // A search that returns nothing SUCCEEDS, so the search step cannot catch this on
  // its own: an id naming no document is an unavailable required source dressed up
  // as an empty result.
  describe('the missing-attack guard', () => {
    const guard = stepIn('require_attack_discovery');

    // Evaluates the condition exactly as the engine will, so each assertion reads
    // the branch a real execution takes rather than the template source.
    const guards = (hitCount: number): unknown =>
      createWorkflowLiquidEngine().evalValueSync(
        String(guard?.if)
          .replace(/^\$\{\{/, '')
          .replace(/\}\}$/, '')
          .trim(),
        { steps: { load_attack_discovery: { output: { hits: { total: { value: hitCount } } } } } }
      );

    it('fails the run rather than analysing nothing', () => {
      expect(guard?.type).toBe('workflow.fail');
    });

    it('triggers on an empty result', () => {
      expect(guards(0)).toBe(true);
    });

    it('stays out of the way when the attack was found', () => {
      expect(guards(1)).toBe(false);
    });

    it('runs before anything reads the document', () => {
      expect(stepNames.indexOf('require_attack_discovery')).toBeLessThan(
        stepNames.indexOf('analyze')
      );
    });
  });

  describe('the failure contract', () => {
    // The built-in retries #19214 expects to have run before the review records a
    // failure. They live here rather than at the review's call site so a transient
    // failure is retried without the review knowing this workflow's internals.
    it('retries before giving up', () => {
      expect(analysis.settings?.['on-failure']?.retry?.['max-attempts']).toBeGreaterThan(1);
    });

    it('bounds how long an analysis may run', () => {
      expect(analysis.settings?.timeout).toBeDefined();
    });

    // A dropped run hands its synchronous caller an empty output, which the review
    // cannot tell apart from an exhausted-retry failure and would record as
    // `failed`. The review's own per-attack `drop max 1` already serializes this.
    it('leaves serialization to the review rather than dropping runs', () => {
      expect(analysis.settings?.concurrency).toBeUndefined();
    });
  });

  // #19282 replaces this with the analysis proper: the deterministic
  // pre-computation, the agent reasoning over those facts, and the deterministic
  // check on the claim it asserted. Until #19280 settles the criteria, the
  // placeholder returns the one classification that asserts nothing.
  describe('the placeholder analysis body', () => {
    const analyze = stepIn('analyze');

    it('returns inconclusive until the real analysis lands', () => {
      expect(analyze?.with?.verdict).toBe('inconclusive');
    });

    it('returns a classification the analysis is allowed to return', () => {
      expect(CLASSIFICATIONS).toContain(analyze?.with?.verdict);
    });

    // The attachment requires a summary, so an analyst is not left to infer that an
    // `inconclusive` verdict reflects analysis that ran.
    it('says the analysis has not been implemented', () => {
      expect(String(analyze?.with?.summary_markdown)).toContain('19282');
    });

    // The summary is capped at 8k by the attachment schema. The placeholder is
    // static, so this is measurable rather than a guess.
    it('stays inside the summary cap', () => {
      expect(String(analyze?.with?.summary_markdown).length).toBeLessThanOrEqual(8000);
    });

    // No rationale key at all: there is no reasoning to record, and the field is
    // optional.
    it('produces no rationale it cannot justify', () => {
      expect(analyze?.with?.rationale_markdown).toBeUndefined();
    });

    // Unlike the console stub it replaces, this one is part of the contract: the
    // review reads the payload back, so the shell has to produce a real one.
    it('is not a console stub', () => {
      expect(steps.filter((step) => step.type === 'console')).toEqual([]);
    });
  });
});
