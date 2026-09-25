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
  'agent-id'?: string;
  'connector-id-by-feature'?: string;
  'create-conversation'?: boolean;
  'plugin-id'?: string;
  'aggregate-by'?: string;
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

    it('requires the attack and accepts a run with no Investigation', () => {
      expect(trigger?.inputs?.required).toEqual(['attack_discovery_id']);
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

    // The prompt says "query failed", so the agent's message is the wrong place to
    // scan for the classification. The enum the agent is allowed to return is.
    it('does not let the agent return the review-derived failed state', () => {
      const schema = stepIn('analyze')?.with?.schema as {
        properties?: { verdict?: { enum?: string[] } };
      };

      expect(schema?.properties?.verdict?.enum).not.toContain('failed');
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
        '${{ steps.analyze.output.structured_output.rationale_markdown }}'
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
        steps: {
          analyze: {
            output: { structured_output: { verdict, summary_markdown: summaryMarkdown } },
          },
        },
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

    // A test can start from the attack alone. The review still passes the id when
    // it opened a conversation, and that read stays a required source.
    it.each([
      ['reads the Investigation when the caller names one', 'inv-1', true],
      ['skips the Investigation when the caller names none', undefined, false],
      ['skips the Investigation when the caller names a blank one', '', false],
    ] as const)('%s', (_label, investigationId, reads) => {
      const condition = String(stepIn('load_investigation')?.if)
        .replace(/^\$\{\{/, '')
        .replace(/\}\}$/, '')
        .trim();

      expect(
        createWorkflowLiquidEngine().evalValueSync(condition, {
          inputs: { investigation_id: investigationId },
        })
      ).toBe(reads);
    });

    // A metadata READ of the Investigation, and the analysis agent on its own
    // conversation. Posting to the Investigation, or running `ai.agent` against it,
    // wakes the Investigation agent.
    it('does not post to the Investigation', () => {
      expect(
        steps
          .filter((step) => step.type.startsWith('ai.') && step.name !== 'load_investigation')
          .map((step) => step.name)
      ).toEqual(['analyze']);
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
      expect(analysis.settings?.timeout).toBe('10m');
    });

    // A dropped run hands its synchronous caller an empty output, which the review
    // cannot tell apart from an exhausted-retry failure and would record as
    // `failed`. The review's own per-attack `drop max 1` already serializes this.
    it('leaves serialization to the review rather than dropping runs', () => {
      expect(analysis.settings?.concurrency).toBeUndefined();
    });
  });

  describe('the analysis body', () => {
    const analyze = stepIn('analyze');

    it('is not a console stub', () => {
      expect(steps.filter((step) => step.type === 'console')).toEqual([]);
    });

    it('gathers the cited alerts before the agent runs', () => {
      expect(stepNames.indexOf('require_cited_alerts')).toBeLessThan(stepNames.indexOf('analyze'));
    });

    it('fails the run when a cited alert is missing', () => {
      expect(stepIn('require_cited_alerts')?.type).toBe('workflow.fail');
    });

    it.each(['load_entities', 'load_events'] as const)(
      'continues when optional source %s fails',
      (name) => {
        expect(stepIn(name)?.['on-failure']?.continue).toBe(true);
      }
    );

    it('runs the agent on its own conversation', () => {
      expect(analyze?.['create-conversation']).toBe(true);
    });

    it('does not point the agent at the Investigation', () => {
      expect(JSON.stringify(analyze?.with)).not.toContain('investigation_id');
    });

    it('gives the agent no tools', () => {
      const overrides = analyze?.with?.configuration_overrides as { tools?: unknown[] };

      expect(overrides?.tools).toEqual([]);
    });

    it('routes the agent through the AlertZero reasoning feature', () => {
      expect(analyze?.['connector-id-by-feature']).toBe('alertzero_reasoning');
    });

    it('uses the thin agent', () => {
      expect(analyze?.['agent-id']).toBe('alertzero-thin-agent');
    });

    it('finishes the agent inside the workflow timeout', () => {
      expect(analyze?.timeout).toBe('8m');
    });

    // The first-match block is locked to the sample workflow's text, so the eval
    // suite's later retarget onto this YAML still passes.
    it('keeps the sample verdict rules', () => {
      const message = String(analyze?.with?.message);
      const [, rules = ''] =
        /Choose the verdict by the first rule that matches:\n([\s\S]*?)\n\s*\n/.exec(message) ?? [];

      expect(rules.replace(/\s+/g, ' ').trim()).toBe(
        `
        1. inconclusive — world checks both support and contradict; or you cannot cite
           an id from the hits below.
        2. false_positive — at least one world check contradicts, none supports, and
           both the entity store and the raw events have hits. Missing evidence cannot
           clear an alert: if either source is empty or its query failed, the verdict
           is inconclusive.
        3. true_positive — process_parent or network_destination supports and no world
           check contradicts. An empty or failed entity store does not block this.
           entity_role and alert_linkage corroborate but are never enough on their own.
        4. inconclusive — anything else: every world check is skipped or neutral, or
           only entity_role or alert_linkage supports.
        `
          .replace(/\s+/g, ' ')
          .trim()
      );
    });

    it('tells the agent a truncated event list cannot clear the attack', () => {
      expect(String(analyze?.with?.message)).toContain(
        'A truncated raw-event list is missing evidence and cannot clear an attack.'
      );
    });

    it('judges every network destination instead of one callout', () => {
      expect(String(analyze?.with?.message)).toContain(
        'One known-good callout does not cancel the rest.'
      );
    });

    it('does not treat a management role as a contradiction by itself', () => {
      expect(String(analyze?.with?.message)).toContain(
        'A management server, MDM, jump box, or service account is neutral, not contradicts'
      );
    });

    it('weighs the process parent with the cited alert severity', () => {
      expect(String(analyze?.with?.message)).toContain(
        'A risk score or severity on a cited alert weighs how strong that parent is.'
      );
    });
  });

  describe('the truncation clear', () => {
    const render = (field: string, total: number, verdict: string, summary: string): string =>
      createWorkflowLiquidEngine().parseAndRenderSync(
        String(stepIn('block_truncated_clear')?.with?.[field]),
        {
          steps: {
            load_events: { output: { hits: { total: { value: total } } } },
            analyze: { output: { structured_output: { verdict, summary_markdown: summary } } },
          },
        }
      );

    it('returns inconclusive when a truncated event page would clear the attack', () => {
      expect(render('verdict', 51, 'false_positive', 'Cleared.')).toBe('inconclusive');
    });

    it('keeps false_positive when every matched event is shown', () => {
      expect(render('verdict', 50, 'false_positive', 'Cleared.')).toBe('false_positive');
    });

    it('keeps true_positive when the event page is truncated', () => {
      expect(render('verdict', 51, 'true_positive', 'Escalate.')).toBe('true_positive');
    });

    it('replaces the summary when truncation blocks a clear', () => {
      expect(render('summary_markdown', 51, 'false_positive', 'Cleared.')).toBe(
        'Raw events were truncated, so this cannot be cleared as a false positive.'
      );
    });

    it('runs after the payload guard and before emit', () => {
      expect(
        stepNames.slice(
          stepNames.indexOf('require_supported_verdict'),
          stepNames.indexOf('emit_result') + 1
        )
      ).toEqual(['require_supported_verdict', 'block_truncated_clear', 'emit_result']);
    });
  });
});
