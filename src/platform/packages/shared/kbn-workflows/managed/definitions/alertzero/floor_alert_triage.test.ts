/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import FLOOR_ALERT_TRIAGE_YAML from './floor_alert_triage.yaml';
import FLOOR_ALERT_TRIAGE_REVIEW_YAML from './floor_alert_triage_review.yaml';
import { createWorkflowLiquidEngine } from '../../../common/utils';
import { ExecutionStatus } from '../../../types/latest';

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
// compute_fp_candidates — the Worker's only filter deciding which alert IDs enter
// a close proposal. Exercises a mixed-verdict batch against the confidence floor.
// ---------------------------------------------------------------------------

const fpThresholdExprTemplate = stepByName('build_fp_threshold_expr')?.with
  ?.fp_threshold_expr as string;
const fpCandidateIdsExpr = stepByName('compute_fp_candidates')?.with?.fp_candidate_ids as string;

const computeFpCandidateIds = (
  verdicts: Array<{ alert_id: string; classification: string; confidence_score: number }>,
  autoCloseConfidenceScoreMinThreshold: number
): unknown => {
  const fpThresholdExpr = renderString(fpThresholdExprTemplate, {
    consts: { worker_settings: { autoCloseConfidenceScoreMinThreshold } },
  }).trim();

  return evalExpr(fpCandidateIdsExpr, {
    steps: { classify_alerts: { output: { verdicts } } },
    variables: { fp_threshold_expr: fpThresholdExpr },
  });
};

describe('floor_alert_triage — compute_fp_candidates', () => {
  const mixedVerdictBatch = [
    { alert_id: 'below-floor', classification: 'false_positive', confidence_score: 0.5 },
    { alert_id: 'at-floor', classification: 'false_positive', confidence_score: 0.85 },
    { alert_id: 'above-floor', classification: 'false_positive', confidence_score: 0.95 },
    { alert_id: 'true-positive', classification: 'true_positive', confidence_score: 0.99 },
    { alert_id: 'inconclusive', classification: 'inconclusive', confidence_score: 0.9 },
  ];

  it('includes only false_positive verdicts at or above the confidence floor', () => {
    expect(computeFpCandidateIds(mixedVerdictBatch, 0.85)).toEqual(['at-floor', 'above-floor']);
  });

  it('excludes every candidate when the floor is raised above all scores', () => {
    expect(computeFpCandidateIds(mixedVerdictBatch, 0.96)).toEqual([]);
  });

  it('includes every false_positive verdict when the floor is 0', () => {
    expect(computeFpCandidateIds(mixedVerdictBatch, 0)).toEqual([
      'below-floor',
      'at-floor',
      'above-floor',
    ]);
  });

  it('never includes a true_positive or inconclusive verdict regardless of score', () => {
    const ids = computeFpCandidateIds(mixedVerdictBatch, 0) as string[];
    expect(ids).not.toContain('true-positive');
    expect(ids).not.toContain('inconclusive');
  });
});

// ---------------------------------------------------------------------------
// post_comment_triage_started — alert IDs and feature routing
// ---------------------------------------------------------------------------

const triageStartedComment = stepByName('post_comment_triage_started');
const triageInputTemplate = (triageStartedComment?.with as Record<string, unknown>)
  ?.message as string;

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
    expect(comment).toContain('3 alerts');
    expect(comment).not.toContain('alert-id-1');
  });

  it('says "alert" rather than "alerts" for a single alert', () => {
    expect(renderTriageStarted(1)).toContain('(1 alert)');
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

describe('floor_alert_triage — create_investigation severity', () => {
  const renderSeverity = (event: Record<string, unknown>): string => {
    const create = stepByName('create_investigation');
    const template = (create?.with as { metadata?: { severity?: string } } | undefined)?.metadata
      ?.severity;
    return renderString(template ?? '', { event }).trim();
  };

  it('reads the severity off the first alert, since event.rule carries none', () => {
    expect(
      renderSeverity({ rule: { name: 'My Rule' }, alerts: [{ 'kibana.alert.severity': 'high' }] })
    ).toBe('high');
  });

  it('reads a nested alert document too', () => {
    expect(
      renderSeverity({
        rule: { name: 'My Rule' },
        alerts: [{ kibana: { alert: { severity: 'critical' } } }],
      })
    ).toBe('critical');
  });

  it('falls back to medium when the alert has no severity', () => {
    expect(renderSeverity({ rule: { name: 'My Rule' }, alerts: [{}] })).toBe('medium');
  });
});

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
      missing_alert_count: '${{ steps.classify_alerts.output.missing_alert_ids | size }}',
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
    const input = (comment?.with as { message?: string } | undefined)?.message ?? '';
    expect(input).toContain('`alertzero_reasoning` Model Management feature has no connector');
    // The sub-workflow skips its dedupe on the Worker path, so tags cannot empty the batch.
    expect(input).not.toContain('already carry the analysis tag');
    expect(input).not.toContain('Verify the Alert Analysis workflow is enabled');
  });

  it('warns about missing_alert_ids only on the else branch of the all-empty guard', () => {
    const inner = stepByName('guard_classification_nonempty_inner');
    const missingGuard = stepByName('guard_missing_alert_ids');

    // Not a sibling top-level step of the inner guard — nested under its `else`, so it
    // cannot double-fire alongside post_comment_classification_empty for the all-empty case.
    expect(inner?.steps?.some((s) => s.name === 'guard_missing_alert_ids')).toBe(false);
    expect(inner?.else?.some((s) => s.name === 'guard_missing_alert_ids')).toBe(true);
    expect(missingGuard?.condition).toBe('${{ variables.missing_alert_count > 0 }}');
    expect(missingGuard?.condition).not.toContain('|');
  });

  it('reports the shortfall and warns the missing alerts were not tagged, noted, or closed', () => {
    const comment = stepByName('post_comment_missing_alert_ids');
    const template = (comment?.with as { message?: string } | undefined)?.message ?? '';
    const rendered = renderString(template, {
      variables: { missing_alert_count: 2, alert_count: 5, verdict_count: 3 },
    });

    expect(rendered).toContain('no verdict for 2 of 5 alerts');
    expect(rendered).toContain('NOT tagged, noted, or considered for closure');
    expect(rendered).toContain('3 matched alerts will be triaged');
  });

  it('uses the singular when exactly one alert is missing', () => {
    const comment = stepByName('post_comment_missing_alert_ids');
    const template = (comment?.with as { message?: string } | undefined)?.message ?? '';
    const rendered = renderString(template, {
      variables: { missing_alert_count: 1, alert_count: 2, verdict_count: 1 },
    });

    expect(rendered).toContain('no verdict for 1 of 2 alerts');
    expect(rendered).toContain('That alert was NOT tagged');
    expect(rendered).toContain('only the 1 matched alert will be triaged');
    expect(rendered).toContain('follow up manually on the missing alert.');
  });
});

describe('floor_alert_triage — post_comment_classification_results', () => {
  const render = (): string => {
    const comment = stepByName('post_comment_classification_results');
    const template = (comment?.with as { message?: string } | undefined)?.message ?? '';
    return renderString(template, {
      steps: {
        classify_alerts: {
          output: {
            true_positive_count: 0,
            false_positive_count: 2,
            inconclusive_count: 0,
            grouped_counts_summary: '2 alerts with no host field classified as false positive.',
            generated_summary: 'Both alerts look benign.',
            connector_id: '',
          },
        },
      },
    });
  };

  it('starts every paragraph flush left, so the chat does not render indented text', () => {
    const lines = render()
      .split('\n')
      .filter((line) => line.trim() !== '');

    expect(lines).toHaveLength(3);
    lines.forEach((line) => expect(line).toBe(line.trimStart()));
  });
});

describe('floor_alert_triage — close_investigation_no_fp', () => {
  it('nests an analyzed-batch guard so each condition stays a single comparison', () => {
    const outer = stepByName('close_investigation_no_fp');
    const inner = stepByName('close_investigation_no_fp_when_analyzed');

    expect(outer?.condition).toBe('${{ variables.fp_candidate_count == 0 }}');
    expect(inner?.condition).toBe('${{ variables.verdict_count > 0 }}');
    expect(outer?.steps?.some((s) => s.name === 'close_investigation_no_fp_when_analyzed')).toBe(
      true
    );
    expect(inner?.steps?.some((s) => s.name === 'close_no_fp')).toBe(true);
  });

  it('does not close the Investigation or claim "Triage complete" for a zero-verdict batch', () => {
    // fp_candidate_count is also 0 when nothing was classified (missing connector, skipped
    // sub-workflow), which is exactly the case guard_classification_nonempty_inner already
    // warned about above. The inner guard must fail for that case so close_no_fp /
    // post_comment_outcome_no_fp never run.
    expect(
      evalExpr('${{ variables.fp_candidate_count == 0 }}', { variables: { fp_candidate_count: 0 } })
    ).toBe(true);
    expect(
      evalExpr('${{ variables.verdict_count > 0 }}', { variables: { verdict_count: 0 } })
    ).toBe(false);
  });

  it('still closes and reports "Triage complete" for a real zero-FP analyzed batch', () => {
    expect(
      evalExpr('${{ variables.fp_candidate_count == 0 }}', { variables: { fp_candidate_count: 0 } })
    ).toBe(true);
    expect(
      evalExpr('${{ variables.verdict_count > 0 }}', { variables: { verdict_count: 5 } })
    ).toBe(true);
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
      'close_investigation_review_limit',
      'close_no_fp',
    ]);
  });

  it.each(['close_no_fp', 'close_investigation_review_limit'])(
    '"%s" survives a patch failure via fallback + continue, so the step after it still runs',
    (name) => {
      const step = stepByName(name);
      expect(step?.['on-failure']?.continue).toBe(true);
      expect(step?.['on-failure']?.fallback?.length).toBeGreaterThan(0);
    }
  );
});

// ---------------------------------------------------------------------------
// Closure review hand-off
//
// The closure proposal waits for an analyst, so it lives in its own workflow started with
// `workflow.executeAsync`. This run must not wait for it, must start it only after the tags and
// notes exist, and must close the Investigation of a batch whose review the per-rule limit
// skipped, because no review runs to do that.
// ---------------------------------------------------------------------------
describe('floor_alert_triage — closure review hand-off', () => {
  const review = parse(FLOOR_ALERT_TRIAGE_REVIEW_YAML) as {
    settings: { concurrency: { max: number } };
  };
  const stepIndex = (name: string) => parsed.steps.findIndex((step) => step.name === name);

  it('never waits for the closure proposal or its outcome', () => {
    const types = allSteps.map((step) => step.type);
    expect(types).not.toContain('proposals.getProposal');
    expect(
      allSteps.some((step) => step.with?.['workflow-id'] === 'system-create-alertzero-proposal')
    ).toBe(false);
    expect(stepByName('start_fp_review')?.type).toBe('workflow.executeAsync');
  });

  it('starts the review after every alert has its az: tag and its note', () => {
    const gate = stepIndex('gate_fp_close');
    expect(gate).toBeGreaterThan(stepIndex('set_az_tags'));
    expect(gate).toBeGreaterThan(stepIndex('add_verdict_notes'));
  });

  it('only starts a review when there is something to close', () => {
    expect(stepByName('gate_fp_close')?.condition).toBe('${{ variables.fp_candidate_count > 0 }}');
    expect(stepByName('gate_fp_close')?.steps?.map((step) => step.name)).toContain(
      'start_fp_review'
    );
  });

  it('hands the review everything it needs and resolves the autonomy mapping itself', () => {
    const start = stepByName('start_fp_review');
    expect(start?.with?.['workflow-id']).toBe('system-security-floor-alert-triage-review');
    const inputs = start?.with?.inputs as Record<string, string>;
    expect(Object.keys(inputs).sort()).toEqual(
      [
        'autonomy',
        'conversation_id',
        'confidence_floor',
        'fp_candidate_ids',
        'rule_id',
        'rule_name',
      ].sort()
    );

    const context = {
      event: { rule: { id: 'rule-1', name: 'Noisy rule' } },
      steps: { create_investigation: { output: { conversation_id: 'conv-1' } } },
      variables: { fp_candidate_ids: ['a', 'b'] },
      consts: {
        worker_settings: { autonomy: 'supervised', autoCloseConfidenceScoreMinThreshold: 0.9 },
      },
    };
    expect(renderString(inputs.rule_id, context)).toBe('rule-1');
    expect(renderString(inputs.conversation_id, context)).toBe('conv-1');
    expect(renderString(inputs.autonomy, context)).toBe('supervised');
    expect(evalExpr(inputs.fp_candidate_ids, context)).toEqual(['a', 'b']);
    expect(evalExpr(inputs.confidence_floor, context)).toBe(0.9);
  });

  it('fails the run, after saying so, when the review cannot be started at all', () => {
    const fallback = stepByName('start_fp_review')?.['on-failure']?.fallback ?? [];
    expect(fallback.map((step) => step.name)).toEqual(['post_comment_review_not_started']);
    expect(stepByName('start_fp_review')?.['on-failure']?.continue).toBeUndefined();
  });

  describe('reading the review back', () => {
    const outcomeTemplate = stepByName('resolve_review_dispatch')?.with?.review_dispatch as string;
    const resolveDispatch = (read: { error?: unknown; output?: { status?: string } }): string =>
      renderString(outcomeTemplate, { steps: { read_review_execution: read } }).trim();

    it('reads the child execution of the same space by its id, retrying before it gives up', () => {
      const read = stepByName('read_review_execution');
      expect(read?.type).toBe('kibana.request');
      expect(read?.['on-failure']?.retry?.['max-attempts']).toBe(3);
      expect(read?.['on-failure']?.continue).toBe(true);
      expect(
        renderString(String((read?.with as { path: string }).path), {
          workflow: { spaceId: 'security' },
          steps: { start_fp_review: { output: { executionId: 'exec-1' } } },
        })
      ).toBe('/s/security/api/workflows/executions/exec-1');
    });

    it.each([
      [{ output: { status: 'skipped' } }, 'limit'],
      [{ output: { status: 'failed' } }, 'failed'],
      [{ output: { status: 'cancelled' } }, 'failed'],
      [{ output: { status: 'timed_out' } }, 'failed'],
      [{ output: { status: 'pending' } }, 'started'],
      [{ output: { status: 'running' } }, 'started'],
      [{ output: { status: 'waiting_for_child' } }, 'started'],
      [{ output: { status: 'completed' } }, 'started'],
      [{ error: { message: 'boom' } }, 'unknown'],
    ])('resolves %j to "%s"', (read, expected) => {
      expect(resolveDispatch(read)).toBe(expected);
    });

    // The Worker matches the review's status by string. Tie each literal to the engine's enum so a
    // rename there fails here instead of silently sending every batch down the "started" branch.
    it('only matches statuses the engine can report', () => {
      const matched = [...outcomeTemplate.matchAll(/status == '([a-z_]+)'/g)].map(
        ([, status]) => status
      );
      expect(matched).toEqual(expect.arrayContaining(['skipped', 'failed']));
      matched.forEach((status) => {
        expect(Object.values(ExecutionStatus)).toContain(status);
      });
    });

    it.each([
      ['handle_review_started', 'started'],
      ['handle_review_limit', 'limit'],
      ['handle_review_unknown', 'unknown'],
      ['handle_review_failed', 'failed'],
    ])('"%s" runs only for the "%s" dispatch', (branchName, dispatch) => {
      expect(stepByName(branchName)?.condition).toBe(
        `\${{ variables.review_dispatch == '${dispatch}' }}`
      );
    });
  });

  describe('a batch skipped by the per-rule limit', () => {
    const branchStepNames = (branchName: string) =>
      flatten(stepByName(branchName)?.steps ?? []).map((step) => step.name);

    it('closes the Investigation, since no review is left to do it', () => {
      expect(branchStepNames('handle_review_limit')).toContain('close_investigation_review_limit');
      expect(stepByName('close_investigation_review_limit')?.with?.updates).toEqual({
        status: 'closed',
      });
    });

    it('leaves the Investigation open when the review state is unknown or the review failed', () => {
      for (const branch of ['handle_review_unknown', 'handle_review_failed']) {
        expect(
          flatten(stepByName(branch)?.steps ?? []).some(
            (step) => step.type === 'ai.conversation.metadata.patch'
          )
        ).toBe(false);
      }
    });

    it('fails the run for a review that ended without a decision, after commenting', () => {
      const names = branchStepNames('handle_review_failed');
      expect(names).toEqual(['post_comment_review_failed', 'abort_review_failed']);
      expect(stepByName('abort_review_failed')?.type).toBe('workflow.fail');
    });

    it.each([
      [1, 'stays open', '1 alert classified'],
      [4, 'stay open', '4 alerts classified'],
    ])(
      'says why no proposal exists for %i alert(s), and that they stay open',
      (count, stays, counted) => {
        const template = (stepByName('post_comment_review_limit')?.with as { message: string })
          .message;
        const rendered = renderString(template, {
          event: { rule: { name: 'Noisy rule' } },
          variables: { fp_candidate_count: count },
          consts: { worker_settings: { autoCloseConfidenceScoreMinThreshold: 0.85 } },
        });

        expect(rendered).toContain('No closure proposal was created');
        expect(rendered).toContain('Rule "Noisy rule"');
        expect(rendered).toContain(counted);
        expect(rendered).toContain(stays);
        expect(rendered).toContain('tagged az:false_positive');
      }
    );

    // The number in the comment is typed by hand; the limit is enforced by the review.
    it('quotes the limit the review enforces', () => {
      const template = (stepByName('post_comment_review_limit')?.with as { message: string })
        .message;
      expect(template).toContain(
        `already has ${review.settings.concurrency.max} closure proposals`
      );
    });

    // Every other message that mentions the limit does so without a number, so the one above is
    // the only one that can go stale.
    it('does not hard-code the limit in any other hand-off message', () => {
      const messagesOf = (steps: YamlStep[] | undefined): string[] =>
        (steps ?? []).flatMap((step) => [
          ...(typeof step.with?.message === 'string' ? [step.with.message] : []),
          ...messagesOf(step.steps),
          ...messagesOf(step['on-failure']?.fallback),
        ]);
      const others = messagesOf(stepByName('gate_fp_close')?.steps).filter(
        (message) => !message.includes('closure proposals waiting for a decision')
      );
      expect(others.length).toBeGreaterThan(0);
      others.forEach((message) => {
        expect(message).not.toMatch(new RegExp(`\\b${review.settings.concurrency.max}\\b`));
      });
    });
  });

  it('does not claim the proposal was decided when the hand-off comment is written', () => {
    const template = (stepByName('post_comment_review_started')?.with as { message: string })
      .message;
    const rendered = renderString(template, {
      variables: { fp_candidate_count: 2 },
      consts: {
        worker_settings: { autonomy: 'manual', autoCloseConfidenceScoreMinThreshold: 0.85 },
      },
    });

    expect(rendered).toContain('handed to the closure review');
    expect(rendered).toContain('A human decision is required.');
    expect(rendered).toContain('The outcome is posted here');
  });
});
