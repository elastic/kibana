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
import { ConcurrencySettingsSchema } from '../../../spec/schema';
import { ConcurrencySlotOccupyingExecutionStatuses, ExecutionStatus } from '../../../types/latest';

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
  settings: { timeout: string; concurrency: { key: string; strategy: string; max: number } };
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
// Inputs and the per-rule limit
// ---------------------------------------------------------------------------

describe('floor_alert_triage_review — inputs', () => {
  const trigger = parsed.triggers.find(({ type }) => type === 'manual');

  it('is started by the Worker, so it only has a manual trigger', () => {
    expect(parsed.triggers.map(({ type }) => type)).toEqual(['manual']);
  });

  it('requires what the proposal and the per-rule limit cannot do without', () => {
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

describe('floor_alert_triage_review — per-rule concurrency', () => {
  const { concurrency } = parsed.settings;

  it('allows 10 reviews waiting for a decision per rule', () => {
    expect(concurrency.max).toBe(10);
  });

  // `queue` holds a batch behind analyst decisions and expires it after 24h. `cancel-in-progress`
  // cancels a review parked on its proposal, which strands the proposal `pending` forever.
  it('drops the newest review instead of queueing or cancelling an older one', () => {
    expect(concurrency.strategy).toBe('drop');
  });

  it('keys the limit on the rule id input, so two rules never share a limit', () => {
    expect(concurrency.key).toBe('alert-triage-review-{{ inputs.rule_id }}');
    expect(renderString(concurrency.key, { inputs: { rule_id: 'rule-a' } })).toBe(
      'alert-triage-review-rule-a'
    );
    expect(renderString(concurrency.key, { inputs: { rule_id: 'rule-b' } })).not.toBe(
      renderString(concurrency.key, { inputs: { rule_id: 'rule-a' } })
    );
  });
});

// The limit only works if the engine counts what this workflow does. The engine's own tests cover
// the drop strategy and the skip itself (concurrency_manager.test.ts); these pin the pieces of that
// contract this definition depends on, so a change on either side fails here and not in production.
describe('floor_alert_triage_review — what the per-rule limit relies on in the engine', () => {
  const { concurrency } = parsed.settings;

  it('is a concurrency setting the engine accepts', () => {
    expect(ConcurrencySettingsSchema.safeParse(concurrency).success).toBe(true);
  });

  // The review parks in WAITING_FOR_CHILD on its proposal for as long as an analyst takes; if that
  // status stopped counting, the limit would only ever see the brief pending and running window.
  it.each([ExecutionStatus.PENDING, ExecutionStatus.RUNNING, ExecutionStatus.WAITING_FOR_CHILD])(
    'counts a review that is %s against the limit',
    (status) => {
      expect(ConcurrencySlotOccupyingExecutionStatuses).toContain(status);
    }
  );

  it.each([
    ExecutionStatus.SKIPPED,
    ExecutionStatus.COMPLETED,
    ExecutionStatus.FAILED,
    ExecutionStatus.CANCELLED,
    ExecutionStatus.TIMED_OUT,
  ])('frees the slot of a review that is %s', (status) => {
    expect(ConcurrencySlotOccupyingExecutionStatuses).not.toContain(status);
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
// One pending closure proposal per rule: coalesce_fp_close
// ---------------------------------------------------------------------------

describe('floor_alert_triage_review — coalescing', () => {
  const branchStepNames = (branchName: string) =>
    flatten(stepByName(branchName)?.steps ?? []).map((step) => step.name);

  it('tries to join a pending proposal before raising one, and falls back to raising one', () => {
    const topLevel = parsed.steps.map((step) => step.name);
    expect(topLevel.indexOf('coalesce_fp_close')).toBeLessThan(
      topLevel.indexOf('handle_new_proposal')
    );

    const coalesce = stepByName('coalesce_fp_close');
    expect(coalesce?.type).toBe('alertzero.coalesceFpCloseProposal');
    expect(coalesce?.['on-failure']).toEqual({ continue: true });
    expect(coalesce?.with).toEqual(
      expect.objectContaining({
        rule_id: '{{ inputs.rule_id }}',
        conversation_id: '{{ inputs.conversation_id }}',
        fp_candidate_ids: '${{ inputs.fp_candidate_ids }}',
      })
    );
  });

  const modeTemplate = stepByName('resolve_coalesce_mode')?.with?.coalesce_mode as string;
  const resolveMode = (coalesce: Record<string, unknown>): string =>
    renderString(modeTemplate, { steps: { coalesce_fp_close: coalesce } }).trim();

  it.each([
    [{ output: { mode: 'appended' } }, 'appended'],
    [{ output: { mode: 'mint' } }, 'mint'],
    [{ error: { message: 'forbidden' } }, 'mint'],
    [{}, 'mint'],
  ])('resolves the coalesce step %j to "%s"', (coalesce, expected) => {
    expect(resolveMode(coalesce)).toBe(expected);
  });

  it('releases the rule pointer once the proposal is settled, never failing the run on it', () => {
    const release = stepByName('release_fp_open_pointer');
    const branch = flatten(stepByName('handle_new_proposal')?.steps ?? []).map((step) => step.name);

    expect(release?.type).toBe('alertzero.releaseFpOpenPointer');
    expect(release?.['on-failure']).toEqual({ continue: true });
    expect(release?.with).toEqual({
      rule_id: '{{ inputs.rule_id }}',
      conversation_id: '{{ inputs.conversation_id }}',
    });
    expect(branch.indexOf('resolve_proposal_outcome')).toBeLessThan(
      branch.indexOf('release_fp_open_pointer')
    );
    expect(branch.indexOf('release_fp_open_pointer')).toBeLessThan(
      branch.indexOf('handle_approved')
    );
  });

  it.each([
    ['approved', true],
    ['dismissed', true],
    ['expired', true],
    ['unknown', false],
  ])('releases the pointer for outcome "%s": %s', (outcome, expected) => {
    expect(
      evalExpr(stepByName('release_fp_open_pointer')?.if as string, {
        variables: { proposal_outcome: outcome },
      })
    ).toBe(expected);
  });

  it('raises and waits on a proposal only when the batch did not join one', () => {
    expect(stepByName('handle_appended')?.condition).toBe(
      "${{ variables.coalesce_mode == 'appended' }}"
    );
    expect(stepByName('handle_new_proposal')?.condition).toBe(
      "${{ variables.coalesce_mode == 'mint' }}"
    );
    expect(branchStepNames('handle_new_proposal')).toContain('create_fp_proposal');
    expect(branchStepNames('handle_appended')).not.toContain('create_fp_proposal');
  });

  it('reports the added alerts in the Investigation that holds the proposal', () => {
    const comment = stepByName('post_comment_appended_standing');
    expect(comment?.with?.conversation_id).toBe(
      '{{ steps.coalesce_fp_close.output.standing_conversation_id }}'
    );
    const render = (added: number, total: number) =>
      renderString(comment?.with?.message as string, {
        inputs: { rule_name: 'Noisy rule' },
        steps: { coalesce_fp_close: { output: { added_count: added, total_count: total } } },
        variables: { fp_candidate_count: 3 },
      });

    expect(render(3, 7)).toContain(
      '3 more alerts from a new run of rule "Noisy rule" were added to the pending closure proposal, which now covers 7 alerts.'
    );
    expect(render(0, 7)).toContain('that the pending closure proposal already covers');
  });

  it("closes this batch's own Investigation only when the proposal lives in another one", () => {
    const elsewhere = stepByName('handle_appended_elsewhere');
    const evaluate = (standing: string) =>
      evalExpr(elsewhere?.condition as string, {
        inputs: { conversation_id: 'conv-batch' },
        steps: { coalesce_fp_close: { output: { standing_conversation_id: standing } } },
      });

    expect(evaluate('conv-standing')).toBe(true);
    expect(evaluate('conv-batch')).toBe(false);
    expect(branchStepNames('handle_appended_elsewhere')).toContain('close_investigation_appended');
    expect(stepByName('close_investigation_appended')?.with?.conversation_id).toBe(
      '{{ inputs.conversation_id }}'
    );
  });

  it('tells a proposal comment reader that later runs add to it', () => {
    const comment = (stepByName('create_fp_proposal')?.with?.inputs as Record<string, string>)
      .comment;
    expect(comment).toContain('Later runs of the rule add their false positives to this proposal.');
  });
});

// ---------------------------------------------------------------------------
// The live revision's alerts: resolve_head / resolve_closure_alerts
// ---------------------------------------------------------------------------

describe('floor_alert_triage_review — alerts of the live revision', () => {
  const closureIdsFromHead = stepByName('set_closure_alert_ids_from_head')?.with as Record<
    string,
    string
  >;
  const closureAlerts = stepByName('resolve_closure_alerts')?.with as Record<string, string>;
  const inputs = { fp_candidate_ids: ['a', 'b'] };

  it('reads the live revision after the gate, retrying before it gives up', () => {
    const resolveHead = stepByName('resolve_head');
    expect(resolveHead?.type).toBe('proposals.getLatestRevision');
    expect(resolveHead?.with?.proposalId).toBe('{{ steps.create_fp_proposal.output.proposalId }}');
    expect(resolveHead?.['on-failure']?.retry?.['max-attempts']).toBe(3);
    expect(resolveHead?.['on-failure']?.continue).toBe(true);
  });

  it('acts on every alert later batches added to the proposal', () => {
    const context = {
      inputs,
      steps: { resolve_head: { output: { actionInput: { alertIds: ['a', 'b', 'c', 'd'] } } } },
    };
    expect(evalExpr(closureIdsFromHead.closure_alert_ids, context)).toEqual(['a', 'b', 'c', 'd']);
    expect(Number(renderString(closureAlerts.closure_alert_count, context).trim())).toBe(4);
  });

  it('clears closure_alert_ids when the live revision could not be read', () => {
    expect(stepByName('clear_closure_alert_ids_when_head_unreadable')?.if).toBe(
      '${{ steps.resolve_head.error != blank }}'
    );
    expect(
      stepByName('clear_closure_alert_ids_when_head_unreadable')?.with?.closure_alert_ids
    ).toEqual([]);
    const context = { inputs, steps: { resolve_head: { error: { message: 'timeout' } } } };
    expect(Number(renderString(closureAlerts.closure_alert_count, context).trim())).toBe(2);
  });

  it('re-tags the alerts of the live revision on a dismissal', () => {
    expect(stepByName('retag_dismissed_alerts')?.foreach).toBe(
      '${{ variables.closure_alert_ids }}'
    );
  });

  it('counts the live revision in the approval comment', () => {
    const template = stepByName('post_comment_outcome_approved')?.with?.message as string;
    expect(
      renderString(template, { steps: { get_proposal: {} }, variables: { closure_alert_count: 5 } })
    ).toContain('5 alerts closed as false positive');
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

  it('remove_fp_tag and add_dismissed_tag never share a tag', () => {
    const removeFp = stepByName('remove_fp_tag')?.with?.tags as {
      tags_to_remove?: string[];
      tags_to_add?: string[];
    };
    const addDismissed = stepByName('add_dismissed_tag')?.with?.tags as {
      tags_to_remove?: string[];
      tags_to_add?: string[];
    };

    expect(removeFp?.tags_to_add).toEqual([]);
    expect(addDismissed?.tags_to_remove).toEqual([]);
    const removed = new Set(removeFp?.tags_to_remove ?? []);
    const added = new Set(addDismissed?.tags_to_add ?? []);
    // No static overlap (dynamic dismissed_tag is a variable, not a literal here)
    for (const tag of added) {
      expect(removed.has(tag)).toBe(false);
    }
  });
});

describe('floor_alert_triage_review — guard_get_proposal_readable', () => {
  it('retries get_proposal before continue: true takes over', () => {
    const getProposal = stepByName('get_proposal');
    expect(getProposal?.type).toBe('proposals.getProposal');
    expect(getProposal?.['on-failure']?.retry?.['max-attempts']).toBe(3);
    expect(getProposal?.['on-failure']?.continue).toBe(true);
  });

  it('gates the retag/close on get_proposal and resolve_head, with preserve-and-warn else branches', () => {
    const guard = stepByName('guard_get_proposal_readable');
    expect(guard?.condition).toBe('${{ steps.get_proposal.error == blank }}');
    expect(guard?.condition).not.toContain('|');

    const headGuard = stepByName('guard_resolve_head_readable');
    expect(headGuard?.condition).toBe('${{ steps.resolve_head.error == blank }}');
    expect(headGuard?.steps?.some((s) => s.name === 'map_dismiss_reason_to_tag')).toBe(true);
    expect(headGuard?.steps?.some((s) => s.name === 'retag_dismissed_alerts')).toBe(true);
    expect(headGuard?.steps?.some((s) => s.name === 'close_investigation_after_dismissal')).toBe(
      true
    );
    expect(headGuard?.else?.some((s) => s.name === 'post_comment_dismissed_head_read_failed')).toBe(
      true
    );
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
      variables: { closure_alert_count: 4 },
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
  closureAlertCount = 2,
  failedRetagCount = 0,
}: {
  dismissReason?: string;
  rationale?: string;
  decidedBy?: { username: string };
  dismissedTag?: string;
  closureAlertCount?: number;
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
      closure_alert_count: closureAlertCount,
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
    const comment = renderDismissedComment({ closureAlertCount: 3, failedRetagCount: 0 });
    expect(comment).toContain('3 alerts re-tagged');
    expect(comment).not.toContain('failed after retries');
  });

  it('reports the shortfall instead of claiming full success when a retag failed', () => {
    const comment = renderDismissedComment({ closureAlertCount: 3, failedRetagCount: 1 });
    expect(comment).toContain('2 of 3 alerts re-tagged');
    expect(comment).toContain('1 failed after retries and needs manual re-tagging');
  });

  it('says "alert" rather than "alerts" for a single FP candidate', () => {
    const comment = renderDismissedComment({ closureAlertCount: 1, failedRetagCount: 0 });
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

  it('retries remove_fp_tag and add_dismissed_tag, then continues past a persistent failure', () => {
    const removeFpTag = stepByName('remove_fp_tag');
    const addDismissedTag = stepByName('add_dismissed_tag');

    expect(removeFpTag?.['on-failure']?.retry?.['max-attempts']).toBe(3);
    expect(removeFpTag?.['on-failure']?.continue).toBe(true);
    expect(addDismissedTag?.['on-failure']?.retry?.['max-attempts']).toBe(3);
    expect(addDismissedTag?.['on-failure']?.continue).toBe(true);
  });

  // `continue: true` on a foreach exits the whole loop at the first inner failure, so the
  // remaining candidates would never be re-tagged and record_retag_failure would never run.
  it('does not put continue on the loop itself, which would abandon the remaining candidates', () => {
    const loop = stepByName('retag_dismissed_alerts');

    expect(loop?.['on-failure']).toBeUndefined();
  });

  it('increments the counter when either tag call recorded an error', () => {
    const recordFailure = stepByName('record_retag_failure');
    expect(recordFailure?.type).toBe('data.set');
    expect(recordFailure?.if).toBe(
      '${{ steps.remove_fp_tag.error != blank or steps.add_dismissed_tag.error != blank }}'
    );

    const noError = { steps: { remove_fp_tag: {}, add_dismissed_tag: {} } };
    const removeFailed = {
      steps: { remove_fp_tag: { error: { message: 'x' } }, add_dismissed_tag: {} },
    };
    const addFailed = {
      steps: { remove_fp_tag: {}, add_dismissed_tag: { error: { message: 'x' } } },
    };

    expect(evalExpr(recordFailure!.if!, noError)).toBe(false);
    expect(evalExpr(recordFailure!.if!, removeFailed)).toBe(true);
    expect(evalExpr(recordFailure!.if!, addFailed)).toBe(true);

    expect(
      evalExpr(recordFailure!.with!.failed_retag_count as string, {
        variables: { failed_retag_count: 1 },
      })
    ).toBe(2);
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
      'close_investigation_appended',
    ]);
  });

  it.each([
    'close_investigation_appended',
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
      const rendered = renderString(template, { variables: { closure_alert_count: count } });

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
      variables: { closure_alert_count: 2 },
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
