/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID } from './create_proposal';
import {
  ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW,
  ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW_ID,
} from './forensics_proposal_gate';
import { ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW } from './hunt_proposal_gate';
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface YamlStep {
  name: string;
  type: string;
  if?: string;
  with?: Record<string, unknown>;
  'on-failure'?: { continue?: boolean };
}

interface YamlWorkflow {
  tags?: string[];
  settings?: { timeout?: string };
  triggers?: Array<{
    type: string;
    inputs?: {
      required?: string[];
      properties?: Record<string, unknown>;
      additionalProperties?: boolean;
    };
  }>;
  steps: YamlStep[];
}

const gate = parse(ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW.yaml) as YamlWorkflow;
const huntGate = parse(ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW.yaml) as YamlWorkflow;
const stepIn = (steps: YamlStep[], name: string) => steps.find((step) => step.name === name);

const evaluateExpression = (expression: string, context: Record<string, unknown>): unknown => {
  const trimmed = expression.trim();
  if (!(trimmed.startsWith('${{') && trimmed.endsWith('}}'))) {
    throw new Error(`Expected \${{ }} expression, got: ${expression}`);
  }
  return createWorkflowLiquidEngine().evalValueSync(trimmed.slice(3, -2).trim(), context);
};

describe('Forensics proposal gate', () => {
  it('is registered under the id the Endpoint analysis run dispatches', () => {
    expect(ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW.id).toBe(
      ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW_ID
    );
    expect(ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW_ID).toBe(
      'system-security-forensics-proposal-gate'
    );
  });

  // Not a Hunt child: it must not show up under Hunt's feature tag, and it carries no
  // Worker watch tag of its own since it owns no trigger.
  it('is tagged security + forensics and nothing Worker-specific', () => {
    expect(new Set(gate.tags ?? [])).toEqual(new Set(['security', 'forensics']));
  });

  // Same parking constraints as hunt_proposal_gate: the bridge holds the analyst's
  // decision for up to 168h, and this clock starts first.
  it('outlives the analyst decision window the bridge parks for', () => {
    expect(gate.settings?.timeout).toBe('176h');
  });

  describe('bridge wrap', () => {
    const wrap = stepIn(gate.steps, 'create_and_gate_proposal');

    it('creates the proposal through the AlertZero bridge under the inherited account', () => {
      expect(wrap?.type).toBe('workflow.execute');
      expect(wrap?.with?.['workflow-id']).toBe(ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID);
      expect(wrap?.with?.['run-as-mode']).toBe('inherit');
      expect(wrap?.['on-failure']).toEqual({ continue: true });
    });

    // `${{ }}` so an input the caller did not set reaches the bridge as undefined rather
    // than `''`; the bridge rejects `autoApprove: ''` and `''` for impact/category would
    // override what the action declares.
    it('forwards every declared input as a typed expression', () => {
      const inputs = wrap?.with?.inputs as Record<string, string>;
      const forwarded = [
        'conversationId',
        'title',
        'comment',
        'actionWorkflowId',
        'actionInput',
        'confidence',
        'autoApprove',
      ];
      expect(Object.keys(inputs).sort()).toEqual([...forwarded].sort());
      for (const key of forwarded) {
        expect(inputs[key]).toBe(`\${{ inputs.${key} }}`);
      }
      expect(inputs.impact).toBeUndefined();
      expect(inputs.category).toBeUndefined();
    });
  });

  describe('trigger schema', () => {
    const inputs = gate.triggers?.[0]?.inputs;

    it('requires what the settlement check and the bridge need, and nothing else', () => {
      expect(gate.triggers?.[0]?.type).toBe('manual');
      expect(inputs?.required).toEqual([
        'conversationId',
        'comment',
        'investigationConversationId',
        'expectedProposalCount',
      ]);
      expect(inputs?.additionalProperties).toBe(false);
    });

    it('types autoApprove as a boolean and expectedProposalCount as a number', () => {
      expect(inputs?.properties?.autoApprove).toMatchObject({ type: 'boolean' });
      expect(inputs?.properties?.expectedProposalCount).toMatchObject({ type: 'number' });
    });
  });

  describe('settlement', () => {
    const counts = stepIn(gate.steps, 'resolve_settlement_counts')?.with as Record<string, string>;
    const settledWith = stepIn(gate.steps, 'resolve_settled')?.with as Record<string, string>;

    // The settlement reads are the same shape as Hunt's gate, which already carries the
    // per-status requery rationale. Pin the equivalence so a fix to one is a fix to both.
    it('reads settlement the way hunt_proposal_gate does', () => {
      const requeryNames = [
        'requery_created',
        'requery_created_retry',
        'requery_pending',
        'requery_pending_retry',
        'requery_executing',
        'requery_executing_retry',
      ];
      for (const name of requeryNames) {
        expect(stepIn(gate.steps, name)?.with).toEqual(stepIn(huntGate.steps, name)?.with);
        expect(stepIn(gate.steps, name)?.['on-failure']).toEqual({ continue: true });
      }
      expect(counts).toEqual(stepIn(huntGate.steps, 'resolve_settlement_counts')?.with);
      expect(settledWith).toEqual(stepIn(huntGate.steps, 'resolve_settled')?.with);
    });

    type RequeryOutcome = { total: number } | undefined;
    const asStepResult = (outcome: RequeryOutcome) =>
      outcome ? { output: outcome } : { error: { message: 'request failed' } };

    const evaluateSettled = ({
      created,
      pending,
      executing,
      expectedProposalCount,
    }: {
      created?: RequeryOutcome;
      pending?: RequeryOutcome;
      executing?: RequeryOutcome;
      expectedProposalCount: number;
    }): boolean => {
      const stepsContext = {
        steps: {
          requery_created: asStepResult(created),
          requery_created_retry: asStepResult(undefined),
          requery_pending: asStepResult(pending),
          requery_pending_retry: asStepResult(undefined),
          requery_executing: asStepResult(executing),
          requery_executing_retry: asStepResult(undefined),
        },
      };
      return (
        evaluateExpression(settledWith.settled, {
          variables: {
            created_count: evaluateExpression(counts.created_count, stepsContext),
            pending_count: evaluateExpression(counts.pending_count, stepsContext),
            executing_count: evaluateExpression(counts.executing_count, stepsContext),
          },
          inputs: { expectedProposalCount },
        }) === true
      );
    };

    it('settles only once every proposal is created and none is pending or executing', () => {
      expect(
        evaluateSettled({
          created: { total: 3 },
          pending: { total: 0 },
          executing: { total: 0 },
          expectedProposalCount: 3,
        })
      ).toBe(true);
      // A failed action is cloned as a new pending proposal, so the created total grows
      // past the barrier while the clone keeps the investigation open.
      expect(
        evaluateSettled({
          created: { total: 4 },
          pending: { total: 1 },
          executing: { total: 0 },
          expectedProposalCount: 3,
        })
      ).toBe(false);
      expect(
        evaluateSettled({
          created: { total: 2 },
          pending: { total: 0 },
          executing: { total: 0 },
          expectedProposalCount: 3,
        })
      ).toBe(false);
    });

    it('fails closed when a pending or executing read fails', () => {
      expect(
        evaluateSettled({
          created: { total: 3 },
          executing: { total: 0 },
          expectedProposalCount: 3,
        })
      ).toBe(false);
      expect(
        evaluateSettled({ created: { total: 3 }, pending: { total: 0 }, expectedProposalCount: 3 })
      ).toBe(false);
    });
  });

  describe('close', () => {
    const close = stepIn(gate.steps, 'close_if_settled');

    // The investigation is opened by whoever handed the host off, not by the Forensics
    // Worker, so an owner-only `ai.conversation.metadata.patch` reads as "not found" here.
    // The status route closes with converse access, which the investigation's public
    // access mode grants.
    it('closes over the investigations status route, not the owner-only metadata patch', () => {
      expect(close?.type).toBe('kibana.request');
      expect(close?.with).toEqual({
        method: 'PUT',
        path: '/s/{{ workflow.spaceId }}/internal/investigations/investigations/{{ inputs.investigationConversationId }}/status',
        headers: {
          'kbn-xsrf': 'true',
          'elastic-api-version': '1',
          'Content-Type': 'application/json',
        },
        body: { status: 'closed', expected_proposal_ids: [] },
      });
      expect(JSON.stringify(gate)).not.toContain('ai.conversation.metadata.patch');
    });

    it('runs only once settled and never fails the gate', () => {
      expect(evaluateExpression(close!.if!, { variables: { settled: true } })).toBe(true);
      expect(evaluateExpression(close!.if!, { variables: { settled: false } })).toBe(false);
      expect(close?.['on-failure']).toEqual({ continue: true });
    });

    it('renders the investigation id into the route path', () => {
      const path = createWorkflowLiquidEngine().parseAndRenderSync(String(close?.with?.path), {
        workflow: { spaceId: 'default' },
        inputs: { investigationConversationId: 'inv-1' },
      });
      expect(path).toBe('/s/default/internal/investigations/investigations/inv-1/status');
    });

    it('runs after settlement is resolved and before the output', () => {
      const names = gate.steps.map(({ name }) => name);
      expect(names.indexOf('close_if_settled')).toBeGreaterThan(names.indexOf('resolve_settled'));
      expect(names.indexOf('close_if_settled')).toBeLessThan(names.indexOf('emit_result'));
    });
  });
});
