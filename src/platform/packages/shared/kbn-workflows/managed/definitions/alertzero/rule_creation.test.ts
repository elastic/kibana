/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import { parse } from 'yaml';
import {
  ALERTZERO_ACTION_CREATE_RULE_WORKFLOW,
  ALERTZERO_ACTION_CREATE_RULE_WORKFLOW_ID,
  ALERTZERO_RULE_CREATION_WORKFLOW,
} from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils';
import { convertJsonSchemaToZod } from '../../../spec/lib/build_fields_zod_validator';
import { CREATE_PROPOSAL_WORKFLOW } from '../proposals';

interface YamlStep {
  name: string;
  type: string;
  if?: string;
  with?: Record<string, unknown>;
  'on-failure'?: { continue?: boolean };
}

interface YamlWorkflow {
  settings?: { timeout?: string };
  steps: YamlStep[];
  outputs?: Array<{ name: string }>;
  triggers?: Array<{
    inputs?: { properties?: Record<string, { type?: string; maxLength?: number }> };
  }>;
}

const worker = parse(ALERTZERO_RULE_CREATION_WORKFLOW.yaml) as YamlWorkflow;
const gate = parse(CREATE_PROPOSAL_WORKFLOW.yaml) as YamlWorkflow;
const action = parse(ALERTZERO_ACTION_CREATE_RULE_WORKFLOW.yaml) as YamlWorkflow;

const stepByName = (name: string) => worker.steps.find((step) => step.name === name);
const inputsOf = (step: YamlStep | undefined) =>
  (step?.with?.inputs ?? {}) as Record<string, unknown>;
const hours = (timeout: unknown) => Number(String(timeout).replace(/h$/, ''));
const emit = stepByName('emit_result')?.with as Record<string, string>;
const flagOf = (step: string, key: string) =>
  String((stepByName(step)?.with as Record<string, string>)[key]);

const evaluate = (expression: string, context: Record<string, unknown>): unknown => {
  const trimmed = expression.trim();
  return createWorkflowLiquidEngine().evalValueSync(trimmed.slice(3, -2).trim(), context);
};

const draftContext = (structured: Record<string, unknown>) => ({
  steps: { draft_creation: { output: { structured_output: structured } } },
});

describe('Detection Rule Creation worker', () => {
  describe('proposal gate', () => {
    // The decision lives on the investigation as a proposal, and the gate workflow
    // runs the create action as the approver. The worker never gates or creates.
    it('has no approval gate and creates nothing itself', () => {
      const types = worker.steps.map(({ type }) => type);
      expect(types).not.toContain('waitForApproval');
      expect(types).not.toContain('waitForInput');
      expect(types).not.toContain('security.createRule');
    });

    it('proposes the drafted rule through the create action', () => {
      const proposal = stepByName('propose_creation');
      expect(proposal?.type).toBe('workflow.execute');
      expect(proposal?.with?.['workflow-id']).toBe(CREATE_PROPOSAL_WORKFLOW.id);
      const inputs = inputsOf(proposal);
      expect(inputs.actionWorkflowId).toBe(ALERTZERO_ACTION_CREATE_RULE_WORKFLOW_ID);
      expect(inputs.actionInput).toBe('${{ steps.draft_creation.output.structured_output.rule }}');
      expect(inputs.autoApprove).toBe(false);
      // A failed or timed-out gate must not read as a decision.
      expect(proposal).not.toHaveProperty('on-failure');
    });

    // The action takes the drafted ES|QL request body whole and hands it to the API.
    it('hands the action an ES|QL body it passes through to the API', () => {
      const props = action.triggers?.[0]?.inputs?.properties as Record<
        string,
        {
          properties?: Record<string, Record<string, unknown>>;
          required?: string[];
          additionalProperties?: boolean;
        }
      >;
      expect(props.actionInput.properties?.type?.enum).toEqual(['esql']);
      expect(props.actionInput.properties?.language?.enum).toEqual(['esql']);
      // The engine requires a non-empty name and description, and an integer risk
      // score; the action mirrors that so a draft it would reject never reaches an
      // analyst. Nothing here is stricter than the engine itself.
      expect(props.actionInput.properties?.name?.minLength).toBe(1);
      expect(props.actionInput.properties?.description?.minLength).toBe(1);
      expect(props.actionInput.properties?.risk_score).toEqual(
        expect.objectContaining({ type: 'integer', minimum: 0, maximum: 100 })
      );
      expect(props.actionInput.additionalProperties).toBe(false);
      expect(props.actionInput.required).toEqual(
        expect.arrayContaining([
          'type',
          'language',
          'name',
          'description',
          'query',
          'severity',
          'risk_score',
        ])
      );
      const create = action.steps.find((step) => step.name === 'create_rule');
      expect(create?.type).toBe('security.createRule');
      expect(create?.with?.rule).toBe('${{ inputs.actionInput }}');
    });

    // A draft is reviewable only with a query, a name, a description and an attachment.
    // The create action requires a name and a description, so proposing a draft without
    // them would ask the analyst to approve a rule that can never be created.
    it('previews and attaches only a complete draft with an attachment', () => {
      const ready = flagOf('draft_ready', 'ok');
      const complete = { query: 'FROM x', name: 'Rare parent', description: 'Covers T1055' };
      const attached = (rule: Partial<typeof complete>) =>
        draftContext({ attachment_id: 'a1', rule });
      const without = (field: keyof typeof complete) =>
        Object.fromEntries(Object.entries(complete).filter(([key]) => key !== field));

      expect(evaluate(ready, attached(complete))).toBe(true);

      // Empty is what the prompt returns for a gap it could not draft; absent is what a
      // model that dropped the field leaves behind. Neither is reviewable.
      expect(evaluate(ready, attached({ ...complete, query: '' }))).toBe(false);
      expect(evaluate(ready, attached({ ...complete, name: '' }))).toBe(false);
      expect(evaluate(ready, attached({ ...complete, description: '' }))).toBe(false);
      expect(evaluate(ready, attached(without('name')))).toBe(false);
      expect(evaluate(ready, attached(without('description')))).toBe(false);

      expect(evaluate(ready, draftContext({ attachment_id: '', rule: complete }))).toBe(false);
      expect(evaluate(ready, draftContext({ rule: complete }))).toBe(false);

      for (const name of ['preview_creation', 'attach_draft', 'proposal_ready']) {
        expect(JSON.stringify(stepByName(name))).toContain('steps.draft_ready.output.ok == true');
      }
    });

    // The comment shows a few fields, but the action creates the whole body. A draft
    // the analyst cannot inspect on the investigation is not proposed.
    it.each([
      ['a ready draft that was attached', true, null, true],
      ['a ready draft whose attachment failed', true, { message: 'boom' }, false],
      ['a draft that was never ready', false, null, false],
    ])('decides whether to propose %s', (_scenario, ok, attachError, expected) => {
      expect(stepByName('propose_creation')?.if).toBe(
        '${{ steps.proposal_ready.output.ok == true }}'
      );
      expect(
        evaluate(flagOf('proposal_ready', 'ok'), {
          steps: { draft_ready: { output: { ok } }, attach_draft: { error: attachError } },
        })
      ).toBe(expected);
    });

    // The no-draft answer the prompt asks for has to satisfy the output schema, or
    // the agent step fails validation instead of handing draft_ready a draft to
    // reject. Empty strings in every field would not: several are enums, a number
    // or lists.
    it('asks for a no-draft answer the schema accepts and draft_ready rejects', () => {
      const schema = convertJsonSchemaToZod(
        stepByName('draft_creation')?.with?.schema as JSONSchema7
      );
      const noDraft = {
        attachment_id: '',
        reason: 'The data source does not exist.',
        rule: {
          name: '',
          description: '',
          query: '',
          language: 'esql',
          type: 'esql',
          interval: '',
          from: '',
          to: '',
          severity: 'low',
          risk_score: 0,
          threat: [],
          tags: [],
        },
      };

      expect(schema.safeParse(noDraft).success).toBe(true);
      expect(evaluate(flagOf('draft_ready', 'ok'), draftContext(noDraft))).toBe(false);

      const allEmpty = {
        ...noDraft,
        rule: { ...noDraft.rule, language: '', type: '', severity: '', risk_score: '' },
      };
      expect(schema.safeParse(allEmpty).success).toBe(false);
    });

    // The preview informs the analyst; it does not gate the proposal.
    it('proposes the draft whatever the preview returned', () => {
      expect(stepByName('propose_creation')?.if).not.toContain('preview_creation');
      expect(String(inputsOf(stepByName('propose_creation')).comment)).toContain(
        'steps.preview_creation.output.alert_count'
      );
    });

    // The worker parks in WAITING_FOR_CHILD while the gate holds the decision for up to
    // 168h; the engine's default 6h timeout would cancel it.
    it('outlives the proposal gate it waits on', () => {
      expect(String(worker.settings?.timeout)).toMatch(/^\d+h$/);
      expect(hours(worker.settings?.timeout)).toBeGreaterThan(hours(gate.settings?.timeout));
    });
  });

  describe('investigation', () => {
    // The caller opened the investigation for the gap and owns its lifecycle; the
    // worker only records the draft on it.
    it('proposes on the investigation the caller passed and opens none of its own', () => {
      const inputs = worker.triggers?.[0]?.inputs as { required?: string[] };
      expect(inputs.required).toContain('investigation_id');
      expect(worker.steps.map(({ type }) => type)).not.toContain('ai.conversation.create');
      expect(worker.steps.map(({ type }) => type)).not.toContain('ai.conversation.metadata.patch');
      expect(inputsOf(stepByName('propose_creation')).conversationId).toBe(
        '{{ inputs.investigation_id }}'
      );
      expect(stepByName('attach_draft')?.with?.conversation_id).toBe(
        '{{ inputs.investigation_id }}'
      );
    });

    it('copies the draft onto the investigation and renders it inline', () => {
      const attach = stepByName('attach_draft');
      expect(attach?.type).toBe('ai.attachment.add');
      expect(attach?.with?.type).toBe('security.rule');
      expect(attach?.with?.render_inline).toBe(true);
      expect(JSON.stringify(attach?.with?.data)).toContain(
        'steps.draft_creation.output.structured_output.rule | json'
      );
      expect(attach?.['on-failure']?.continue).toBe(true);
    });
  });

  describe('outputs', () => {
    it('derives created and reviewed from the gate, so an expired gate reads as neither', () => {
      expect(emit.created).toContain("steps.propose_creation.output.status == 'succeeded'");
      expect(emit.reviewed).toContain("steps.propose_creation.output.decision == 'approved'");
      expect(emit.reviewed).toContain("steps.propose_creation.output.decision == 'dismissed'");
      expect(emit.decision).toBe('{{ steps.propose_creation.output.decision }}');
    });

    it('declares every output the coverage review reads', () => {
      expect(worker.outputs?.map(({ name }) => name)).toEqual(
        expect.arrayContaining(['created', 'reviewed', 'decision', 'rule_name', 'skip_reason'])
      );
    });

    // The model's reason lives in the structured output, not only in its conversation,
    // so a gap that keeps coming back can be explained from the run alone.
    it.each([
      [
        'the model reason for a draft it could not build',
        { ok: false },
        { reason: 'No Kubernetes audit data stream exists.' },
        null,
        'No Kubernetes audit data stream exists.',
      ],
      [
        'a fallback for an incomplete draft without a reason',
        { ok: false },
        { reason: '' },
        null,
        'The draft is incomplete: it needs a query, a name, a description and an attachment.',
      ],
      [
        'the attachment error for a draft that could not be copied',
        { ok: true },
        { reason: '' },
        { message: 'boom' },
        'The draft could not be attached to the investigation: boom',
      ],
      ['nothing for a proposed draft', { ok: true }, { reason: '' }, null, ''],
    ])('reports %s as skip_reason', (_scenario, ready, structured, attachError, expected) => {
      const rendered = createWorkflowLiquidEngine().parseAndRenderSync(emit.skip_reason, {
        steps: {
          draft_ready: { output: ready },
          draft_creation: { output: { structured_output: structured } },
          attach_draft: { error: attachError },
        },
      });
      expect(rendered).toBe(expected);
    });
  });

  describe('inputs', () => {
    it('limits the length of every string input', () => {
      const props = worker.triggers?.[0]?.inputs?.properties;
      expect(Object.keys(props ?? {}).length).toBeGreaterThan(0);
      const uncapped = Object.entries(props ?? {})
        .filter(([, schema]) => schema.type === 'string' && !schema.maxLength)
        .map(([name]) => name);
      expect(uncapped).toEqual([]);
    });
  });
});
