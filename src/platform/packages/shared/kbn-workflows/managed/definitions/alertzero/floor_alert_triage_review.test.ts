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

describe('floor_alert_triage_review — proposal comment', () => {
  const proposal = stepByName('create_fp_proposal');
  const proposalInputs = proposal?.with?.inputs as Record<string, string>;
  const context = {
    inputs: { rule_name: 'Noisy rule', confidence_floor: 0.85 },
    variables: { fp_candidate_count: 3 },
  };

  it('counts the candidates from the input list', () => {
    const count = stepByName('count_fp_candidates')?.with?.fp_candidate_count as string;
    expect(evalExpr(count, { inputs: { fp_candidate_ids: ['a', 'b', 'c'] } })).toBe(3);
  });

  it('names the rule, the number of alerts and the confidence floor', () => {
    const comment = renderString(proposalInputs.comment, context);
    expect(comment).toContain('3 alerts from rule "Noisy rule" were classified');
    expect(comment).toContain('(0.85)');
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

  it('retag_dismissed_chunk never removes the tag it adds', () => {
    const tags = stepByName('retag_dismissed_chunk')?.with?.tags as {
      tags_to_remove?: string[];
      tags_to_add?: string[];
    };

    expect(tags?.tags_to_remove).toEqual(['az:false_positive']);
    // dismissed_tag is a variable, so check the value it resolves to.
    expect(tags?.tags_to_remove).not.toContain(evaluateDismissedTag(undefined));
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
    expect(rendered).toContain('4 alerts remain tagged az:false_positive and untouched');
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
// retag_dismissed_alerts — per-alert tag-update failures are counted, not
// silently swallowed by `continue: true` on the tag steps
// ---------------------------------------------------------------------------

describe('floor_alert_triage_review — retag_dismissed_alerts failure tracking', () => {
  it('initializes the failure counter alongside the dismissed_tag mapping', () => {
    const mapStep = stepByName('map_dismiss_reason_to_tag');
    expect(mapStep?.with?.failed_retag_count).toBe(0);
  });

  it('retries retag_dismissed_chunk, then continues past a persistent failure', () => {
    const retag = stepByName('retag_dismissed_chunk');

    expect(retag?.['on-failure']?.retry?.['max-attempts']).toBe(3);
    expect(retag?.['on-failure']?.continue).toBe(true);
  });

  // `continue: true` on a foreach exits the whole loop at the first inner failure, so the
  // remaining candidates would never be re-tagged and the shortfall counters would never run.
  it('does not put continue on the loop itself, which would abandon the remaining candidates', () => {
    const loop = stepByName('retag_dismissed_alerts');

    expect(loop?.['on-failure']).toBeUndefined();
  });

  it('increments the counter when the tag call recorded an error', () => {
    const recordFailure = stepByName('record_retag_step_failure');
    expect(recordFailure?.type).toBe('data.set');
    expect(recordFailure?.if).toBe('${{ steps.retag_dismissed_chunk.error != blank }}');

    const noError = { steps: { retag_dismissed_chunk: { output: { updated: 1 } } } };
    const failed = { steps: { retag_dismissed_chunk: { error: { message: 'x' } } } };

    expect(evalExpr(recordFailure!.if!, noError)).toBe(false);
    expect(evalExpr(recordFailure!.if!, failed)).toBe(true);

    expect(
      evalExpr(recordFailure!.with!.failed_retag_count as string, {
        variables: { failed_retag_count: 1 },
        foreach: { item: ['a'] },
      })
    ).toBe(2);
  });

  it('increments the counter when update-by-query succeeds but updates fewer alerts than requested', () => {
    const recordPartial = stepByName('record_retag_partial_failure');
    expect(recordPartial?.type).toBe('data.set');

    const partial = {
      steps: {
        retag_dismissed_chunk: {
          output: { updated: 3, failures: [{ id: 'd' }], version_conflicts: 0 },
        },
      },
      foreach: { item: ['a', 'b', 'c', 'd'] },
    };
    const full = {
      steps: { retag_dismissed_chunk: { output: { updated: 4, failures: [] } } },
      foreach: { item: ['a', 'b', 'c', 'd'] },
    };
    const stepError = {
      steps: { retag_dismissed_chunk: { error: { message: 'x' }, output: { updated: 2 } } },
      foreach: { item: ['a', 'b', 'c', 'd'] },
    };

    expect(evalExpr(recordPartial!.if!, partial)).toBe(true);
    expect(evalExpr(recordPartial!.if!, full)).toBe(false);
    // HTTP error is owned by record_retag_step_failure — do not double-count via a stale updated.
    expect(evalExpr(recordPartial!.if!, stepError)).toBe(false);

    // Accumulator 2 + (4 requested - 3 updated) = 3.
    expect(
      evalExpr(recordPartial!.with!.failed_retag_count as string, {
        variables: { failed_retag_count: 2 },
        ...partial,
      })
    ).toBe(3);
  });

  it('counts every alert of a failed chunk, so the comment reports alerts rather than calls', () => {
    const recordFailure = stepByName('record_retag_step_failure');
    expect(
      evalExpr(recordFailure?.with?.failed_retag_count as string, {
        variables: { failed_retag_count: 3 },
        foreach: { item: Array.from({ length: 500 }, (_, i) => `alert-${i}`) },
      })
    ).toBe(503);
  });

  it('counts only the shortfall when some alerts in the chunk updated', () => {
    const recordPartial = stepByName('record_retag_partial_failure');
    expect(
      evalExpr(recordPartial?.with?.failed_retag_count as string, {
        variables: { failed_retag_count: 0 },
        foreach: { item: Array.from({ length: 500 }, (_, i) => `alert-${i}`) },
        steps: { retag_dismissed_chunk: { output: { updated: 497, failures: [{}] } } },
      })
    ).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// retag_dismissed_alerts — candidates are re-tagged in bulk, not one call per alert
// ---------------------------------------------------------------------------

describe('floor_alert_triage_review — retag_dismissed_alerts chunking', () => {
  const loop = stepByName('retag_dismissed_alerts');
  const candidateIds = (count: number): string[] =>
    Array.from({ length: count }, (_, i) => `alert-${i + 1}`);

  const renderChunks = (ids: string[]): string[][] =>
    JSON.parse(
      renderString((loop?.foreach ?? '').replace(/^\$\{\{/, '{{').trim(), {
        inputs: { fp_candidate_ids: ids },
      })
    );

  it('iterates chunks of the candidate list rather than single ids', () => {
    expect(loop?.type).toBe('foreach');
    expect(loop?.foreach).toContain('inputs.fp_candidate_ids');
    expect(loop?.foreach).toContain('chunk: 500');
  });

  it('passes the whole chunk as the ids of the tag call', () => {
    expect(stepByName('retag_dismissed_chunk')?.with?.ids).toBe('${{ foreach.item }}');
  });

  it('makes one call for a typical batch instead of one per alert', () => {
    expect(renderChunks(candidateIds(50))).toHaveLength(1);
    expect(renderChunks(candidateIds(500))).toHaveLength(1);
  });

  it('bounds the loop at 20 iterations for the largest accepted candidate list', () => {
    const inputs = parsed.triggers.find(({ type }) => type === 'manual')?.inputs?.properties as {
      fp_candidate_ids: { maxItems: number };
    };
    const chunks = renderChunks(candidateIds(inputs.fp_candidate_ids.maxItems));

    expect(chunks).toHaveLength(20);
    expect(chunks.flat()).toEqual(candidateIds(inputs.fp_candidate_ids.maxItems));
    chunks.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(500));
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

  it('re-tags alerts only on a dismissal, never on an expiry', () => {
    expect(branchStepNames('handle_dismissed')).toContain('retag_dismissed_alerts');
    expect(branchStepNames('handle_expired')).not.toContain('retag_dismissed_alerts');
    expect(
      flatten(stepByName('handle_expired')?.steps ?? []).some(
        (step) => step.type === 'kibana.SetAlertTags'
      )
    ).toBe(false);
  });

  it.each([
    [1, 'is tagged az:false_positive', 'it is still open'],
    [3, 'are tagged az:false_positive', 'they are still open'],
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
