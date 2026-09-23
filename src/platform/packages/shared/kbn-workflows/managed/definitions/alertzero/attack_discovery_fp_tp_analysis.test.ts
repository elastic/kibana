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
import { buildFieldsZodValidator } from '../../../spec/lib/build_fields_zod_validator';
import { normalizeFieldsToJsonSchema } from '../../../spec/lib/field_conversion';
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
  // `ai.agent` step keys (coverage_review / rule_tuning_review pattern).
  'connector-id-by-feature'?: string;
  'plugin-id'?: string;
  'aggregate-by'?: string;
  'create-conversation'?: boolean;
  timeout?: string;
}

interface YamlWorkflow {
  steps: YamlStep[];
  tags?: string[];
  consts?: { supported_verdicts?: string[] };
  outputs?: {
    properties?: Record<string, { type?: string; maxLength?: number }>;
    required?: string[];
  };
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
const outputProperties = analysis.outputs?.properties ?? {};
const outputNames = Object.keys(outputProperties);

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
      expect(Object.values(outputProperties).filter(({ type }) => type == null)).toEqual([]);
    });

    // The two halves of the attachment. Declaring them `required` is what makes a
    // partial payload fail output validation instead of completing the run.
    it.each(['verdict', 'summary_markdown'] as const)('requires %s', (name) => {
      expect(analysis.outputs?.required).toContain(name);
    });

    // Optional by the attachment's own schema, and the analysis is allowed to have
    // no reasoning to record.
    it('leaves the rationale optional', () => {
      expect(analysis.outputs?.required).not.toContain('rationale_markdown');
    });

    // The caps the `security.attack_discovery.verdict` attachment enforces. They
    // are declarable only in this JSON Schema form: the legacy `- name:` array
    // conversion copies type, description and default and drops the rest, so a cap
    // written there would be silently ignored.
    it.each([
      ['summary_markdown', 8000],
      ['rationale_markdown', 50000],
    ] as const)('caps %s at the length the attachment accepts', (name, cap) => {
      expect(outputProperties[name]?.maxLength).toBe(cap);
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
        '${{ steps.resolve_analysis.output.rationale_markdown }}'
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

  // `workflow.output` validates the emitted values against the declared outputs
  // and FAILS the run when they do not match, so these run the declaration
  // through the engine's own validator rather than asserting on the YAML. What
  // this protects is the review: it cannot tell a partial payload from a complete
  // one, so it would pair a real verdict with the "analysis failed" summary it
  // substitutes for the missing half.
  describe('runtime validation of the emitted payload', () => {
    const validate = (payload: Record<string, unknown>) =>
      buildFieldsZodValidator(normalizeFieldsToJsonSchema(analysis.outputs)).safeParse(payload)
        .success;

    const complete = {
      verdict: 'inconclusive',
      summary_markdown: 'A summary',
      rationale_markdown: 'Some reasoning',
    };

    it('accepts a complete payload', () => {
      expect(validate(complete)).toBe(true);
    });

    it.each(['verdict', 'summary_markdown'] as const)('rejects a payload missing %s', (name) => {
      const { [name]: _omitted, ...partial } = complete;

      expect(validate(partial)).toBe(false);
    });

    // `emit_result` reads the rationale with `${{ }}`, which resolves an absent
    // value to `undefined` rather than `""`, so this is the shape a real run with
    // no rationale emits.
    it('accepts a payload with no rationale', () => {
      expect(validate({ ...complete, rationale_markdown: undefined })).toBe(true);
    });

    // An oversized value would otherwise complete the child and then fail
    // `attach_verdict`, which continues on failure — leaving `apply_verdict` to
    // close or escalate the attack with none of the evidence that justified it.
    it.each([
      ['summary_markdown', 8000],
      ['rationale_markdown', 50000],
    ] as const)('rejects a %s longer than the attachment accepts', (name, cap) => {
      expect(validate({ ...complete, [name]: 'x'.repeat(cap + 1) })).toBe(false);
    });

    it.each([
      ['summary_markdown', 8000],
      ['rationale_markdown', 50000],
    ] as const)('accepts a %s exactly at the cap', (name, cap) => {
      expect(validate({ ...complete, [name]: 'x'.repeat(cap) })).toBe(true);
    });
  });

  // The contract boundary that outlives the placeholder: it checks what `analyze`
  // produced, so whatever #19282 puts in its place is held to the same payload.
  describe('the payload guard', () => {
    const guard = stepIn('require_supported_verdict');

    // Evaluates the real expressions in order, exactly as the engine does: the
    // `data.set` computes validity, then the guard's `if` decides the branch.
    const guards = (verdict: unknown, summaryMarkdown: unknown): unknown => {
      const liquid = createWorkflowLiquidEngine();
      const evaluate = (expression: unknown, context: Record<string, unknown>): unknown =>
        liquid.evalValueSync(
          String(expression)
            .replace(/^\$\{\{/, '')
            .replace(/\}\}$/, '')
            .trim(),
          context
        );

      const payloadValid = evaluate(stepIn('check_payload')?.with?.payload_valid, {
        consts: analysis.consts,
        steps: { resolve_analysis: { output: { verdict, summary_markdown: summaryMarkdown } } },
      });

      return evaluate(guard?.if, {
        steps: { check_payload: { output: { payload_valid: payloadValid } } },
      });
    };

    // Failing rather than emitting: an unsupported verdict would otherwise reach
    // the review's switch, whose default arm does nothing at all.
    it('fails the run rather than emitting a payload it cannot stand behind', () => {
      expect(guard?.type).toBe('workflow.fail');
    });

    it.each(CLASSIFICATIONS)('stays out of the way for %s', (verdict) => {
      expect(guards(verdict, 'A summary')).toBe(false);
    });

    // The enum the declared output cannot carry, because the editor type-checks
    // `workflow.output` `with:` source text against it.
    it('fires on failed, which is an execution state rather than a classification', () => {
      expect(guards('failed', 'A summary')).toBe(true);
    });

    it('fires on a verdict outside the supported set', () => {
      expect(guards('false-positive', 'A summary')).toBe(true);
    });

    // `{{ }}` stringifies an absent value to `""`, which `required` accepts, so
    // the declared output alone would let this through.
    it('fires on an empty verdict', () => {
      expect(guards('', 'A summary')).toBe(true);
    });

    it('fires on an empty summary', () => {
      expect(guards('inconclusive', '')).toBe(true);
    });

    it('fires when the analysis produced nothing at all', () => {
      expect(guards(undefined, undefined)).toBe(true);
    });

    it('runs before the payload is emitted', () => {
      expect(stepNames.indexOf('require_supported_verdict')).toBeLessThan(
        stepNames.indexOf('emit_result')
      );
    });

    it('enforces exactly the classifications the analysis may return', () => {
      expect(analysis.consts?.supported_verdicts).toEqual([...CLASSIFICATIONS]);
    });

    // Emitting it would let an analysis claim an execution state as a
    // classification and be believed.
    it('does not let the analysis return the review-derived failed state', () => {
      expect(analysis.consts?.supported_verdicts).not.toContain('failed');
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

    // A metadata READ plus, since the real analysis, one `ai.agent` call — but on
    // the agent's OWN backing conversation, never this one: reading is fine,
    // posting or waking the Investigation agent is not.
    it('never targets the Investigation conversation', () => {
      const touchingInvestigation = steps.filter(
        (step) =>
          step.name !== 'load_investigation' &&
          JSON.stringify(step.with ?? {}).includes('inputs.investigation_id')
      );

      expect(touchingInvestigation).toEqual([]);
      expect(stepIn('load_investigation')?.with?.conversation_id).toBe(
        '{{ inputs.investigation_id }}'
      );
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

  // The real analysis body: bounded evidence, one tool-less `ai.agent` call on its
  // own conversation, and structured output read back through `resolve_analysis`.
  describe('the analysis body', () => {
    const analyze = stepIn('analyze');
    const schema = analyze?.with?.schema as
      | {
          type?: string;
          properties?: Record<
            string,
            {
              type?: string;
              enum?: string[];
              maxLength?: number;
              minimum?: number;
              maximum?: number;
            }
          >;
          required?: string[];
        }
      | undefined;

    it('classifies with one agent call', () => {
      expect(analyze?.type).toBe('ai.agent');
    });

    it('routes through the AlertZero agentic connector', () => {
      expect(analyze?.['connector-id-by-feature']).toBe('alertzero_agentic');
    });

    it('attributes cost to this workflow under the AlertZero parent', () => {
      expect(analyze?.['plugin-id']).toBe('alertzero_attack_discovery_fp_tp');
      expect(analyze?.['aggregate-by']).toBe('alertzero_parent');
    });

    // Its own backing conversation: against the Investigation's it would wake the
    // Investigation agent.
    it('runs on its own backing conversation', () => {
      expect(analyze?.['create-conversation']).toBe(true);
      expect(analyze?.with?.conversation_id).toBeUndefined();
    });

    // The evidence is pre-built and bounded, so the tool belt is dead weight and
    // prompt cost (the #292579 batching rationale).
    it('strips the tool belt the pre-built evidence does not need', () => {
      expect(analyze?.with?.configuration_overrides).toEqual({
        enable_elastic_capabilities: false,
        tools: [],
        skill_ids: [],
      });
    });

    it('bounds how long one agent call may run', () => {
      expect(analyze?.timeout).toBe('10m');
    });

    // An agent failure after the workflow retries degrades to `inconclusive` in
    // `resolve_analysis` rather than failing the run.
    it('continues past a failed agent call', () => {
      expect(analyze?.['on-failure']?.continue).toBe(true);
    });

    it('asks for a bounded structured verdict', () => {
      expect(schema?.type).toBe('object');
      expect(schema?.properties?.verdict?.enum).toEqual([...CLASSIFICATIONS]);
      expect(schema?.properties?.confidence?.minimum).toBe(0);
      expect(schema?.properties?.confidence?.maximum).toBe(1);
      expect(schema?.properties?.summary_markdown?.maxLength).toBe(8000);
      expect(schema?.properties?.rationale_markdown?.maxLength).toBe(50000);
      expect(schema?.required).toEqual(['verdict', 'summary_markdown']);
    });

    it('feeds the agent from the loaded document, not from caller input', () => {
      expect(JSON.stringify(stepIn('prepare_evidence')?.with)).not.toContain(
        'inputs.attack_discovery_id'
      );
    });

    it('gathers its evidence after both loads', () => {
      expect(stepNames.indexOf('prepare_evidence')).toBeGreaterThan(
        Math.max(
          stepNames.indexOf('load_attack_discovery'),
          stepNames.indexOf('load_investigation')
        )
      );
    });

    // `resolve_analysis` is the one place the agent result is interpreted.
    const resolve = stepIn('resolve_analysis');

    // An absent structured output IS `inconclusive`: the review cannot tell a
    // degradation from a classification, and `inconclusive` asserts nothing.
    it('degrades an absent structured output to inconclusive', async () => {
      await expect(
        createWorkflowLiquidEngine().parseAndRender(String(resolve?.with?.verdict), {
          consts: analysis.consts,
          steps: { analyze: { output: { structured_output: {} } } },
        })
      ).resolves.toBe('inconclusive');
    });

    it('passes a real verdict straight through', async () => {
      await expect(
        createWorkflowLiquidEngine().parseAndRender(String(resolve?.with?.verdict), {
          consts: analysis.consts,
          steps: { analyze: { output: { structured_output: { verdict: 'false_positive' } } } },
        })
      ).resolves.toBe('false_positive');
    });

    it('substitutes an honest summary when the agent returned none', async () => {
      await expect(
        createWorkflowLiquidEngine().parseAndRender(String(resolve?.with?.summary_markdown), {
          consts: analysis.consts,
          steps: { analyze: { output: { structured_output: {} } } },
        })
      ).resolves.toContain('could not reach a classification');
    });

    it('emits the agent summary when it has one', async () => {
      await expect(
        createWorkflowLiquidEngine().parseAndRender(String(resolve?.with?.summary_markdown), {
          consts: analysis.consts,
          steps: {
            analyze: {
              output: { structured_output: { summary_markdown: 'The correlation holds.' } },
            },
          },
        })
      ).resolves.toBe('The correlation holds.');
    });

    it('returns a classification the analysis is allowed to return', () => {
      expect(CLASSIFICATIONS).toContain('inconclusive');
    });

    it('stays inside the summary cap', () => {
      expect(String(resolve?.with?.summary_markdown).length).toBeLessThanOrEqual(8000);
    });
  });
});
