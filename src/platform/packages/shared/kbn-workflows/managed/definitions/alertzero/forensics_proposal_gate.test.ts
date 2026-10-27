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
import { ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW } from './hunt';
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface YamlStep {
  name: string;
  type: string;
  if?: string;
  with?: Record<string, unknown>;
  'on-failure'?: { continue?: boolean; retry?: { 'max-attempts'?: number; delay?: string } };
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
        'proposalId',
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

  // Two runs that reach one host at the same time can both resolve the subject as free.
  // The service creates one Proposal under the shared id and refuses the other, whose
  // gate would otherwise carry on in silence.
  describe('a lost race', () => {
    const fetchStep = stepIn(gate.steps, 'fetch_existing_proposal');
    const resolveStep = stepIn(gate.steps, 'resolve_lost_race');
    const journalStep = stepIn(gate.steps, 'journal_lost_race');
    const wrapFailedStep = stepIn(gate.steps, 'journal_wrap_failed');
    const lostRaceWith = resolveStep?.with as Record<string, string>;
    const liquid = createWorkflowLiquidEngine();

    const context = (overrides: {
      fetched?: Record<string, unknown>;
      spaceId?: string;
      title?: string | undefined;
    }) => ({
      inputs: {
        conversationId: 'conv-1',
        ...(overrides.title === undefined ? {} : { title: overrides.title }),
      },
      workflow: { spaceId: overrides.spaceId ?? 'default' },
      steps:
        overrides.fetched === undefined
          ? {}
          : { fetch_existing_proposal: { output: overrides.fetched } },
    });

    it('only reads the existing Proposal after a create under a caller-derived id failed', () => {
      expect(fetchStep?.type).toBe('kibana.request');
      expect(fetchStep?.with?.method).toBe('GET');
      expect(fetchStep?.with?.path).toBe(
        '/s/{{ workflow.spaceId }}/internal/proposals/{{ inputs.proposalId }}'
      );

      const reads = (error: Record<string, unknown> | undefined, proposalId?: string) =>
        evaluateExpression(String(fetchStep?.if), {
          inputs: proposalId === undefined ? {} : { proposalId },
          steps: { create_and_gate_proposal: error === undefined ? {} : { error } },
        });
      expect(reads({ message: 'conflict' }, 'p-1')).toBe(true);
      expect(reads(undefined, 'p-1')).toBe(false);
      expect(reads({ message: '' }, 'p-1')).toBe(false);
      // No id was derived: nothing to look up, and the path would be the list route.
      expect(reads({ message: 'conflict' })).toBe(false);
      expect(reads({ message: 'conflict' }, '')).toBe(false);
    });

    it('retries that read, since the winner may not be searchable yet, and carries on if it still fails', () => {
      expect(fetchStep?.['on-failure']).toEqual({
        retry: { 'max-attempts': 3, delay: '1s' },
        continue: true,
      });
    });

    it('is a lost race only when the Proposal under the id belongs to another conversation', () => {
      const isLost = (fetched: Record<string, unknown> | undefined) =>
        evaluateExpression(lostRaceWith.lost_race, context({ fetched }));

      expect(isLost({ conversationId: 'conv-other' })).toBe(true);
      // The gate itself failed on this Investigation's own Proposal: not a race.
      expect(isLost({ conversationId: 'conv-1' })).toBe(false);
      // The read was skipped, or failed: nothing true can be said, so nothing is written.
      expect(isLost(undefined)).toBe(false);
      expect(isLost({})).toBe(false);
      expect(isLost({ conversationId: '' })).toBe(false);
    });

    it('says where the finding went, and that this Investigation stays open', () => {
      const note = liquid.parseAndRenderSync(
        lostRaceWith.lost_race_note,
        context({ fetched: { conversationId: 'conv-other' }, title: 'Isolate web-01' })
      );

      expect(note).toBe(
        'A containment proposal for "Isolate web-01" was raised by [another Investigation](/app/alertzero?selectedConversationId=conv-other) at the same moment as this one, so no second Proposal was created and this finding is covered by that one. This Investigation stays open until an analyst closes it.'
      );
    });

    it('links the space the Investigation is in', () => {
      const note = liquid.parseAndRenderSync(
        lostRaceWith.lost_race_note,
        context({ fetched: { conversationId: 'conv-other' }, spaceId: 'sec' })
      );
      expect(note).toContain('(/s/sec/app/alertzero?selectedConversationId=conv-other)');
    });

    it('names the action when the gate was given no title', () => {
      const note = liquid.parseAndRenderSync(
        lostRaceWith.lost_race_note,
        context({ fetched: { conversationId: 'conv-other' } })
      );
      expect(note).toContain('"the proposed action"');
    });

    it('writes it on this Investigation through the journal workflow, and never fails the gate over it', () => {
      expect(journalStep?.if).toBe('${{ variables.lost_race == true }}');
      expect(journalStep?.with).toEqual({
        'workflow-id': 'system-alertzero-journal-note',
        'run-as-mode': 'inherit',
        inputs: {
          author_name: '{{ consts.author_name }}',
          conversation_id: '{{ inputs.investigationConversationId }}',
          message: '{{ variables.lost_race_note }}',
        },
      });
      expect(journalStep?.['on-failure']).toEqual({ continue: true });
    });

    // The generic "ran into an error" note would otherwise follow the lost-race note
    // and contradict it: the race is a known outcome, not a problem to look into.
    it('does not also write the generic wrap-failed note for a lost race', () => {
      const fires = (lostRace: boolean) =>
        evaluateExpression(String(wrapFailedStep?.if), {
          steps: { create_and_gate_proposal: { error: { message: 'conflict' } } },
          variables: { lost_race: lostRace },
        });
      expect(fires(false)).toBe(true);
      expect(fires(true)).toBe(false);
      expect(
        evaluateExpression(String(wrapFailedStep?.if), {
          steps: { create_and_gate_proposal: {} },
          variables: { lost_race: false },
        })
      ).toBe(false);
    });

    it('happens after the create and before the settlement requery that closes the Investigation', () => {
      const order = gate.steps.map((step) => step.name);
      expect(order.indexOf('fetch_existing_proposal')).toBeGreaterThan(
        order.indexOf('create_and_gate_proposal')
      );
      expect(order.indexOf('resolve_lost_race')).toBeGreaterThan(
        order.indexOf('fetch_existing_proposal')
      );
      expect(order.indexOf('journal_lost_race')).toBeGreaterThan(
        order.indexOf('resolve_lost_race')
      );
      expect(order.indexOf('journal_wrap_failed')).toBeGreaterThan(
        order.indexOf('resolve_lost_race')
      );
      expect(order.indexOf('journal_lost_race')).toBeLessThan(order.indexOf('requery_created'));
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

    // The run resolves each Proposal's id before dispatching, so two runs racing over one
    // subject create one Proposal. Optional: a caller may still raise an always-new one.
    it('accepts the deterministic proposalId the run resolved, without requiring it', () => {
      expect(inputs?.properties?.proposalId).toMatchObject({ type: 'string' });
      expect(inputs?.required).not.toContain('proposalId');
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
