/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import ACTION_CLOSE_ALERTS_FALSE_POSITIVE_YAML from './actions/action_close_alerts_false_positive.yaml';
import FLOOR_ALERT_TRIAGE_REVIEW_YAML from './floor_alert_triage_review.yaml';
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface YamlStep {
  name: string;
  type?: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  foreach?: string;
  condition?: string;
  if?: string;
  'on-failure'?: { continue?: boolean; fallback?: YamlStep[]; retry?: { 'max-attempts'?: number } };
}

interface ParsedReview {
  settings: { timeout: string; concurrency?: { key: string; strategy: string; max: number } };
  triggers: Array<{
    type: string;
    inputs?: { properties: Record<string, unknown>; required?: string[] };
  }>;
  steps: YamlStep[];
}

const parsed = parse(FLOOR_ALERT_TRIAGE_REVIEW_YAML) as ParsedReview;

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((s) => [
    s,
    ...flatten(s.steps ?? []),
    ...flatten(s.else ?? []),
    ...flatten(s['on-failure']?.fallback ?? []),
  ]);

const allSteps = flatten(parsed.steps);
const stepByName = (name: string) => allSteps.find((s) => s.name === name);

const engine = createWorkflowLiquidEngine();

const renderString = (template: string, context: Record<string, unknown>): string =>
  engine.parseAndRenderSync(template, context);

const evalExpr = (expr: string, context: Record<string, unknown>): unknown => {
  const trimmed = expr.trim();
  if (trimmed.startsWith('${{') && trimmed.endsWith('}}')) {
    return engine.evalValueSync(trimmed.slice(3, -2).trim(), context);
  }
  return renderString(trimmed, context);
};

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

describe('floor_alert_triage_review — inputs', () => {
  const trigger = parsed.triggers.find(({ type }) => type === 'manual');

  it('is started by the Worker, so it only has a manual trigger', () => {
    expect(parsed.triggers.map(({ type }) => type)).toEqual(['manual']);
  });

  it('requires what the proposal cannot do without', () => {
    expect(trigger?.inputs?.required).toEqual(
      expect.arrayContaining(['conversation_id', 'rule_id', 'fp_candidate_ids', 'confidence_floor'])
    );
  });

  it('accepts only the two autonomy levels the Worker offers', () => {
    const autonomy = trigger?.inputs?.properties.autonomy as { enum: string[] };
    expect(autonomy.enum).toEqual(['manual', 'supervised']);
  });

  it('bounds the candidate list and never proposes an empty closure', () => {
    const candidates = trigger?.inputs?.properties.fp_candidate_ids as {
      minItems: number;
      maxItems: number;
    };
    expect(candidates.minItems).toBe(1);
    expect(candidates.maxItems).toBeGreaterThan(0);
  });
});

describe('floor_alert_triage_review — no concurrency limit', () => {
  // A per-rule cap on waiting reviews used to skip further proposals and strand their alerts, which
  // carry a verdict and are never planned again. It was removed on purpose; noisy rules are to be
  // identified separately. Adding a concurrency setting back is a product decision, not a tweak.
  it('does not limit how many reviews wait for a decision', () => {
    expect(parsed.settings.concurrency).toBeUndefined();
  });
});

describe('floor_alert_triage_review — proposal', () => {
  const proposal = stepByName('create_fp_proposal');
  const proposalInputs = proposal?.with?.inputs as Record<string, string>;

  it('counts the candidates from the input list', () => {
    const count = stepByName('count_fp_candidates')?.with?.fp_candidate_count as string;
    expect(evalExpr(count, { inputs: { fp_candidate_ids: ['a', 'b', 'c'] } })).toBe(3);
  });

  // The grouping step builds the text, because it rebuilds it on every join. One builder keeps
  // the first revision and the later ones worded alike.
  it('takes its title and comment from the inputs instead of building them', () => {
    expect(renderString(proposalInputs.title, { inputs: { title: 'Close 3 alerts' } })).toBe(
      'Close 3 alerts'
    );
    expect(renderString(proposalInputs.comment, { inputs: { comment: 'Because.' } })).toBe(
      'Because.'
    );
  });

  // A batch started before the upgrade sends `entity_summary` and no title or comment.
  it('builds the text itself for a batch that sends no title or comment', () => {
    const context = {
      inputs: { entity_summary: 'on host-1', rule_name: 'R', confidence_floor: 0.8 },
      variables: { fp_candidate_count: 1 },
    };
    expect(renderString(proposalInputs.title, context)).toBe(
      'Close alert on host-1 as false positive'
    );
    expect(renderString(proposalInputs.comment, context)).toContain(
      '1 alert(s) from rule "R" was classified as false positives'
    );
    const trigger = parsed.triggers.find(({ type }) => type === 'manual');
    expect(trigger?.inputs?.required).not.toContain('title');
  });

  it('creates the proposal under the id the batch chose, so the batch knows its root id', () => {
    expect(evalExpr(proposalInputs.proposalId, { inputs: { proposal_id: 'abc' } })).toBe('abc');
    // `${{ }}` keeps an absent id undefined. `{{ }}` would send '' and fail the UUID check.
    expect(proposalInputs.proposalId).toMatch(/^\$\{\{/);
  });

  it('closes exactly the candidate ids it was given', () => {
    expect(proposal?.with?.['workflow-id']).toBe('system-create-alertzero-proposal');
    expect(proposalInputs.actionWorkflowId).toBe('system-alertzero-action-close-alerts-fp');
    expect(
      evalExpr((proposalInputs.actionInput as unknown as { alertIds: string }).alertIds, {
        inputs: { fp_candidate_ids: ['a', 'b'] },
      })
    ).toEqual(['a', 'b']);
  });
});

// ---------------------------------------------------------------------------
// A create that collides: another batch created the proposal id first
// ---------------------------------------------------------------------------
describe('floor_alert_triage_review — create collision', () => {
  const create = stepByName('create_fp_proposal');

  // `fallback` alone re-throws the original error afterwards (on_failure/fallback_step/README.md),
  // which would fail the run even when the join worked.
  it('joins the owner in the fallback, and keeps going so the join can end the run as joined', () => {
    expect(create?.['on-failure']?.continue).toBe(true);
    const join = create?.['on-failure']?.fallback?.find(({ name }) => name === 'join_on_collision');
    expect(join?.type).toBe('alertzero.triage.joinProposal');
    // Search lag is the usual cause of a collision, so the join retries before it gives up.
    expect(join?.['on-failure']?.retry?.['max-attempts']).toBe(3);
    expect(join?.['on-failure']?.continue).toBe(true);
    expect(join?.with?.proposal_id).toBe('{{ inputs.proposal_id }}');
    expect(join?.with?.alert_ids).toBe('${{ inputs.fp_candidate_ids }}');
  });

  it('ends as completed, without the outcome branches, when the join worked', () => {
    const joined = stepByName('handle_proposal_joined');
    expect(joined?.condition).toBe(
      '${{ steps.create_fp_proposal.error != blank and steps.join_on_collision.output.joined == true }}'
    );
    const names = flatten(joined?.steps ?? []).map(({ name }) => name);
    expect(names).toEqual(
      expect.arrayContaining(['post_comment_proposal_joined', 'close_investigation_after_join'])
    );
    // The owner gets the alerts and the same join message as a join made when the batch ran.
    expect(names).toEqual(
      expect.arrayContaining(['tag_joined_alert_chunk', 'post_comment_joined_owner'])
    );
    expect(stepByName('attach_joined_alerts')).toBeUndefined();
    // Its Investigation tag puts them in the owner's Investigation, whose attachment matches it.
    expect(stepByName('tag_joined_alerts')?.foreach).toBe(
      '${{ steps.join_on_collision.output.alert_ids | chunk: 500 | json }}'
    );
    expect(stepByName('tag_joined_alert_chunk')?.with?.tags).toEqual({
      tags_to_add: ['az:triage_investigation:{{ steps.join_on_collision.output.conversation_id }}'],
      tags_to_remove: [],
    });
    const message = (stepByName('post_comment_joined_owner')?.with as { message: string }).message;
    expect(
      renderString(message, {
        workflow: { spaceId: 'team' },
        inputs: { rule_name: 'Rule A' },
        variables: { joined_alert_count: 2 },
        steps: { join_on_collision: { output: { revision: 3, alerts_page_query: '?filters=x' } } },
      })
    ).toContain('[View the added alerts](/s/team/app/security/alerts?filters=x)');
    // Alerts the owner already held add nothing to say.
    expect(
      evalExpr(stepByName('post_comment_joined_owner')?.if as string, {
        variables: { joined_alert_count: 0 },
      })
    ).toBe(false);
    const end = stepByName('end_joined') as YamlStep & { status?: string };
    expect(end.type).toBe('workflow.output');
    expect(end.status).toBe('completed');
    // Nothing runs between the join and the outcome branches that could skip the end.
    const order = parsed.steps.map(({ name }) => name);
    expect(order.indexOf('handle_proposal_joined')).toBeLessThan(order.indexOf('get_proposal'));
  });

  it('re-tags the candidates and fails the run when nothing could take them', () => {
    const failed = stepByName('handle_proposal_failed');
    expect(failed?.condition).toBe('${{ steps.create_fp_proposal.error != blank }}');
    const names = flatten(failed?.steps ?? []).map(({ name }) => name);
    expect(names).toEqual(
      expect.arrayContaining(['retag_proposal_failed', 'post_comment_proposal_failed'])
    );
    expect(stepByName('fail_proposal_failed')?.type).toBe('workflow.fail');
    const order = parsed.steps.map(({ name }) => name);
    expect(order.indexOf('handle_proposal_joined')).toBeLessThan(
      order.indexOf('handle_proposal_failed')
    );
  });
});

// ---------------------------------------------------------------------------
// Joins add alerts while the proposal waits, so the outcome acts on the live revision
// ---------------------------------------------------------------------------
describe('floor_alert_triage_review — live revision', () => {
  it('reads the head of the chain, retrying before it falls back to the input list', () => {
    const read = stepByName('get_live_revision');
    expect(read?.type).toBe('proposals.getLatestRevision');
    expect(read?.['on-failure']?.retry?.['max-attempts']).toBe(3);
    expect(read?.['on-failure']?.continue).toBe(true);
  });

  it('does not close the Investigation on dismissal or expiry when the live revision could not be read', () => {
    expect(stepByName('close_investigation_after_dismissal')?.if).toBe(
      '${{ steps.get_live_revision.error == blank }}'
    );
    expect(stepByName('close_investigation_after_expiry')?.if).toBe(
      '${{ steps.get_live_revision.error == blank }}'
    );
  });

  it('takes the alerts of the live revision, even when it is empty, and the input list only when it could not be read', () => {
    const fallback = stepByName('resolve_live_alerts_fallback');
    expect(
      evalExpr(fallback?.with?.live_alert_ids as string, { inputs: { fp_candidate_ids: ['a'] } })
    ).toEqual(['a']);
    const live = stepByName('resolve_live_alerts');
    expect(live?.if).toBe('${{ steps.get_live_revision.error == blank }}');
    const expr = live?.with?.live_alert_ids as string;
    expect(
      evalExpr(expr, {
        steps: { get_live_revision: { output: { actionInput: { alertIds: ['a', 'b'] } } } },
      })
    ).toEqual(['a', 'b']);
    expect(
      evalExpr(expr, {
        steps: { get_live_revision: { output: { actionInput: { alertIds: [] } } } },
      })
    ).toEqual([]);
  });

  it('passes the live alerts and the ones the review started with, so removed alerts are not stranded', () => {
    const expr = stepByName('resolve_retag_alerts')?.with?.retag_alert_ids as string;
    // a and b started the review, an analyst removed b, and c joined later
    expect(
      evalExpr(expr, {
        inputs: { fp_candidate_ids: ['a', 'b'] },
        variables: { live_alert_ids: ['a', 'c'] },
      })
    ).toEqual(['a', 'c', 'b']);
  });

  it('counts the alerts of the live revision in every outcome comment', () => {
    const count = stepByName('count_live_alerts')?.with?.fp_candidate_count as string;
    expect(evalExpr(count, { variables: { live_alert_ids: ['a', 'b', 'c'] } })).toBe(3);
  });

  it('reports how many revisions the proposal reached', () => {
    const revisions = stepByName('report_closure_resolved')?.with?.revisions as string;
    expect(evalExpr(revisions, { variables: { live_revision: 4 } })).toBe(4);
  });
});

// `kibana.SetAlertTags` validates its body: both lists are required, even when one is empty. A call
// that only adds a tag fails with HTTP 400 at run time, and `continue: true` hides it.
describe('floor_alert_triage_review — kibana.SetAlertTags calls', () => {
  it('send both tag lists, so none is rejected by the route', () => {
    const calls = allSteps.filter((step) => step.type === 'kibana.SetAlertTags');
    calls.forEach((step) => {
      const tags = step.with?.tags as Record<string, unknown>;
      expect({ step: step.name, add: Array.isArray(tags?.tags_to_add) }).toEqual({
        step: step.name,
        add: true,
      });
      expect({ step: step.name, remove: Array.isArray(tags?.tags_to_remove) }).toEqual({
        step: step.name,
        remove: true,
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Dismiss mapping: map_dismiss_reason_to_tag
// ---------------------------------------------------------------------------

const mapDismissReasonToTag = stepByName('map_dismiss_reason_to_tag');
const dismissedTagTemplate = mapDismissReasonToTag?.with?.dismissed_tag as string;

const evaluateDismissedTag = (dismissReason: string | undefined): string => {
  const context = {
    steps: {
      get_proposal: {
        output: { dismissReason },
      },
    },
  };
  return renderString(dismissedTagTemplate, context).trim();
};

describe('floor_alert_triage_review — dismiss mapping', () => {
  it.each([
    'no_reason',
    'duplicate',
    'false_positive',
    'handled_elsewhere',
    'risk_accepted',
    'other',
  ])('maps dismissReason "%s" to az:inconclusive', (reason) => {
    expect(evaluateDismissedTag(reason)).toBe('az:inconclusive');
  });

  it('maps a missing dismissReason (undefined) to az:inconclusive', () => {
    expect(evaluateDismissedTag(undefined)).toBe('az:inconclusive');
  });

  it('only a dismissal removes az:model_fp, because a human disagreed with the verdict', () => {
    expect(stepByName('retag_dismissed_alerts')?.with?.drop_model_fp).toBe(true);
    [
      'retag_approved_leftovers',
      'retag_dismissed_read_failed',
      'retag_expired_alerts',
      'retag_unknown_alerts',
      'retag_proposal_failed',
    ].forEach((name) => expect(stepByName(name)?.with?.drop_model_fp).toBeUndefined());
  });
});

describe('floor_alert_triage_review — guard_get_proposal_readable', () => {
  it('retries get_proposal before continue: true takes over', () => {
    const getProposal = stepByName('get_proposal');
    expect(getProposal?.type).toBe('proposals.getProposal');
    expect(getProposal?.['on-failure']?.retry?.['max-attempts']).toBe(3);
    expect(getProposal?.['on-failure']?.continue).toBe(true);
  });

  it('gates the retag/close on the read having succeeded, with a preserve-and-warn else', () => {
    const guard = stepByName('guard_get_proposal_readable');
    expect(guard?.condition).toBe('${{ steps.get_proposal.error == blank }}');
    expect(guard?.condition).not.toContain('|');

    expect(guard?.steps?.some((s) => s.name === 'map_dismiss_reason_to_tag')).toBe(true);
    expect(guard?.steps?.some((s) => s.name === 'retag_dismissed_alerts')).toBe(true);
    expect(guard?.steps?.some((s) => s.name === 'close_investigation_after_dismissal')).toBe(true);
    expect(guard?.else?.some((s) => s.name === 'post_comment_dismissed_read_failed')).toBe(true);
  });

  it('evaluates the guard true on success and false after a failed read', () => {
    expect(
      evalExpr('${{ steps.get_proposal.error == blank }}', { steps: { get_proposal: {} } })
    ).toBe(true);
    expect(
      evalExpr('${{ steps.get_proposal.error == blank }}', {
        steps: { get_proposal: { error: { message: 'timeout' } } },
      })
    ).toBe(false);
  });

  it('reports the read failure without claiming any alert was re-tagged', () => {
    const comment = stepByName('post_comment_dismissed_read_failed');
    const template = (comment?.with as { message?: string } | undefined)?.message ?? '';
    const rendered = renderString(template, {
      steps: { get_proposal: { error: { message: 'timeout after 3 attempts' } } },
      variables: { fp_candidate_count: 4 },
    });

    expect(rendered).toContain('could not be read after');
    expect(rendered).toContain('timeout after 3 attempts');
    expect(rendered).toContain('4 alerts were re-tagged az:inconclusive');
  });
});

// ---------------------------------------------------------------------------
// post_comment_outcome_dismissed — rationale truncation and escaping
// ---------------------------------------------------------------------------

const dismissedComment = stepByName('post_comment_outcome_dismissed');
const dismissedInputTemplate = (dismissedComment?.with as Record<string, unknown>)
  ?.message as string;

const renderDismissedComment = ({
  dismissReason = 'no_reason',
  rationale,
  decidedBy,
  dismissedTag = 'az:inconclusive',
  fpCandidateCount = 2,
  failedRetagCount = 0,
}: {
  dismissReason?: string;
  rationale?: string;
  decidedBy?: { username: string };
  dismissedTag?: string;
  fpCandidateCount?: number;
  failedRetagCount?: number;
}): string => {
  return renderString(dismissedInputTemplate, {
    steps: {
      get_proposal: {
        output: { decision: 'dismissed', dismissReason, rationale, decidedBy },
      },
    },
    variables: {
      dismissed_tag: dismissedTag,
      fp_candidate_count: fpCandidateCount,
      failed_retag_count: failedRetagCount,
    },
  });
};

describe('floor_alert_triage_review — post_comment_outcome_dismissed', () => {
  it('includes the dismiss reason', () => {
    const comment = renderDismissedComment({ dismissReason: 'handled_elsewhere' });
    expect(comment).toContain('handled_elsewhere');
  });

  it('truncates a long rationale to 500 characters', () => {
    const longRationale = 'x'.repeat(5000);
    const comment = renderDismissedComment({ rationale: longRationale });
    // Liquid truncate: 500 appends "..." making total ≤ 500
    const rationaleSection = comment.match(/Rationale: "(.+?)"\./)?.[1];
    expect(rationaleSection).toBeDefined();
    expect((rationaleSection ?? '').length).toBeLessThanOrEqual(500);
  });

  it('escapes HTML in the rationale', () => {
    const comment = renderDismissedComment({ rationale: '<script>alert(1)</script>' });
    expect(comment).not.toContain('<script>');
    expect(comment).toContain('&lt;script&gt;');
  });

  it('omits the rationale section when rationale is blank', () => {
    const comment = renderDismissedComment({ rationale: '' });
    expect(comment).not.toContain('Rationale');
  });

  it('names the decider when decidedBy is present', () => {
    const comment = renderDismissedComment({ decidedBy: { username: 'analyst1' } });
    expect(comment).toContain('@analyst1');
  });

  it('claims every FP candidate was re-tagged when no per-alert retag failed', () => {
    const comment = renderDismissedComment({ fpCandidateCount: 3, failedRetagCount: 0 });
    expect(comment).toContain('3 alerts re-tagged');
    expect(comment).not.toContain('failed after retries');
  });

  it('reports the shortfall instead of claiming full success when a retag failed', () => {
    const comment = renderDismissedComment({ fpCandidateCount: 3, failedRetagCount: 1 });
    expect(comment).toContain('2 of 3 alerts re-tagged');
    expect(comment).toContain('1 failed after retries and needs manual re-tagging');
  });

  it('says "alert" rather than "alerts" for a single FP candidate', () => {
    const comment = renderDismissedComment({ fpCandidateCount: 1, failedRetagCount: 0 });
    expect(comment).toContain('1 alert re-tagged');
    expect(comment).not.toContain('alerts');
  });
});

// ---------------------------------------------------------------------------
// The re-tag step: failures are counted, not swallowed by `continue: true`
// ---------------------------------------------------------------------------

describe('floor_alert_triage_review — re-tag failure tracking', () => {
  it('initializes the failure counter once, for every outcome', () => {
    expect(stepByName('resolve_retag_alerts')?.with?.failed_retag_count).toBe(0);
  });

  it('retries the re-tag step, then continues past a persistent failure', () => {
    const retag = stepByName('retag_dismissed_alerts');
    expect(retag?.type).toBe('alertzero.triage.retagProposalAlerts');
    expect(retag?.['on-failure']?.retry?.['max-attempts']).toBe(3);
    expect(retag?.['on-failure']?.continue).toBe(true);
  });

  it.each([
    ['record_retag_failures', 'retag_dismissed_alerts'],
    ['record_expired_retag_failures', 'retag_expired_alerts'],
    ['record_unknown_retag_failures', 'retag_unknown_alerts'],
    ['record_dismissed_read_failed_retag_failures', 'retag_dismissed_read_failed'],
  ])('%s counts the failed alerts, or every candidate when the step failed', (name, retagName) => {
    const expr = stepByName(name)?.with?.failed_retag_count as string;
    const variables = { fp_candidate_count: 7 };
    expect(evalExpr(expr, { variables, steps: { [retagName]: { output: { failed: 2 } } } })).toBe(
      2
    );
    expect(evalExpr(expr, { variables, steps: { [retagName]: { output: { failed: 0 } } } })).toBe(
      0
    );
    expect(evalExpr(expr, { variables, steps: { [retagName]: { error: { message: 'x' } } } })).toBe(
      7
    );
  });
});

// ---------------------------------------------------------------------------
// ai.conversation.metadata.patch — required experimental-features gating
//
// The step handler errors when `agentBuilder:experimentalFeatures` is off
// (see agent_builder/server/workflows/steps/update_conversation_metadata.ts).
// Every "close the Investigation" step must survive that: `fallback` alone still
// re-throws the original error afterwards (on_failure/README.md — "workflow still
// fails after fallback execution"), so `continue: true` is required alongside it,
// or the run aborts and any step after the patch (e.g. the outcome comment) never runs.
// ---------------------------------------------------------------------------
describe('floor_alert_triage_review — ai.conversation.metadata.patch failure handling', () => {
  const patchSteps = allSteps.filter((step) => step.type === 'ai.conversation.metadata.patch');

  it('finds every conversation-close step this workflow defines', () => {
    expect(patchSteps.map((step) => step.name).sort()).toEqual([
      'close_investigation_after_approval',
      'close_investigation_after_dismissal',
      'close_investigation_after_expiry',
      'close_investigation_after_join',
    ]);
  });

  it.each([
    'close_investigation_after_approval',
    'close_investigation_after_dismissal',
    'close_investigation_after_expiry',
  ])(
    '"%s" survives a patch failure via fallback + continue, so the step after it still runs',
    (name) => {
      const step = stepByName(name);
      expect(step?.['on-failure']?.continue).toBe(true);
      expect(step?.['on-failure']?.fallback?.length).toBeGreaterThan(0);
    }
  );
});

// ---------------------------------------------------------------------------
// Proposal gate outcomes
//
// `system-create-alertzero-proposal` completes normally on every outcome, including an unanswered
// deadline, so a timeout never reaches `create_fp_proposal`'s on-failure fallback. Each
// outcome therefore needs its own branch, and an expiry must not be read as a dismissal.
// ---------------------------------------------------------------------------
describe('floor_alert_triage_review — proposal outcomes', () => {
  const outcomeTemplate = stepByName('resolve_proposal_outcome')?.with?.proposal_outcome as string;
  const resolveOutcome = (output: { status?: string; decision?: string }): string =>
    renderString(outcomeTemplate, { steps: { create_fp_proposal: { output } } }).trim();

  it.each([
    [{ status: 'succeeded', decision: 'approved' }, 'approved'],
    [{ status: 'no_action', decision: 'dismissed' }, 'dismissed'],
    [{ status: 'expired', decision: '' }, 'expired'],
    [{ status: 'pending', decision: '' }, 'unknown'],
    [{}, 'unknown'],
  ])('resolves %j to "%s"', (output, expected) => {
    expect(resolveOutcome(output)).toBe(expected);
  });

  it.each([
    ['handle_approved', 'approved'],
    ['handle_dismissed', 'dismissed'],
    ['handle_expired', 'expired'],
    ['handle_unknown_outcome', 'unknown'],
  ])('"%s" runs only for the "%s" outcome', (branchName, outcome) => {
    expect(stepByName(branchName)?.condition).toBe(
      `\${{ variables.proposal_outcome == '${outcome}' }}`
    );
  });

  const branchStepNames = (branchName: string) =>
    flatten(stepByName(branchName)?.steps ?? []).map((step) => step.name);

  it('closes the Investigation after an approval, a dismissal, and an expiry', () => {
    expect(branchStepNames('handle_approved')).toContain('close_investigation_after_approval');
    expect(branchStepNames('handle_dismissed')).toContain('close_investigation_after_dismissal');
    expect(branchStepNames('handle_expired')).toContain('close_investigation_after_expiry');
  });

  it('re-tags alerts on a dismissal and on every outcome that leaves them unclosed', () => {
    expect(branchStepNames('handle_dismissed')).toContain('retag_dismissed_alerts');
    expect(branchStepNames('handle_expired')).toContain('retag_expired_alerts');
    expect(branchStepNames('handle_unknown_outcome')).toContain('retag_unknown_alerts');
    expect(branchStepNames('handle_dismissed')).toContain('retag_dismissed_read_failed');
    expect(branchStepNames('handle_proposal_failed')).toContain('retag_proposal_failed');
  });

  // The approved alerts are closed and keep az:false_positive. What the approval did not close
  // (an analyst removed it from the proposal) must not stay az:false_positive for good.
  it('re-tags only what an approval did not close', () => {
    const retag = stepByName('retag_approved_leftovers');
    expect(branchStepNames('handle_approved')).toContain('retag_approved_leftovers');
    expect(retag?.type).toBe('alertzero.triage.retagProposalAlerts');
    expect(retag?.with?.exclude_alert_ids).toBe('${{ variables.live_alert_ids }}');
  });

  it('reports a failed sweep of the leftovers in the count and the comment', () => {
    const expr = stepByName('record_approved_retag_failures')?.with?.failed_retag_count as string;
    expect(evalExpr(expr, { steps: { retag_approved_leftovers: { output: { failed: 3 } } } })).toBe(
      3
    );
    const template = (stepByName('post_comment_outcome_approved')?.with as { message: string })
      .message;
    const render = (context: Record<string, unknown>) =>
      renderString(template, {
        variables: { fp_candidate_count: 2, failed_retag_count: 0 },
        ...context,
      });
    expect(
      render({ steps: { retag_approved_leftovers: { error: { message: 'x' } }, get_proposal: {} } })
    ).toContain('did not fully succeed');
    expect(
      render({
        steps: {
          retag_approved_leftovers: { output: { matched: 0, failed: 0 } },
          get_proposal: {},
        },
      })
    ).not.toContain('did not fully succeed');
  });

  it('re-tags by the proposal tag and by id, in every outcome that uses the live revision', () => {
    [
      'retag_approved_leftovers',
      'retag_dismissed_alerts',
      'retag_dismissed_read_failed',
      'retag_expired_alerts',
      'retag_unknown_alerts',
    ].forEach((name) => {
      const retag = stepByName(name);
      expect(retag?.type).toBe('alertzero.triage.retagProposalAlerts');
      expect(retag?.with?.proposal_id).toContain('inputs.proposal_id');
      expect(retag?.with?.alert_ids).toBe('${{ variables.retag_alert_ids }}');
      expect(retag?.['on-failure']?.retry?.['max-attempts']).toBe(3);
      expect(retag?.['on-failure']?.continue).toBe(true);
    });
  });

  // After a collision the proposal id belongs to another batch's proposal: its alerts keep their tag.
  it('re-tags a failed create by id only', () => {
    const retag = stepByName('retag_proposal_failed');
    expect(retag?.with?.proposal_id).toBeUndefined();
    expect(retag?.with?.alert_ids).toBe('${{ inputs.fp_candidate_ids }}');
  });

  it('keeps no kibana.SetAlertTags step that re-tags: the typed step does every re-tag', () => {
    const setTags = allSteps.filter((step) => step.type === 'kibana.SetAlertTags');
    // The only one adds the owner's Investigation tag to joined alerts and removes nothing.
    expect(setTags.map(({ name }) => name)).toEqual(['tag_joined_alert_chunk']);
    expect((setTags[0].with?.tags as { tags_to_remove: string[] }).tags_to_remove).toEqual([]);
  });

  it.each([
    [1, 'is re-tagged az:inconclusive', 'it is still open'],
    [3, 'are re-tagged az:inconclusive', 'they are still open'],
  ])(
    'post_comment_outcome_expired does not claim %i candidate alert(s) are still open',
    (count, tagged, stillOpen) => {
      // A closure attempt that partially succeeded before the proposal expired can leave some
      // candidates already closed, so the comment must not assert they all remain open.
      const comment = stepByName('post_comment_outcome_expired');
      const template = (comment?.with as { message?: string } | undefined)?.message ?? '';
      const rendered = renderString(template, { variables: { fp_candidate_count: count } });

      expect(rendered).toContain(tagged);
      expect(rendered).toContain('may already be closed');
      expect(rendered).toContain(`rather than assuming ${stillOpen}`);
      expect(rendered).not.toContain('remain open');
      // Expiry also follows an approved close that failed and was re-parked, so the comment
      // must not claim nobody decided.
      expect(rendered).not.toContain('No decision was made');
    }
  );

  it('leaves the Investigation open on an unexpected outcome', () => {
    expect(
      flatten(stepByName('handle_unknown_outcome')?.steps ?? []).some(
        (step) => step.type === 'ai.conversation.metadata.patch'
      )
    ).toBe(false);
  });

  it('post_comment_outcome_unknown reports ambiguity instead of claiming every candidate remains open', () => {
    // action_close_alerts_false_positive's fail_incomplete_close can fire after some alerts
    // already closed (conflicts: proceed), so this outcome must not assert a specific
    // closed/open count it cannot actually observe.
    const comment = stepByName('post_comment_outcome_unknown');
    const template = (comment?.with as { message?: string } | undefined)?.message ?? '';
    const rendered = renderString(template, {
      steps: { create_fp_proposal: { output: { status: 'failed' } } },
      variables: { fp_candidate_count: 2 },
    });

    expect(rendered).not.toContain('2 alert(s) remain open');
    expect(rendered).toContain('may already be closed');
    expect(rendered).toContain('check each alert');
  });

  it.each([
    ['close_investigation_after_approval', 'false_positive'],
    ['close_investigation_after_dismissal', 'other'],
    ['close_investigation_after_expiry', 'other'],
  ])('"%s" closes with close_reason "%s"', (name, closeReason) => {
    expect(stepByName(name)?.with?.updates).toEqual({
      status: 'closed',
      close_reason: closeReason,
    });
  });
});

// ---------------------------------------------------------------------------
// Autonomy: Supervised must actually auto-close
// ---------------------------------------------------------------------------
describe('floor_alert_triage_review — autonomy', () => {
  const autoApproveExpr = (
    (stepByName('create_fp_proposal')?.with?.inputs as Record<string, unknown>)
      ?.autoApprove as string
  ).trim();

  it.each([
    ['supervised', true],
    ['manual', false],
  ])('autonomy "%s" sets autoApprove to %s', (autonomy, expected) => {
    expect(evalExpr(autoApproveExpr, { inputs: { autonomy } })).toBe(expected);
  });

  // The proposal gate forces a human decision for an `always-gate` action regardless of
  // `autoApprove`, which would make Supervised behave exactly like Manual.
  it('the close action defers to autonomy instead of always gating', () => {
    const action = parse(ACTION_CLOSE_ALERTS_FALSE_POSITIVE_YAML) as {
      consts: { actionMetadata: { approvalPolicy: string } };
    };
    expect(action.consts.actionMetadata.approvalPolicy).toBe('autonomy-dependent');
  });
});

// ---------------------------------------------------------------------------
// Run timeout
// ---------------------------------------------------------------------------
describe('floor_alert_triage_review — settings.timeout', () => {
  // The Worker Investigation lifecycle contract puts the proposal gate's ceiling at 168 h.
  it('outlives the proposal gate ceiling', () => {
    const hours = Number(/^(\d+)h$/.exec(parsed.settings.timeout)?.[1]);
    expect(hours).toBeGreaterThan(168);
  });
});
