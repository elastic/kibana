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
import FLOOR_ALERT_TRIAGE_YAML from './floor_alert_triage.yaml';
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

const parsed = parse(FLOOR_ALERT_TRIAGE_YAML) as {
  settings: { timeout: string };
  steps: YamlStep[];
};

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

describe('floor_alert_triage — dismiss mapping', () => {
  it('maps dismissReason "wrong" to az:true_positive', () => {
    expect(evaluateDismissedTag('wrong')).toBe('az:true_positive');
  });

  it.each([
    'duplicate',
    'insufficient_evidence',
    'low_value',
    'out_of_scope',
    'already_handled',
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

// ---------------------------------------------------------------------------
// post_comment_outcome_dismissed — rationale truncation and escaping
// ---------------------------------------------------------------------------

const dismissedComment = stepByName('post_comment_outcome_dismissed');
const dismissedInputTemplate = (dismissedComment?.with?.body as Record<string, unknown>)
  ?.input as string;

const renderDismissedComment = ({
  dismissReason = 'wrong',
  rationale,
  decidedBy,
  dismissedTag = 'az:true_positive',
  fpCandidateCount = 2,
}: {
  dismissReason?: string;
  rationale?: string;
  decidedBy?: { username: string };
  dismissedTag?: string;
  fpCandidateCount?: number;
}): string => {
  return renderString(dismissedInputTemplate, {
    steps: {
      get_proposal: {
        output: { decision: 'dismissed', dismissReason, rationale, decidedBy },
      },
    },
    variables: { dismissed_tag: dismissedTag, fp_candidate_count: fpCandidateCount },
  });
};

describe('floor_alert_triage — post_comment_outcome_dismissed', () => {
  it('includes the dismiss reason', () => {
    const comment = renderDismissedComment({ dismissReason: 'wrong' });
    expect(comment).toContain('wrong');
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
});

// ---------------------------------------------------------------------------
// post_comment_triage_started — alert IDs and feature routing
// ---------------------------------------------------------------------------

const triageStartedComment = stepByName('post_comment_triage_started');
const triageInputTemplate = (triageStartedComment?.with?.body as Record<string, unknown>)
  ?.input as string;

const makeAlerts = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ _id: `alert-id-${i + 1}` }));

const renderTriageStarted = (alertCount: number): string =>
  renderString(triageInputTemplate, {
    event: { rule: { name: 'My Rule' }, alerts: makeAlerts(alertCount) },
    steps: { create_investigation: { output: { conversation_id: 'conv-1' } } },
    execution: { url: 'https://kibana.example.com/app/exec/1' },
  });

describe('floor_alert_triage — post_comment_triage_started', () => {
  it('includes the alertzero_reasoning feature name for model routing', () => {
    const comment = renderTriageStarted(3);
    expect(comment).toContain('alertzero_reasoning');
  });

  it('reports the alert count without listing individual IDs, since the chip attachment above already shows them', () => {
    const comment = renderTriageStarted(3);
    expect(comment).toContain('3 alert(s)');
    expect(comment).not.toContain('alert-id-1');
  });

  it('renders the execution URL as a markdown link rather than a raw URL', () => {
    const comment = renderTriageStarted(3);
    expect(comment).toContain('[View execution](https://kibana.example.com/app/exec/1)');
  });

  it('claims every alert is attached when no chunk failed', () => {
    const comment = renderString(triageInputTemplate, {
      event: { rule: { name: 'My Rule' }, alerts: makeAlerts(3) },
      steps: { create_investigation: { output: { conversation_id: 'conv-1' } } },
      execution: { url: 'https://kibana.example.com/app/exec/1' },
      variables: { failed_attach_chunk_count: 0, total_attach_chunk_count: 1 },
    });
    expect(comment).toContain('Alerts attached above.');
    expect(comment).not.toContain('failed to attach');
  });

  it('warns with the failure count instead of claiming full attachment when a chunk failed', () => {
    const comment = renderString(triageInputTemplate, {
      event: { rule: { name: 'My Rule' }, alerts: makeAlerts(45) },
      steps: { create_investigation: { output: { conversation_id: 'conv-1' } } },
      execution: { url: 'https://kibana.example.com/app/exec/1' },
      variables: { failed_attach_chunk_count: 1, total_attach_chunk_count: 3 },
    });
    expect(comment).toContain('1 of 3 alert chunk(s) failed to attach');
    expect(comment).not.toContain('Alerts attached above.');
  });
});

// ---------------------------------------------------------------------------
// attach_alerts — chunk-attachment failures are retried, then counted rather
// than silently swallowed (a failed chunk never shows as evidence)
// ---------------------------------------------------------------------------

describe('floor_alert_triage — attach_alerts', () => {
  it('retries a failed chunk attach before continuing past it', () => {
    const chunkStep = stepByName('attach_alert_chunk');
    expect(chunkStep?.type).toBe('ai.attachment.add');
    expect(chunkStep?.['on-failure']?.retry?.['max-attempts']).toBe(3);
    expect(chunkStep?.['on-failure']?.continue).toBe(true);
  });

  it('initializes the failure counter and total before the loop runs', () => {
    const init = stepByName('init_attach_chunk_tracking');
    expect(init?.with?.failed_attach_chunk_count).toBe(0);

    const topLevelNames = parsed.steps.map((step) => step.name);
    expect(topLevelNames.indexOf('init_attach_chunk_tracking')).toBeLessThan(
      topLevelNames.indexOf('attach_alerts')
    );
  });

  it('increments the failure counter only when the chunk attach step recorded an error', () => {
    const recordFailure = stepByName('record_attach_alert_chunk_failure');
    expect(recordFailure?.type).toBe('data.set');
    expect(recordFailure?.if).toBe('${{ steps.attach_alert_chunk.error != blank }}');

    expect(
      evalExpr(recordFailure!.if!, { steps: { attach_alert_chunk: { error: undefined } } })
    ).toBe(false);
    expect(
      evalExpr(recordFailure!.if!, {
        steps: { attach_alert_chunk: { error: { message: 'boom' } } },
      })
    ).toBe(true);

    expect(
      evalExpr(recordFailure!.with!.failed_attach_chunk_count as string, {
        variables: { failed_attach_chunk_count: 2 },
      })
    ).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Early abort when Alert Analysis is disabled
// ---------------------------------------------------------------------------

describe('floor_alert_triage — require_analysis_enabled', () => {
  const topLevelNames = parsed.steps.map((step) => step.name);

  it('runs before create_investigation so a disabled-analysis run opens no Investigation', () => {
    expect(topLevelNames.indexOf('fetch_analysis_runtime_config')).toBeLessThan(
      topLevelNames.indexOf('create_investigation')
    );
    expect(topLevelNames.indexOf('require_analysis_enabled')).toBeLessThan(
      topLevelNames.indexOf('create_investigation')
    );
  });

  it('reads the same runtime_config endpoint the analysis workflow uses', () => {
    const fetchStep = stepByName('fetch_analysis_runtime_config');
    expect(fetchStep?.type).toBe('kibana.request');
    expect(fetchStep?.with?.path).toBe(
      '/s/{{ workflow.spaceId }}/internal/security_solution/alert_analysis_workflow/runtime_config'
    );
  });

  it('fails the run when workflowEnabled is false', () => {
    const guard = stepByName('require_analysis_enabled');
    const abort = stepByName('abort_analysis_disabled');
    expect(guard?.condition).toBe(
      '${{ steps.fetch_analysis_runtime_config.output.workflowEnabled == false }}'
    );
    expect(abort?.type).toBe('workflow.fail');
    expect(abort?.with?.message).toContain('Alert Analysis');
  });

  it('evaluates workflowEnabled true/false — a missing field must not abort', () => {
    const condition = stepByName('require_analysis_enabled')?.condition;
    expect(condition).toBeDefined();
    const enabledContext = {
      steps: { fetch_analysis_runtime_config: { output: { workflowEnabled: true } } },
    };
    const disabledContext = {
      steps: { fetch_analysis_runtime_config: { output: { workflowEnabled: false } } },
    };
    const missingContext = {
      steps: { fetch_analysis_runtime_config: { output: {} } },
    };
    expect(evalExpr(condition ?? '', enabledContext)).toBe(false);
    expect(evalExpr(condition ?? '', disabledContext)).toBe(true);
    expect(evalExpr(condition ?? '', missingContext)).toBe(false);
  });
});

describe('floor_alert_triage — classify_alerts on-failure', () => {
  it('fails the run after the warning so close_investigation_no_fp cannot run', () => {
    const classify = stepByName('classify_alerts');
    const abort = stepByName('abort_classify_failed');
    expect(classify?.['on-failure']?.fallback?.map((step) => step.name)).toEqual([
      'post_comment_classify_failed',
      'abort_classify_failed',
    ]);
    expect(abort?.type).toBe('workflow.fail');
  });
});

describe('floor_alert_triage — guard_classification_nonempty', () => {
  it('compares precomputed counts — `| size` after a filter is invalid Liquid in if-conditions', () => {
    const counts = stepByName('compute_classification_guard_counts');
    const outer = stepByName('guard_classification_nonempty');
    const inner = stepByName('guard_classification_nonempty_inner');

    expect(counts?.with).toEqual({
      alert_count: '${{ event.alerts | size }}',
      verdict_count: '${{ steps.classify_alerts.output.verdicts | size }}',
    });
    expect(outer?.condition).toBe('${{ variables.alert_count > 0 }}');
    expect(inner?.condition).toBe('${{ variables.verdict_count == 0 }}');
    expect(outer?.condition).not.toContain('|');
    expect(inner?.condition).not.toContain('|');
  });

  it('evaluates the precomputed comparisons and rejects `| size > 0`', () => {
    expect(evalExpr('${{ variables.alert_count > 0 }}', { variables: { alert_count: 3 } })).toBe(
      true
    );
    expect(
      evalExpr('${{ variables.verdict_count == 0 }}', { variables: { verdict_count: 0 } })
    ).toBe(true);
    expect(() =>
      evalExpr('${{ event.alerts | size > 0 }}', { event: { alerts: [{ _id: 'a' }] } })
    ).toThrow();
  });

  it('does not tell the operator to enable Alert Analysis — that path aborted earlier', () => {
    const comment = stepByName('post_comment_classification_empty');
    const input = (comment?.with?.body as { input?: string } | undefined)?.input ?? '';
    expect(input).toContain('`alertzero_reasoning` Model Management feature has no connector');
    // The sub-workflow skips its dedupe on the Worker path, so tags cannot empty the batch.
    expect(input).not.toContain('already carry the analysis tag');
    expect(input).not.toContain('Verify the Alert Analysis workflow is enabled');
  });
});

describe('floor_alert_triage — if-conditions', () => {
  it('keeps every if-condition free of Liquid filters', () => {
    const ifSteps = allSteps.filter((step) => step.type === 'if');
    expect(ifSteps.length).toBeGreaterThan(0);
    for (const step of ifSteps) {
      expect(step.condition).toBeDefined();
      expect(step.condition).not.toContain('|');
    }
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
describe('floor_alert_triage — ai.conversation.metadata.patch failure handling', () => {
  const patchSteps = allSteps.filter((step) => step.type === 'ai.conversation.metadata.patch');

  it('finds every conversation-close step this workflow defines', () => {
    expect(patchSteps.map((step) => step.name).sort()).toEqual([
      'close_investigation_after_approval',
      'close_investigation_after_dismissal',
      'close_investigation_after_expiry',
      'close_no_fp',
    ]);
  });

  it.each([
    'close_no_fp',
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
// `system-create-proposal` completes normally on every outcome, including an unanswered
// deadline, so a timeout never reaches `create_fp_proposal`'s on-failure fallback. Each
// outcome therefore needs its own branch, and an expiry must not be read as a dismissal.
// ---------------------------------------------------------------------------
describe('floor_alert_triage — proposal outcomes', () => {
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

  it('leaves the Investigation open on an unexpected outcome', () => {
    expect(
      flatten(stepByName('handle_unknown_outcome')?.steps ?? []).some(
        (step) => step.type === 'ai.conversation.metadata.patch'
      )
    ).toBe(false);
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
describe('floor_alert_triage — autonomy', () => {
  const autoApproveExpr = (
    (stepByName('create_fp_proposal')?.with?.inputs as Record<string, unknown>)
      ?.autoApprove as string
  ).trim();

  it.each([
    ['supervised', true],
    ['manual', false],
  ])('autonomy "%s" sets autoApprove to %s', (autonomy, expected) => {
    expect(evalExpr(autoApproveExpr, { consts: { worker_settings: { autonomy } } })).toBe(expected);
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
describe('floor_alert_triage — settings.timeout', () => {
  // The Worker Investigation lifecycle contract puts the proposal gate's ceiling at 168 h.
  it('outlives the proposal gate ceiling', () => {
    const hours = Number(/^(\d+)h$/.exec(parsed.settings.timeout)?.[1]);
    expect(hours).toBeGreaterThan(168);
  });
});

// ---------------------------------------------------------------------------
// add_verdict_notes — the only verdict note on the Worker path
// ---------------------------------------------------------------------------
describe('floor_alert_triage — add_verdict_notes', () => {
  const noteTemplate = (stepByName('add_verdict_notes')?.with?.body as { note: { note: string } })
    .note.note;

  const renderNote = (contributingFactors: string[]) =>
    renderString(noteTemplate, {
      workflow: { spaceId: 'default' },
      execution: { url: 'https://kibana.example.com/app/exec/1' },
      steps: { create_investigation: { output: { conversation_id: 'conv-1' } } },
      foreach: {
        item: {
          classification: 'false_positive',
          confidence_score: 0.9,
          rationale: 'Signed SCCM parent process.',
          contributing_factors: contributingFactors,
        },
      },
    });

  it('links the Investigation and the execution, and carries the supporting details', () => {
    const note = renderNote(['Signed parent', 'Known admin host']);
    expect(note).toContain('/s/default/app/agent_builder/conversations/conv-1');
    expect(note).toContain('(https://kibana.example.com/app/exec/1)');
    expect(note).toContain('**Verdict:** false_positive');
    expect(note).toContain('Signed SCCM parent process.');
    expect(note).toContain('- Signed parent');
    expect(note).toContain('- Known admin host');
  });

  it('omits the contributing factors heading when there are none', () => {
    expect(renderNote([])).not.toContain('Contributing factors');
  });

  it('tells the sub-workflow it is called by the Worker, which suppresses its own note', () => {
    const inputs = stepByName('classify_alerts')?.with?.inputs as Record<string, unknown>;
    expect(inputs.calledByWorker).toBe(true);
  });
});
