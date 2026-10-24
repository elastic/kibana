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
import { convertToWorkflowGraph } from '../../../graph/build_execution_graph/build_execution_graph';
import type { WorkflowYaml } from '../../../spec/schema';

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
  'connector-id-by-feature'?: string | string[];
  'create-conversation'?: boolean;
  'plugin-id'?: string;
  'aggregate-by'?: string;
  timeout?: string;
  mode?: string;
  foreach?: string;
  concurrency?: { max?: number };
  steps?: YamlStep[];
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

  // The nesting caveat in this file's header is why the raw tree is used for
  // structural assertions: strict-parse children are typed `BaseStepSchema`.
  // `parallel` itself must survive strict parsing as a step type in a managed
  // definition, so a schema regression to "parallel only inside authored
  // definitions" fails here rather than at managed-install time.
  // Schema-valid is not runnable: a workflow-level `on-failure.retry` wraps
  // parallel branch bodies in `enter-retry` nodes and `convertToWorkflowGraph`
  // throws (a branch body node may not have more than one out-edge), a class of
  // error the strict schema above passes and only `POST /run` would surface as
  // `Workflow is not valid.`. Build the real graph here so the gap fails jest.
  it('builds an executable graph', () => {
    expect(() =>
      convertToWorkflowGraph(
        parse(ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW.yaml) as unknown as WorkflowYaml
      )
    ).not.toThrow();
  });

  it('accepts a parallel fan-out step in the managed definition', () => {
    const result = WorkflowSchema.safeParse(
      parse(ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW.yaml)
    );

    expect(result.success).toBe(true);
    if (result.success) {
      const parsed = result.data as { steps?: Array<{ name?: string; type?: string }> };
      const fanOut = parsed.steps?.find((step) => step.name === 'load_events_per_alert');

      expect(fanOut?.type).toBe('parallel');
    }
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
        "${{ steps.keep_model_writeup.output.rows | where: 'keep', true | map: 'rationale_markdown' | first }}"
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

    // A missing privilege must fail the search. `ignore_unavailable` would turn
    // that 403 into zero hits and `require_attack_discovery` would report not-found.
    it('fails the run when the discovery search is not authorized', () => {
      expect(loadAttack?.with?.ignore_unavailable).toBeUndefined();
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
    // A workflow-level `on-failure.retry` wraps every step — including the bodies
    // of `load_events_per_alert`'s parallel branches — in `enter-retry` nodes, and
    // a parallel branch body cannot be retried (buildParallelBranchBody rejects
    // any node with more than one out-edge), so the graph never builds and every
    // run is rejected as invalid. Transient failures are handled per source: the
    // fan-out settles failed branches, `load_entities` continues on failure, and a
    // failed required source fails the run for the review to record.
    it('does not set a workflow-level on-failure the parallel fan-out cannot carry', () => {
      expect(analysis.settings?.['on-failure']).toBeUndefined();
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

    // A missing privilege must fail the search. `ignore_unavailable` would turn
    // that 403 into zero hits and `require_cited_alerts` would report missing alerts.
    it('fails the run when the alerts search is not authorized', () => {
      expect(stepIn('load_alerts')?.with?.ignore_unavailable).toBeUndefined();
    });

    it.each(['load_attack_discovery', 'load_alerts', 'load_entities'] as const)(
      'projects %s so the template payload stays inside the gateway cap',
      (name) => {
        expect(stepIn(name)?.with?._source).toEqual(expect.any(Array));
      }
    );

    it('projects the per-alert branch search so the template payload stays inside the gateway cap', () => {
      expect(stepIn('load_events_per_alert')?.steps?.[0]?.with?._source).toEqual(expect.any(Array));
    });

    it('keeps the alert fields the workflow expressions read', () => {
      expect(stepIn('load_alerts')?.with?._source).toEqual(
        expect.arrayContaining(['host.id', 'user.name', 'kibana.alert.original_time'])
      );
      expect(stepIn('load_attack_discovery')?.with?._source).toEqual(
        expect.arrayContaining(['@timestamp', 'kibana.alert.attack_discovery.alert_ids'])
      );
    });

    it.each(['load_entities'] as const)('continues when optional source %s fails', (name) => {
      expect(stepIn(name)?.['on-failure']?.continue).toBe(true);
    });

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

    it('prefers a saved template-row model, then the AlertZero frontier feature', () => {
      expect(analyze?.['connector-id-by-feature']).toEqual([
        'alertzero_template_models',
        'alertzero_frontier',
      ]);
    });

    it('uses the thin agent', () => {
      expect(analyze?.['agent-id']).toBe('alertzero-thin-agent');
    });

    it('finishes the agent inside the workflow timeout', () => {
      expect(analyze?.timeout).toBe('8m');
    });

    // The eval suite's verdict_rules.test.ts locks this block to FP_TP_VERDICT_RULES.
    it('keeps the managed verdict rules', () => {
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

    it('tells the agent a truncated entity or event list cannot clear the attack', () => {
      expect(String(analyze?.with?.message)).toContain(
        'A truncated entity or raw-event list is missing evidence and cannot clear an attack.'
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

    it('accepts a path of pivots as alert linkage', () => {
      expect(String(analyze?.with?.message)).toContain(
        'Report the strongest pivot; it does not decide the verdict.'
      );
    });

    it('allows agent.id and source.ip on the alert-link claim', () => {
      const schema = analyze?.with?.schema as {
        properties: {
          claims: {
            properties: { alert_link: { properties: { field: { enum: string[] } } } };
          };
        };
      };

      expect((analyze?.with?.schema as { required: string[] }).required).not.toContain('claims');

      expect(schema.properties.claims.properties.alert_link.properties.field.enum).toEqual([
        'user.name',
        'user.id',
        'host.id',
        'host.name',
        'process.entity_id',
        'process.pid',
        'agent.id',
        'source.ip',
      ]);
    });
  });

  describe('the raw-event window', () => {
    const fanOut = stepIn('load_events_per_alert');
    // The branch body is nested, so it is not in the top-level `steps` lookup.
    const branch = fanOut?.steps?.[0];

    // `foreach` evicts every non-latest iteration's output on loop exit
    // (`exit_foreach_node_impl.ts` → `evictStaleLoopOutputs`), so only the
    // `parallel` dynamic fan-out can hand downstream steps one hit list per
    // cited alert. This is the load-bearing engine choice of the design.
    it('fans out with a parallel step over the cited-alert hits', () => {
      expect(fanOut?.type).toBe('parallel');
      expect(fanOut?.foreach).toBe('${{ steps.load_alerts.output.hits.hits }}');
      expect(fanOut?.steps).toEqual([expect.objectContaining({ name: 'search_alert_window' })]);
    });

    // Raw events are an optional source, and a parallel branch body cannot
    // carry `on-failure` (rejected at build time). `settled` records a failed
    // branch in `results[].status` instead of failing the analysis.
    it('settles failed branches instead of failing the analysis', () => {
      expect(fanOut?.mode).toBe('settled');
      expect(branch?.['on-failure']).toBeUndefined();
    });

    it('bounds the ES fan-out with a concurrency cap', () => {
      expect(fanOut?.concurrency?.max).toBe(5);
    });

    it('searches one small branch window per cited alert', () => {
      expect(branch?.type).toBe('elasticsearch.search');
      expect(branch?.with?.size).toBe(10);
      expect(branch?.with?.index).toBe('logs-endpoint.events.*');
      expect(JSON.stringify(branch?.with?.sort)).toContain('asc');
    });

    // Both `should` arms must be keyed on `foreach.item` so one branch cannot
    // pull in another host's telemetry, and each range is anchored on that
    // alert's own original_time.
    it('keys every branch arm on its own alert and host', () => {
      const query = JSON.stringify(branch?.with?.query);

      expect(query).toContain('minimum_should_match');
      expect(query).toContain('"host.id":"{{ foreach.item._source.host.id }}"');
      expect(query).toContain(
        `{{ foreach.item._source['kibana.alert.original_time'] | default: steps.load_attack_discovery.output.hits.hits[0]._source['@timestamp'] }}||-2h`
      );
      expect(query).toContain(
        `{{ foreach.item._source['kibana.alert.original_time'] | default: steps.load_attack_discovery.output.hits.hits[0]._source['@timestamp'] }}||+2h`
      );
    });

    // Without the guard, an alert WITH a host.id also matches via its
    // host.name arm, pulling in every other host sharing that name. The
    // host.name term value renders only when the alert has no host.id, and
    // an empty-string term matches nothing.
    it('gates the host.name term on the alert having no host.id', () => {
      const arm = JSON.stringify(branch?.with?.query);

      expect(arm).toContain('{% if foreach.item._source.host.id == blank %}');
      expect(arm).toContain(
        '"host.name":"{% if foreach.item._source.host.id == blank %}{{ foreach.item._source.host.name }}{% endif %}"'
      );
    });

    it('renders the host.name term value only for an alert with no host.id', () => {
      const term = (item: Record<string, unknown>): string =>
        createWorkflowLiquidEngine().parseAndRenderSync(
          '{% if foreach.item._source.host.id == blank %}{{ foreach.item._source.host.name }}{% endif %}',
          { foreach: { item } }
        );

      expect(term({ _source: { host: { id: '', name: 'host-a' } } })).toBe('host-a');
      expect(term({ _source: { host: { name: 'host-a' } } })).toBe('host-a');
      expect(term({ _source: { host: { id: 'abc', name: 'host-a' } } })).toBe('');
    });

    it('tells the agent the window follows each cited alert', () => {
      expect(String(stepIn('analyze')?.with?.message)).toContain(
        'Raw events from a window around EACH cited alert'
      );
    });

    // `load_events` reassembles the branch outputs. `hits` renders as a JSON
    // array STRING (Liquid cannot build an array across a loop in one
    // expression), so every consumer must `json_parse` it. The render below
    // exercises the real loop: dedup by `_id`, skipping failed branches.
    describe('the reassembled hit list', () => {
      const branchResults = (...branches: Array<Record<string, unknown>>) =>
        branches.map((b, index) => ({ index, key: {}, status: 'completed', output: b, ...b }));

      const renderHits = (results: Array<Record<string, unknown>>): string =>
        createWorkflowLiquidEngine().parseAndRenderSync(String(stepIn('load_events')?.with?.hits), {
          consts: analysis.consts,
          steps: { load_events_per_alert: { output: { results } } },
        });

      it('flattens every completed branch, deduplicated by id', () => {
        expect(
          renderHits(
            branchResults(
              {
                hits: {
                  hits: [
                    { _id: 'a', v: 1 },
                    { _id: 'b', v: 2 },
                  ],
                },
              },
              {
                hits: {
                  hits: [
                    { _id: 'b', v: 2 },
                    { _id: 'c', v: 3 },
                  ],
                },
              }
            )
          )
        ).toBe('[{"_id":"a","v":1},{"_id":"b","v":2},{"_id":"c","v":3}]');
      });

      // The dedup marker is delimiter-anchored (`,<id>,`), so one id that is a
      // prefix of another must NOT be treated as already seen.
      it('keeps hits whose id is a prefix of another id', () => {
        expect(
          renderHits(
            branchResults({
              hits: {
                hits: [
                  { _id: 'a', v: 1 },
                  { _id: 'ab', v: 2 },
                ],
              },
            })
          )
        ).toBe('[{"_id":"a","v":1},{"_id":"ab","v":2}]');
      });

      it('is an empty array when no branch returned hits', () => {
        expect(renderHits(branchResults({ hits: { hits: [] } }))).toBe('[]');
      });

      it('is an empty array when the fan-out produced no results', () => {
        expect(renderHits([])).toBe('[]');
      });

      it('skips failed branches rather than failing the reassembly', () => {
        expect(
          renderHits([
            { index: 0, key: {}, status: 'failed', error: { message: 'down' } },
            {
              index: 1,
              key: {},
              status: 'completed',
              output: { hits: { hits: [{ _id: 'a' }] } },
            },
          ])
        ).toBe('[{"_id":"a"}]');
      });

      it('parses as JSON, which is what every consumer relies on', () => {
        expect(() =>
          JSON.parse(renderHits(branchResults({ hits: { hits: [{ _id: 'a' }, { _id: 'b' }] } })))
        ).not.toThrow();
      });
    });

    // `branches_truncated` is rendered by a loop, so it is the text "1"/"0"
    // and downstream gates compare against '1'. A branch whose own total
    // exceeded its size cap is genuinely-dropped evidence.
    describe('the per-branch truncation flag', () => {
      const renderFlag = (
        results: Array<{ status: string; output?: { hits: { total: { value: number } } } }>
      ): string =>
        createWorkflowLiquidEngine().parseAndRenderSync(
          String(stepIn('load_events')?.with?.branches_truncated),
          { steps: { load_events_per_alert: { output: { results } } } }
        );

      it('marks the fan-out truncated when any branch overflowed its own page', () => {
        expect(
          renderFlag([
            { status: 'completed', output: { hits: { total: { value: 3 } } } },
            { status: 'completed', output: { hits: { total: { value: 11 } } } },
          ])
        ).toBe('1');
      });

      it('stays clear when every branch page holds its window', () => {
        expect(
          renderFlag([{ status: 'completed', output: { hits: { total: { value: 10 } } } }])
        ).toBe('0');
      });

      it('ignores failed branches, whose totals are unknown', () => {
        expect(
          renderFlag([
            { status: 'failed' as const },
            { status: 'completed', output: { hits: { total: { value: 2 } } } },
          ])
        ).toBe('0');
      });
    });

    // `events_failed` reads the aggregate `failed` count of the fan-out: any
    // failed branch (settled mode records rather than raises) is the old
    // single-search failure.
    describe('the event-search failure flag', () => {
      const expression = String(stepIn('source_status')?.with?.events_failed)
        .replace(/^\$\{\{/, '')
        .replace(/\}\}$/, '')
        .trim();

      const evaluate = (failedCount: number): unknown =>
        createWorkflowLiquidEngine().evalValueSync(expression, {
          steps: { load_events: { output: { branches_failed: failedCount } } },
        });

      it('reports the failure when any branch failed', () => {
        expect(evaluate(1)).toBe(true);
      });

      it('reports no failure when every branch is clean', () => {
        expect(evaluate(0)).toBe(false);
      });
    });
  });

  describe('the truncation clear', () => {
    // Events truncation is per-branch: `load_events.branches_truncated`
    // is the loop-rendered text "1"/"0" for whether any per-alert branch
    // overflowed its own page. Entities stay a shared page with a total.
    const contextFor = (
      eventsTruncated: boolean | undefined,
      entities: number | undefined,
      verdict: string,
      summary: string
    ) => ({
      steps: {
        ...(eventsTruncated === undefined
          ? {}
          : { load_events: { output: { branches_truncated: eventsTruncated ? '1' : '0' } } }),
        ...(entities === undefined
          ? {}
          : { load_entities: { output: { hits: { total: { value: entities } } } } }),
        analyze: { output: { structured_output: { verdict, summary_markdown: summary } } },
      },
    });

    const render = (
      field: string,
      eventsTruncated: boolean | undefined,
      entities: number | undefined,
      verdict: string,
      summary: string
    ): string =>
      createWorkflowLiquidEngine().parseAndRenderSync(
        String(stepIn('block_truncated_clear')?.with?.[field]),
        contextFor(eventsTruncated, entities, verdict, summary)
      );

    const evaluate = (
      eventsTruncated: boolean | undefined,
      entities: number | undefined,
      verdict: string
    ): unknown => {
      const expression = String(stepIn('block_truncated_clear')?.with?.downgraded)
        .replace(/^\$\{\{/, '')
        .replace(/\}\}$/, '')
        .trim();

      return createWorkflowLiquidEngine().evalValueSync(
        expression,
        contextFor(eventsTruncated, entities, verdict, 'Cleared.')
      );
    };

    it('returns inconclusive when a truncated event branch would clear the attack', () => {
      expect(render('verdict', true, 10, 'false_positive', 'Cleared.')).toBe('inconclusive');
    });

    it('returns inconclusive when a truncated entity page would clear the attack', () => {
      expect(render('verdict', false, 51, 'false_positive', 'Cleared.')).toBe('inconclusive');
    });

    it('keeps false_positive when every matched event and entity is shown', () => {
      expect(render('verdict', false, 50, 'false_positive', 'Cleared.')).toBe('false_positive');
    });

    it('keeps true_positive when an event branch is truncated', () => {
      expect(render('verdict', true, 10, 'true_positive', 'Escalate.')).toBe('true_positive');
    });

    it('keeps true_positive when the entity page is truncated', () => {
      expect(render('verdict', false, 51, 'true_positive', 'Escalate.')).toBe('true_positive');
    });

    it('keeps false_positive when the entity query failed', () => {
      expect(
        createWorkflowLiquidEngine().parseAndRenderSync(
          String(stepIn('block_truncated_clear')?.with?.verdict),
          {
            steps: {
              load_events: { output: { branches_truncated: '0' } },
              load_entities: { error: { message: 'failed' } },
              analyze: {
                output: {
                  structured_output: { verdict: 'false_positive', summary_markdown: 'Cleared.' },
                },
              },
            },
          }
        )
      ).toBe('false_positive');
    });

    it('marks a truncated clear as downgraded', () => {
      expect(evaluate(false, 51, 'false_positive')).toBe(true);
    });

    it('does not mark a complete clear as downgraded', () => {
      expect(evaluate(false, 50, 'false_positive')).toBe(false);
    });

    it('replaces the summary when truncation blocks a clear', () => {
      expect(render('summary_markdown', true, 10, 'false_positive', 'Cleared.')).toBe(
        'Evidence was truncated, so this cannot be cleared as a false positive.'
      );
    });

    it('keeps the model summary when the clear stands', () => {
      expect(render('summary_markdown', false, 50, 'false_positive', 'Cleared.')).toBe('Cleared.');
    });

    it('runs after the payload guard and before emit', () => {
      expect(
        stepNames.slice(
          stepNames.indexOf('require_supported_verdict'),
          stepNames.indexOf('emit_result') + 1
        )
      ).toEqual([
        'require_supported_verdict',
        'block_truncated_clear',
        'check_claim_grounding',
        'block_ungrounded_claims',
        'keep_model_writeup',
        'emit_result',
      ]);
    });

    const writeup = (keep: boolean, rationale: string | undefined) => ({
      steps: {
        keep_model_writeup: {
          output: {
            rows: [
              {
                keep,
                ...(rationale === undefined ? {} : { rationale_markdown: rationale }),
                checks: [{ name: 'process_parent', result: 'contradicts' }],
                claims: { world: [{ id: 'event-1' }] },
              },
            ],
          },
        },
      },
    });

    const emitted = (field: string, keep: boolean, rationale?: string): unknown => {
      const expression = String(stepIn('emit_result')?.with?.[field])
        .replace(/^\$\{\{/, '')
        .replace(/\}\}$/, '')
        .trim();

      return createWorkflowLiquidEngine().evalValueSync(expression, writeup(keep, rationale));
    };

    it('emits the model rationale when the clear stands', () => {
      expect(emitted('rationale_markdown', true, 'Parent is a scheduler.')).toBe(
        'Parent is a scheduler.'
      );
    });

    it('omits the rationale when the clear was downgraded', () => {
      expect(emitted('rationale_markdown', false, 'Parent is a scheduler.')).toBeUndefined();
    });

    it('omits checks when the clear was downgraded', () => {
      expect(emitted('checks', false, 'Parent is a scheduler.')).toBeUndefined();
    });

    it('omits claims when the clear was downgraded', () => {
      expect(emitted('claims', false, 'Parent is a scheduler.')).toBeUndefined();
    });

    it('omits the payload rationale on the same path as the attachment', () => {
      const payload = stepIn('emit_result')?.with?.payload as { rationale_markdown?: string };

      expect(payload.rationale_markdown).toBe(stepIn('emit_result')?.with?.rationale_markdown);
    });
  });

  describe('ungrounded world claims', () => {
    const engine = createWorkflowLiquidEngine();

    const groundingContext = ({
      world,
      eventIds,
      entityIds,
      verdict,
    }: {
      world?: Array<{ source: string; id: string }>;
      eventIds: string[];
      entityIds: string[];
      verdict: string;
    }) => ({
      consts: { no_rows: [] as unknown[] },
      steps: {
        analyze: {
          output: {
            structured_output: {
              ...(world === undefined ? {} : { claims: { world } }),
            },
          },
        },
        load_events: {
          // `hits` is a loop-rendered JSON array STRING (see load_events), so
          // the grounding expression json_parses it before mapping ids.
          output: { hits: JSON.stringify(eventIds.map((id) => ({ _id: id }))) },
        },
        load_entities: {
          output: {
            hits: { hits: entityIds.map((id) => ({ _source: { entity: { id } } })) },
          },
        },
        block_truncated_clear: {
          output: { verdict, summary_markdown: 'Model summary.' },
        },
      },
    });

    const ungrounded = (context: Record<string, unknown>): string =>
      engine.parseAndRenderSync(String(stepIn('check_claim_grounding')?.with?.ungrounded), context);

    it('returns false when the cited raw-event id is in the hits', () => {
      expect(
        ungrounded(
          groundingContext({
            world: [{ source: 'raw_event', id: 'event-1' }],
            eventIds: ['event-1'],
            entityIds: [],
            verdict: 'true_positive',
          })
        )
      ).toBe('false');
    });

    it('returns true when a true positive cites a raw-event id that was not returned', () => {
      expect(
        ungrounded(
          groundingContext({
            world: [{ source: 'raw_event', id: 'copied-from-the-alert' }],
            eventIds: [],
            entityIds: [],
            verdict: 'true_positive',
          })
        )
      ).toBe('true');
    });

    it('returns true when a false positive cites an entity id that was not returned', () => {
      expect(
        ungrounded(
          groundingContext({
            world: [{ source: 'entity_store', id: 'missing-entity' }],
            eventIds: ['event-1'],
            entityIds: ['entity-1'],
            verdict: 'false_positive',
          })
        )
      ).toBe('true');
    });

    it('returns false when the model cited no world claims', () => {
      expect(
        ungrounded(
          groundingContext({
            eventIds: [],
            entityIds: [],
            verdict: 'true_positive',
          })
        )
      ).toBe('false');
    });

    it('returns false when the verdict is already inconclusive', () => {
      expect(
        ungrounded(
          groundingContext({
            world: [{ source: 'raw_event', id: 'copied-from-the-alert' }],
            eventIds: [],
            entityIds: [],
            verdict: 'inconclusive',
          })
        )
      ).toBe('false');
    });

    it('returns inconclusive when the grounding check downgrades the verdict', () => {
      expect(
        engine.parseAndRenderSync(String(stepIn('block_ungrounded_claims')?.with?.verdict), {
          steps: {
            check_claim_grounding: { output: { ungrounded: 'true' } },
            block_truncated_clear: { output: { verdict: 'true_positive' } },
          },
        })
      ).toBe('inconclusive');
    });

    it('returns the ungrounded summary when the grounding check downgrades the verdict', () => {
      expect(
        engine.parseAndRenderSync(
          String(stepIn('block_ungrounded_claims')?.with?.summary_markdown),
          {
            steps: {
              check_claim_grounding: { output: { ungrounded: 'true' } },
              block_truncated_clear: { output: { summary_markdown: 'Model summary.' } },
            },
          }
        )
      ).toBe('A cited world-check id is not in the evidence, so this cannot be classified.');
    });

    it('returns the model summary when every cited id was returned', () => {
      expect(
        engine.parseAndRenderSync(
          String(stepIn('block_ungrounded_claims')?.with?.summary_markdown),
          {
            steps: {
              check_claim_grounding: { output: { ungrounded: 'false' } },
              block_truncated_clear: { output: { summary_markdown: 'Model summary.' } },
            },
          }
        )
      ).toBe('Model summary.');
    });
  });
});
