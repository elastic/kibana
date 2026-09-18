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
  ALERTZERO_ACTION_CREATE_RULE_WORKFLOW,
  ALERTZERO_ACTION_CREATE_RULE_WORKFLOW_ID,
  ALERTZERO_RULE_CREATION_WORKFLOW,
} from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils';
import { CREATE_INVESTIGATION_PROPOSAL_WORKFLOW } from '../agentic_investigations';

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
  triggers?: Array<{ inputs?: { properties?: Record<string, unknown> } }>;
}

const worker = parse(ALERTZERO_RULE_CREATION_WORKFLOW.yaml) as YamlWorkflow;
const gate = parse(CREATE_INVESTIGATION_PROPOSAL_WORKFLOW.yaml) as YamlWorkflow;
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
      expect(proposal?.with?.['workflow-id']).toBe(CREATE_INVESTIGATION_PROPOSAL_WORKFLOW.id);
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
        { properties?: Record<string, { enum?: string[] }>; required?: string[] }
      >;
      expect(props.actionInput.properties?.type?.enum).toEqual(['esql']);
      expect(props.actionInput.properties?.language?.enum).toEqual(['esql']);
      expect(props.actionInput.required).toEqual(
        expect.arrayContaining(['type', 'language', 'name', 'description', 'query'])
      );
      const create = action.steps.find((step) => step.name === 'create_rule');
      expect(create?.type).toBe('security.createRule');
      expect(create?.with?.rule).toBe('${{ inputs.actionInput }}');
    });

    // A draft with an empty query or no attachment is not reviewable; proposing it
    // would ask the analyst to approve nothing.
    it('previews and attaches only a draft with a query and an attachment', () => {
      const ready = flagOf('draft_ready', 'ok');
      expect(
        evaluate(ready, draftContext({ attachment_id: 'a1', rule: { query: 'FROM x' } }))
      ).toBe(true);
      expect(evaluate(ready, draftContext({ attachment_id: 'a1', rule: { query: '' } }))).toBe(
        false
      );
      expect(evaluate(ready, draftContext({ attachment_id: '', rule: { query: 'FROM x' } }))).toBe(
        false
      );
      expect(evaluate(ready, draftContext({ rule: { query: 'FROM x' } }))).toBe(false);
      for (const name of ['preview_creation', 'attach_draft']) {
        expect(stepByName(name)?.if).toContain('steps.draft_ready.output.ok == true');
      }
    });

    // A model that built nothing still fills every required field with placeholders,
    // and a draft that fails its preview would fail the create action inside the gate,
    // which re-parks a fresh proposal on every attempt. The preview is the guard.
    it('proposes creation only after a successful preview', () => {
      const previewed = flagOf('draft_previewed', 'ok');
      expect(previewed).toContain('steps.draft_ready.output.ok == true');
      expect(previewed).toContain('steps.preview_creation.output.succeeded == true');
      expect(previewed).toContain('steps.preview_creation.output.is_aborted == false');
      expect(stepByName('propose_creation')?.if).toContain(
        'steps.draft_previewed.output.ok == true'
      );
    });

    // Without a decision the caller keeps the indicator pending and redrafts the same
    // gap on every sweep.
    it('reports an undraftable gap through the gate so it still reaches a decision', () => {
      const report = stepByName('report_undraftable');
      expect(report?.type).toBe('workflow.execute');
      expect(report?.with?.['workflow-id']).toBe(CREATE_INVESTIGATION_PROPOSAL_WORKFLOW.id);
      expect(report?.if).toContain('steps.draft_previewed.output.ok != true');
      const inputs = inputsOf(report);
      expect(inputs).not.toHaveProperty('actionWorkflowId');
      expect(inputs.category).toBe('configure');
      expect(report).not.toHaveProperty('on-failure');
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
      for (const step of ['propose_creation', 'report_undraftable']) {
        expect(emit.reviewed).toContain(`steps.${step}.output.decision == 'approved'`);
        expect(emit.reviewed).toContain(`steps.${step}.output.decision == 'dismissed'`);
      }
      expect(emit.decision).toContain('steps.propose_creation.output.decision');
      expect(emit.decision).toContain('steps.report_undraftable.output.decision');
    });

    it('declares every output the coverage review reads', () => {
      expect(worker.outputs?.map(({ name }) => name)).toEqual(
        expect.arrayContaining(['created', 'reviewed', 'decision', 'rule_name'])
      );
    });
  });
});
