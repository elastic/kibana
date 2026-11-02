/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ALERTZERO_FORENSICS_WORKFLOW_IDS } from '.';
import { ALERTZERO_ACTION_CLOSE_ATTACK_DISCOVERY_INVESTIGATION_WORKFLOW } from './actions/action_close_attack_discovery_investigation';
import { ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID } from './create_proposal';
import {
  ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW,
  ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW_ID,
} from './forensics_close_investigation_gate';
import { ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW } from './forensics_proposal_gate';
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
  consts?: Record<string, unknown>;
  triggers?: Array<{
    type: string;
    inputs?: {
      required?: string[];
      properties?: Record<string, { type?: string; enum?: string[]; maxLength?: number }>;
      additionalProperties?: boolean;
    };
  }>;
  steps: YamlStep[];
}

interface ActionYaml {
  consts?: { actionMetadata?: Record<string, unknown> };
  triggers?: Array<{
    inputs?: {
      properties?: {
        actionInput?: {
          properties?: Record<string, { enum?: string[] }>;
          required?: string[];
        };
      };
    };
  }>;
}

const gate = parse(ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW.yaml) as YamlWorkflow;
const containmentGate = parse(ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW.yaml) as YamlWorkflow;
const action = parse(
  ALERTZERO_ACTION_CLOSE_ATTACK_DISCOVERY_INVESTIGATION_WORKFLOW.yaml
) as ActionYaml;
const stepIn = (name: string) => gate.steps.find((step) => step.name === name);
const names = gate.steps.map(({ name }) => name);

const liquid = createWorkflowLiquidEngine();
const evaluate = (expression: string, context: Record<string, unknown>): unknown =>
  liquid.evalValueSync(
    expression
      .trim()
      .replace(/^\$?\{\{/, '')
      .replace(/\}\}$/, '')
      .trim(),
    context
  );

const inputs = {
  investigationConversationId: 'inv-1',
  attackDiscoveryId: 'attack-1',
  closeReason: 'resolved',
  attackReason: 'true_positive',
};

describe('Forensics close investigation gate', () => {
  it('is registered under the id the containment gate and the run dispatch, and installed with them', () => {
    expect(ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW.id).toBe(
      ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW_ID
    );
    expect(ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW_ID).toBe(
      'system-security-forensics-close-investigation-gate'
    );
    expect(ALERTZERO_FORENSICS_WORKFLOW_IDS).toContain(
      ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW_ID
    );
    expect(ALERTZERO_FORENSICS_CLOSE_INVESTIGATION_GATE_WORKFLOW.management.enablement).toBe(
      'enforced'
    );
  });

  it('is tagged security + forensics and nothing Worker-specific', () => {
    expect(new Set(gate.tags ?? [])).toEqual(new Set(['security', 'forensics']));
  });

  // Same parking constraints as the containment gate: the bridge holds the analyst's
  // decision for up to 168h, and this clock starts first.
  it('outlives the analyst decision window the bridge parks for', () => {
    expect(gate.settings?.timeout).toBe(containmentGate.settings?.timeout);
    expect(gate.settings?.timeout).toBe('176h');
  });

  describe('trigger schema', () => {
    const trigger = gate.triggers?.[0];

    it('requires the Investigation, its attack and both reasons, and nothing else', () => {
      expect(trigger?.type).toBe('manual');
      expect(trigger?.inputs?.required).toEqual([
        'investigationConversationId',
        'attackDiscoveryId',
        'closeReason',
        'attackReason',
      ]);
      expect(trigger?.inputs?.additionalProperties).toBe(false);
      expect(trigger?.inputs?.properties?.assessment).toMatchObject({
        type: 'string',
        maxLength: 500,
      });
      expect(trigger?.inputs?.properties?.attackAlertCount).toMatchObject({
        type: 'integer',
        minimum: 0,
      });
      // Optional: a containment gate that settled normally has nothing to add.
      expect(trigger?.inputs?.properties?.caveat).toMatchObject({
        type: 'string',
        maxLength: 2000,
      });
    });

    // The reasons end up in the action's input, so they must be values the action takes.
    it('accepts exactly the reasons the Close Investigation action accepts', () => {
      const actionInput = action.triggers?.[0]?.inputs?.properties?.actionInput?.properties;
      expect(trigger?.inputs?.properties?.closeReason?.enum).toEqual(
        actionInput?.close_reason?.enum
      );
      expect(trigger?.inputs?.properties?.attackReason?.enum).toEqual(
        actionInput?.attack_reason?.enum
      );
    });
  });

  // A containment gate dispatches this child when its own reads say nothing is
  // pending, but the run's no-actions path has made no such read, and a Close card
  // next to a pending containment card would ask the analyst to close over something
  // undecided.
  describe('one more pending check before asking', () => {
    const check = stepIn('check_pending');
    const pending = stepIn('resolve_pending')?.with as Record<string, string>;

    it('reads the pending count the way the containment gate does, and carries on if it fails', () => {
      const containmentRead = containmentGate.steps.find(({ name }) => name === 'requery_pending');
      expect(check?.type).toBe('kibana.request');
      expect(check?.with).toEqual({
        ...containmentRead?.with,
        query: {
          ...(containmentRead?.with?.query as Record<string, unknown>),
          conversationId: '{{ inputs.investigationConversationId }}',
        },
      });
      expect(check?.['on-failure']).toEqual({
        retry: { 'max-attempts': 3, delay: '1s' },
        continue: true,
      });
    });

    // A failed read can only ever look like "at least one pending", never "none".
    it('fails closed when the read failed', () => {
      expect(
        evaluate(pending.pending_count, { steps: { check_pending: { output: { total: 0 } } } })
      ).toBe(0);
      expect(
        evaluate(pending.pending_count, { steps: { check_pending: { output: { total: 2 } } } })
      ).toBe(2);
      expect(
        evaluate(pending.pending_count, {
          steps: { check_pending: { error: { message: 'request failed' } } },
        })
      ).toBe(1);
    });

    it('resolves the proposal only when nothing is pending, and says so otherwise', () => {
      const resolveIf = String(stepIn('resolve_close_proposal')?.if);
      const notAskedIf = String(stepIn('journal_not_asked')?.if);
      const when = (count: number) => ({
        steps: { resolve_pending: { output: { pending_count: count } } },
      });

      expect(evaluate(resolveIf, when(0))).toBe(true);
      expect(evaluate(resolveIf, when(1))).toBe(false);
      expect(evaluate(notAskedIf, when(0))).toBe(false);
      expect(evaluate(notAskedIf, when(1))).toBe(true);

      const note = stepIn('journal_not_asked');
      expect(note?.type).toBe('workflow.execute');
      expect(note?.with?.['workflow-id']).toBe('system-alertzero-journal-note');
      expect(note?.['on-failure']).toEqual({ continue: true });
      const message = String((note?.with?.inputs as { message?: string })?.message);
      expect(message).toContain('was not raised');
      expect(message).toContain('stays open until an analyst closes it');
    });
  });

  // The question is one Proposal per Investigation at a time. The dedup step keys a
  // candidate with no host, process or identity target to the Investigation and the
  // action, so a live Close Proposal here is "already open" and a settled one gives
  // way to the next generation. That is what "ask again only after something new is
  // decided" relies on, so the input must name no target.
  describe('resolving the Close proposal', () => {
    const resolve = stepIn('resolve_close_proposal');
    const build = stepIn('build_proposal')?.with as {
      action_input: Record<string, string>;
      comment: string;
    };
    const counts = stepIn('resolve_close_counts')?.with as Record<string, string>;

    it('runs the shared dedup step over one candidate for the Close Investigation action', () => {
      expect(resolve?.type).toBe('alertzero.resolveProposals');
      expect(resolve?.['on-failure']).toEqual({ continue: true });
      expect(resolve?.with?.investigationConversationId).toBe(
        '{{ inputs.investigationConversationId }}'
      );
      const candidates = resolve?.with?.proposals as Array<Record<string, unknown>>;
      expect(candidates).toHaveLength(1);
      expect(candidates[0]).toEqual({
        actionWorkflowId: '{{ consts.close_investigation_action }}',
        actionInput: '${{ steps.build_proposal.output.action_input }}',
        title: 'Close Investigation',
        comment: '{{ steps.build_proposal.output.comment }}',
      });
      expect(gate.consts?.close_investigation_action).toBe(
        ALERTZERO_ACTION_CLOSE_ATTACK_DISCOVERY_INVESTIGATION_WORKFLOW.id
      );
    });

    it('builds an action input the action requires, with no target field the dedup would key on', () => {
      const required = action.triggers?.[0]?.inputs?.properties?.actionInput?.required ?? [];
      const declared = Object.keys(
        action.triggers?.[0]?.inputs?.properties?.actionInput?.properties ?? {}
      );
      const provided = Object.keys(build.action_input);

      expect(required.filter((key) => !provided.includes(key))).toEqual([]);
      expect(provided.filter((key) => !declared.includes(key))).toEqual([]);
      for (const target of ['endpoint_ids', 'parameters', 'id_field', 'id_value']) {
        expect(provided).not.toContain(target);
      }
      expect(build.action_input).toMatchObject({
        investigation_id: '{{ inputs.investigationConversationId }}',
        attack_discovery_id: '{{ inputs.attackDiscoveryId }}',
        close_reason: '{{ inputs.closeReason }}',
        attack_reason: '{{ inputs.attackReason }}',
      });
    });

    // The card's buttons are fixed (Approve / Dismiss), so the text has to say what
    // each does here, and that a dismissal is not the last word.
    it('tells the analyst what Approve and Dismiss do', () => {
      const render = (assessment?: string, attackAlertCount?: number) =>
        liquid.parseAndRenderSync(build.comment, {
          inputs: {
            ...inputs,
            ...(assessment === undefined ? {} : { assessment }),
            ...(attackAlertCount === undefined ? {} : { attackAlertCount }),
          },
        });

      const withAssessment = render('Ransomware staged on web-01.');
      expect(withAssessment.startsWith('Endpoint analysis is done with this Investigation.')).toBe(
        true
      );
      expect(withAssessment).toContain('Its assessment: Ransomware staged on web-01.');
      expect(withAssessment).toContain(
        '**Approve** closes this Investigation, and closes the attack and its detection alerts as `true_positive`.'
      );
      expect(withAssessment).toContain('left acknowledged');
      expect(withAssessment).toContain('**Dismiss** keeps everything open.');
      expect(withAssessment).not.toContain('no real incident');

      expect(render()).not.toContain('Its assessment');
      expect(render('')).not.toContain('Its assessment');
    });

    // Whatever went wrong before the question changes what Approve means, so it is read
    // first; without one the card reads as it always has.
    it('leads with the caveat the run passed, when there is one', () => {
      const render = (caveat?: string) =>
        liquid.parseAndRenderSync(build.comment, {
          inputs: { ...inputs, ...(caveat === undefined ? {} : { caveat }) },
        });

      const withCaveat = render('1 containment proposal(s) did not reach the approval queue.');
      expect(
        withCaveat.startsWith(
          '**Before you close:** 1 containment proposal(s) did not reach the approval queue.\n\nEndpoint analysis is done with this Investigation.'
        )
      ).toBe(true);
      expect(withCaveat).toContain('**Dismiss** keeps everything open.');
      expect(render().startsWith('Endpoint analysis is done with this Investigation.')).toBe(true);
      expect(render('')).toBe(render());
    });

    // An approval can reach at most the alerts the attack lists: one another open
    // attack also owns stays acknowledged, so the card says "up to".
    it('says how many alerts an approval can reach at most, when it knows', () => {
      const render = (attackAlertCount?: number) =>
        liquid.parseAndRenderSync(build.comment, {
          inputs: {
            ...inputs,
            ...(attackAlertCount === undefined ? {} : { attackAlertCount }),
          },
        });

      expect(render(7)).toContain(
        'closes the attack and up to 7 detection alert(s) as `true_positive`.'
      );
      expect(render(0)).toContain('closes the attack and its detection alerts as `true_positive`.');
      expect(render()).toContain('closes the attack and its detection alerts as `true_positive`.');
    });

    // Endpoint analysis determined the false positive; the card says so in those
    // words, and what an approval closes as.
    it('asks a false-positive question when the analysis found no real incident', () => {
      const render = (assessment?: string, attackAlertCount?: number) =>
        liquid.parseAndRenderSync(build.comment, {
          inputs: {
            ...inputs,
            closeReason: 'false_positive',
            attackReason: 'false_positive',
            ...(assessment === undefined ? {} : { assessment }),
            ...(attackAlertCount === undefined ? {} : { attackAlertCount }),
          },
        });

      expect(render('Scheduled backup tooling.', 3)).toBe(
        [
          'Endpoint analysis found **no real incident**: Scheduled backup tooling.',
          '',
          '**Approve** closes this Investigation, the attack and up to 3 detection alert(s) as **false positive**. An alert that another open attack also owns is left acknowledged.',
          '',
          '**Dismiss** keeps everything open.',
        ].join('\n')
      );
      expect(render()).toContain('Endpoint analysis found **no real incident**.\n\n**Approve**');
      expect(render()).toContain('the attack and its detection alerts as **false positive**');
      expect(render()).not.toContain('is done with this Investigation');
      expect(render()).not.toContain('`false_positive`');
    });

    it('derives every later gate from the step output, all off when it was skipped', () => {
      const skipped = { steps: {} };
      expect(evaluate(counts.minted, skipped)).toBe(0);
      expect(evaluate(counts.already_open, skipped)).toBe(0);
      expect(evaluate(counts.check_failed, skipped)).toBe(false);

      const minted = {
        steps: {
          resolve_close_proposal: {
            output: {
              proposals: [{ proposalId: 'p-1' }],
              alreadyOpenCount: 0,
              mintSuppression: 'none',
            },
          },
        },
      };
      expect(evaluate(counts.minted, minted)).toBe(1);
      expect(evaluate(counts.check_failed, minted)).toBe(false);

      // A live Close Proposal is already on the Investigation: nothing to ask twice.
      const alreadyOpen = {
        steps: {
          resolve_close_proposal: {
            output: { proposals: [], alreadyOpenCount: 1, mintSuppression: 'none' },
          },
        },
      };
      expect(evaluate(counts.minted, alreadyOpen)).toBe(0);
      expect(evaluate(counts.already_open, alreadyOpen)).toBe(1);
    });

    it('treats a suppressed mint or a thrown step as a failed check, and says so', () => {
      expect(
        evaluate(counts.check_failed, {
          steps: {
            resolve_close_proposal: { output: { proposals: [], mintSuppression: 'check_failed' } },
          },
        })
      ).toBe(true);
      expect(
        evaluate(counts.check_failed, {
          steps: { resolve_close_proposal: { error: { message: 'boom' } } },
        })
      ).toBe(true);

      const note = stepIn('journal_check_failed');
      expect(note?.if).toBe('${{ steps.resolve_close_counts.output.check_failed == true }}');
      expect(note?.['on-failure']).toEqual({ continue: true });
      const message = String((note?.with?.inputs as { message?: string })?.message);
      expect(message).toContain('none was raised');
      expect(message).not.toContain('error');
    });
  });

  describe('the bridge wrap', () => {
    const wrap = stepIn('create_and_gate_proposal');
    const wrapInputs = wrap?.with?.inputs as Record<string, unknown>;

    it('creates the proposal through the AlertZero bridge only when a slot was minted', () => {
      expect(wrap?.type).toBe('workflow.execute');
      expect(wrap?.with?.['workflow-id']).toBe(ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID);
      expect(wrap?.with?.['run-as-mode']).toBe('inherit');
      expect(wrap?.['on-failure']).toEqual({ continue: true });

      const fires = (minted: number) =>
        evaluate(String(wrap?.if), { steps: { resolve_close_counts: { output: { minted } } } });
      expect(fires(1)).toBe(true);
      expect(fires(0)).toBe(false);
    });

    // Under the id the dedup resolved, so two of these children racing over one
    // Investigation create one Proposal.
    it('reads every proposal field from the resolved slot and never auto-approves', () => {
      expect(wrapInputs).toEqual({
        conversationId: '{{ inputs.investigationConversationId }}',
        proposalId: '{{ steps.resolve_close_proposal.output.proposals[0].proposalId }}',
        title: '{{ steps.resolve_close_proposal.output.proposals[0].title }}',
        comment: '{{ steps.resolve_close_proposal.output.proposals[0].comment }}',
        actionWorkflowId: '{{ steps.resolve_close_proposal.output.proposals[0].actionWorkflowId }}',
        actionInput: '${{ steps.resolve_close_proposal.output.proposals[0].actionInput }}',
        autoApprove: false,
      });
      expect(wrapInputs.impact).toBeUndefined();
      expect(wrapInputs.category).toBeUndefined();
      expect(wrapInputs.expectedProposalCount).toBeUndefined();
    });

    // Belt and braces: the action itself refuses to run unattended.
    it('proposes an action that always gates', () => {
      expect(action.consts?.actionMetadata?.approvalPolicy).toBe('always-gate');
    });
  });

  describe('the decision', () => {
    const read = stepIn('read_proposal_decision');
    const decision = stepIn('resolve_decision')?.with as Record<string, string>;
    const outcome = stepIn('journal_outcome');

    const wrapped = (output?: Record<string, unknown>) => ({
      steps: { create_and_gate_proposal: output === undefined ? {} : { output } },
    });

    // A lost race has no wrap output: the winner journals its own decision.
    it('reads who decided only after a wrap that settled', () => {
      expect(read?.type).toBe('kibana.request');
      expect(read?.with?.method).toBe('GET');
      expect(read?.with?.path).toBe(
        '/s/{{ workflow.spaceId }}/internal/proposals/{{ steps.create_and_gate_proposal.output.proposalId }}'
      );
      expect(read?.['on-failure']).toEqual({
        retry: { 'max-attempts': 3, delay: '1s' },
        continue: true,
      });
      expect(evaluate(String(read?.if), wrapped({ status: 'succeeded' }))).toBe(true);
      expect(evaluate(String(read?.if), wrapped())).toBe(false);
      expect(evaluate(String(read?.if), wrapped({ status: '' }))).toBe(false);
      expect(outcome?.if).toBe(read?.if);
    });

    it('counts an approval only once the close ran, and a dismissal whatever the status', () => {
      const approved = wrapped({ decision: 'approved', status: 'succeeded' });
      const approvedButFailed = wrapped({ decision: 'approved', status: 'failed' });
      const dismissed = wrapped({ decision: 'dismissed', status: 'no_action' });
      const expired = wrapped({ status: 'expired' });

      expect(evaluate(decision.approved, approved)).toBe(true);
      expect(evaluate(decision.approved, approvedButFailed)).toBe(false);
      expect(evaluate(decision.approved, dismissed)).toBe(false);
      expect(evaluate(decision.dismissed, dismissed)).toBe(true);
      expect(evaluate(decision.dismissed, approved)).toBe(false);
      expect(evaluate(decision.expired, expired)).toBe(true);
      expect(evaluate(decision.expired, approved)).toBe(false);
    });

    it('journals each outcome, naming the analyst and what the Investigation does next', () => {
      const message = String((outcome?.with?.inputs as { message?: string })?.message);
      const render = (
        resolved: Record<string, boolean>,
        read_?: Record<string, unknown>,
        assessment?: string,
        status = 'succeeded'
      ) =>
        liquid.parseAndRenderSync(message, {
          inputs: { ...inputs, ...(assessment === undefined ? {} : { assessment }) },
          steps: {
            resolve_decision: { output: resolved },
            read_proposal_decision: read_ === undefined ? {} : { output: read_ },
            create_and_gate_proposal: { output: { status } },
          },
        });

      expect(
        render({ approved: true }, { decidedBy: { username: 'ana' } }, 'Ransomware staged.')
      ).toBe(
        'ana approved closing this Investigation. Endpoint analysis assessed it as `resolved`: Ransomware staged.'
      );
      expect(render({ approved: true }, { decidedBy: { username: 'ana' } })).toBe(
        'ana approved closing this Investigation. Endpoint analysis assessed it as `resolved`.'
      );
      expect(
        liquid.parseAndRenderSync(message, {
          inputs: {
            ...inputs,
            closeReason: 'false_positive',
            attackReason: 'false_positive',
            assessment: 'Scheduled backup tooling.',
          },
          steps: {
            resolve_decision: { output: { approved: true } },
            read_proposal_decision: { output: { decidedBy: { username: 'ana' } } },
            create_and_gate_proposal: { output: { status: 'succeeded' } },
          },
        })
      ).toBe(
        'ana approved closing this Investigation, the attack and its alerts as a false positive. Endpoint analysis found no real incident: Scheduled backup tooling.'
      );
      expect(
        render(
          { dismissed: true },
          {
            decidedBy: { username: 'ana' },
            dismissReason: 'risk_accepted',
            rationale: 'Known tooling.',
          }
        )
      ).toBe(
        'ana chose to keep this Investigation open (risk_accepted): Known tooling. Nothing was changed. The question is asked again after the next proposal on this Investigation is decided.'
      );
      expect(render({ dismissed: true })).toBe(
        'An analyst chose to keep this Investigation open (no reason given). Nothing was changed. The question is asked again after the next proposal on this Investigation is decided.'
      );
      expect(render({ expired: true }, undefined, undefined, 'expired')).toBe(
        'The Close Investigation proposal expired with no decision. The Investigation stays open.'
      );
      expect(render({}, undefined, undefined, 'failed')).toBe(
        'The Close Investigation proposal ended as `failed`. The Investigation stays open.'
      );
    });

    it('reports whether the question was asked and how it ended', () => {
      expect(stepIn('emit_result')?.with).toEqual({
        asked: '${{ steps.create_and_gate_proposal.output.status != blank }}',
        proposalStatus: '{{ steps.create_and_gate_proposal.output.status }}',
        decision: '{{ steps.create_and_gate_proposal.output.decision }}',
        expired: '${{ steps.resolve_decision.output.expired == true }}',
      });
    });
  });

  it('never closes anything itself', () => {
    const yaml = JSON.stringify(gate);
    expect(yaml).not.toContain('ai.conversation.metadata.patch');
    expect(yaml).not.toContain('/status');
    expect(yaml).not.toContain('setAttackStatus');
    expect(yaml).not.toContain('SetAlertsStatus');
  });

  it('checks, resolves, asks, then journals, in that order', () => {
    const order = [
      'check_pending',
      'resolve_pending',
      'build_proposal',
      'resolve_close_proposal',
      'resolve_close_counts',
      'create_and_gate_proposal',
      'read_proposal_decision',
      'resolve_decision',
      'report_investigation_closed',
      'journal_outcome',
      'emit_result',
    ];
    const positions = order.map((name) => names.indexOf(name));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(gate.steps[gate.steps.length - 1].type).toBe('workflow.output');
  });
});
