/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import FLOOR_ALERT_TRIAGE_BATCH_YAML from './floor_alert_triage_batch.yaml';
import FLOOR_ALERT_TRIAGE_REVIEW_YAML from './floor_alert_triage_review.yaml';
import { createWorkflowLiquidEngine } from '../../../common/utils';
import { convertToWorkflowGraph } from '../../../graph/build_execution_graph/build_execution_graph';
import type { WorkflowYaml } from '../../../spec/schema';
import {
  DEFAULT_PARALLEL_MAX_CONCURRENCY,
  DEFAULT_PARALLEL_MAX_FAN_OUT,
} from '../../../spec/schema';
import { ExecutionStatus } from '../../../types/latest';
import ALERT_ANALYSIS_WORKFLOW_YAML from '../alert_analysis/alert_analysis_workflow.yaml';

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

const parsed = parse(FLOOR_ALERT_TRIAGE_BATCH_YAML) as {
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
    inputs: { confidence_floor: autoCloseConfidenceScoreMinThreshold },
  }).trim();

  return evalExpr(fpCandidateIdsExpr, {
    steps: { classify_alerts: { output: { verdicts } } },
    variables: { fp_threshold_expr: fpThresholdExpr },
  });
};

describe('floor_alert_triage_batch — compute_fp_candidates', () => {
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
    inputs: { rule_name: 'My Rule' },
    steps: {
      create_investigation: { output: { conversation_id: 'conv-1' } },
      load_alerts: { output: { alerts: makeAlerts(alertCount) } },
    },
    execution: { url: 'https://kibana.example.com/app/exec/1' },
  });

describe('floor_alert_triage_batch — post_comment_triage_started', () => {
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
      inputs: { rule_name: 'My Rule' },
      steps: {
        create_investigation: { output: { conversation_id: 'conv-1' } },
        load_alerts: { output: { alerts: makeAlerts(3) } },
      },
      execution: { url: 'https://kibana.example.com/app/exec/1' },
      variables: { failed_attach_chunk_count: 0, total_attach_chunk_count: 1 },
    });
    expect(comment).toContain('Alerts attached above.');
    expect(comment).not.toContain('failed to attach');
  });

  it('warns with the failure count instead of claiming full attachment when a chunk failed', () => {
    const comment = renderString(triageInputTemplate, {
      inputs: { rule_name: 'My Rule' },
      steps: {
        create_investigation: { output: { conversation_id: 'conv-1' } },
        load_alerts: { output: { alerts: makeAlerts(45) } },
      },
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

describe('floor_alert_triage_batch — create_investigation severity', () => {
  const renderSeverity = (alerts: Array<Record<string, unknown>>): string => {
    const create = stepByName('create_investigation');
    const template = (create?.with as { metadata?: { severity?: string } } | undefined)?.metadata
      ?.severity;
    return renderString(template ?? '', {
      steps: { load_alerts: { output: { alerts } } },
    }).trim();
  };

  it('reads the severity off the first alert, since the rule input carries none', () => {
    expect(renderSeverity([{ 'kibana.alert.severity': 'high' }])).toBe('high');
  });

  it('reads a nested alert document too', () => {
    expect(renderSeverity([{ kibana: { alert: { severity: 'critical' } } }])).toBe('critical');
  });

  it('falls back to medium when the alert has no severity', () => {
    expect(renderSeverity([{}])).toBe('medium');
  });
});

describe('floor_alert_triage_batch — attach_impact', () => {
  const classifyOutput = (entities: unknown[]) => ({
    steps: { classify_alerts: { output: { impacted_entities: entities } } },
  });

  it('records impact through the shared step, not a security-specific attachment', () => {
    const step = stepByName('attach_impact');
    expect(step?.type).toBe('investigations.attachImpact');
    expect(step?.with).toEqual({
      conversationId: '{{ steps.create_investigation.output.conversation_id }}',
      entities: '${{ steps.classify_alerts.output.impacted_entities }}',
    });
    expect(JSON.stringify(parsed)).not.toContain('security.impact');
  });

  it('does not fail the run when impact cannot be recorded', () => {
    expect(stepByName('attach_impact')?.['on-failure']?.continue).toBe(true);
  });

  it('skips the step when no alert carried a host or user, since the shared step rejects an empty list', () => {
    const gate = stepByName('attach_impact_gate');
    expect(gate?.steps?.map((step) => step.name)).toEqual(['attach_impact']);
    expect(evalExpr(gate!.condition!, classifyOutput([]))).toBe(false);
    expect(
      evalExpr(gate!.condition!, classifyOutput([{ id: 'host:a', name: 'a', type: 'host' }]))
    ).toBe(true);
  });
});

describe('floor_alert_triage_batch — attach_alerts', () => {
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

describe('floor_alert_triage_batch — require_analysis_enabled', () => {
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

describe('floor_alert_triage_batch — classify_alerts on-failure', () => {
  it('marks the alerts failed, then fails the run after the warning so close_investigation_no_fp cannot run', () => {
    const classify = stepByName('classify_alerts');
    const abort = stepByName('abort_classify_failed');
    expect(classify?.['on-failure']?.fallback?.map((step) => step.name)).toEqual([
      'post_comment_classify_failed',
      'release_claims_classify_failed',
      'abort_classify_failed',
    ]);
    expect(abort?.type).toBe('workflow.fail');
  });
});

describe('floor_alert_triage_batch — guard_classification_nonempty', () => {
  it('compares precomputed counts — `| size` after a filter is invalid Liquid in if-conditions', () => {
    const counts = stepByName('compute_classification_guard_counts');
    const outer = stepByName('guard_classification_nonempty');
    const inner = stepByName('guard_classification_nonempty_inner');

    expect(counts?.with).toEqual({
      alert_count: '${{ steps.load_alerts.output.alerts | size }}',
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
      evalExpr('${{ steps.load_alerts.output.alerts | size > 0 }}', {
        steps: { load_alerts: { output: { alerts: [{ _id: 'a' }] } } },
      })
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

describe('floor_alert_triage_batch — post_comment_classification_results', () => {
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

describe('floor_alert_triage_batch — close_investigation_no_fp', () => {
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

describe('floor_alert_triage_batch — if-conditions', () => {
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
// az: tags — written in bulk and in chunks, never one call per alert
// ---------------------------------------------------------------------------
const AZ_TAG_WRITES = [
  {
    step: 'set_az_true_positive_tags',
    idsVariable: 'az_true_positive_ids',
    tagToAdd: 'az:true_positive',
  },
  {
    step: 'set_az_false_positive_tags',
    idsVariable: 'az_false_positive_ids',
    tagToAdd: 'az:false_positive',
  },
  {
    step: 'set_az_inconclusive_tags',
    idsVariable: 'az_inconclusive_ids',
    tagToAdd: 'az:inconclusive',
  },
] as const;

const AZ_TAG_STEPS = AZ_TAG_WRITES.map(({ step }) => step);

describe('floor_alert_triage_batch — az: tags', () => {
  const idsStep = stepByName('compute_az_tag_ids');

  const verdicts = [
    { alert_id: 'tp-1', classification: 'true_positive' },
    { alert_id: 'fp-1', classification: 'false_positive' },
    { alert_id: 'fp-2', classification: 'false_positive' },
    { alert_id: 'inc-1', classification: 'inconclusive' },
  ];

  const computeIds = (batch: typeof verdicts): Record<string, unknown> => {
    const context = { steps: { classify_alerts: { output: { verdicts: batch } } } };
    return Object.fromEntries(
      Object.entries(idsStep?.with ?? {}).map(([key, expr]) => [
        key,
        evalExpr(expr as string, context),
      ])
    );
  };

  const loopOf = (name: string) => stepByName(name) as YamlStep;
  const callOf = (name: string) => loopOf(name).steps?.[0];

  const makeIds = (count: number): string[] =>
    Array.from({ length: count }, (_, i) => `alert-${i + 1}`);

  const renderChunks = (name: string, idsVariable: string, ids: string[]): string[][] =>
    JSON.parse(
      renderString((loopOf(name).foreach ?? '').replace(/^\$\{\{/, '{{').trim(), {
        variables: { [idsVariable]: ids },
      })
    );

  const chunkSizeOf = (name: string): number =>
    Number(/chunk: (\d+)/.exec(loopOf(name).foreach ?? '')?.[1]);

  it('walks each id list in chunks, with one SetAlertTags call per chunk', () => {
    AZ_TAG_WRITES.forEach(({ step }) => {
      expect(loopOf(step).type).toBe('foreach');
      expect(loopOf(step).foreach).toContain('| chunk:');
      expect(loopOf(step).steps).toHaveLength(1);
      expect(callOf(step)?.type).toBe('kibana.SetAlertTags');
      expect(callOf(step)?.name).toBe(`${step}_call`);
      expect(callOf(step)?.with?.ids).toBe('${{ foreach.item }}');
    });
  });

  it('partitions the alert ids by classification, every id landing in exactly one class', () => {
    expect(computeIds(verdicts)).toEqual({
      az_true_positive_ids: ['tp-1'],
      az_false_positive_ids: ['fp-1', 'fp-2'],
      az_inconclusive_ids: ['inc-1'],
    });
  });

  it('chunks each list at the size the closure review re-tags with', () => {
    const reviewChunkSize = Number(/chunk: (\d+)/.exec(FLOOR_ALERT_TRIAGE_REVIEW_YAML)?.[1]);
    expect(reviewChunkSize).toBeGreaterThan(0);
    AZ_TAG_STEPS.forEach((step) => expect(chunkSizeOf(step)).toBe(reviewChunkSize));
  });

  it.each(AZ_TAG_WRITES)(
    '"$step" splits a large list into bounded chunks that keep every id exactly once',
    ({ step, idsVariable }) => {
      const size = chunkSizeOf(step);
      const ids = makeIds(size * 2 + 200);
      const chunks = renderChunks(step, idsVariable, ids);
      expect(chunks.map((chunk) => chunk.length)).toEqual([size, size, 200]);
      expect(chunks.flat()).toEqual(ids);
    }
  );

  it('sends a single call when the list fits in one chunk', () => {
    AZ_TAG_WRITES.forEach(({ step, idsVariable }) => {
      expect(renderChunks(step, idsVariable, makeIds(3))).toEqual([makeIds(3)]);
    });
  });

  it('makes a bounded number of calls for a large batch, not one per alert', () => {
    const alertCount = 1200;
    const ids = makeIds(alertCount);
    // Every alert is a false positive: only the false-positive write has any chunks.
    const calls = AZ_TAG_WRITES.map(({ step, idsVariable }) => {
      const list = step === 'set_az_false_positive_tags' ? ids : [];
      return renderChunks(step, idsVariable, list).length;
    });
    expect(calls).toEqual([0, 3, 0]);
    expect(calls.reduce((sum, count) => sum + count, 0)).toBeLessThan(alertCount);
  });

  it('never sends an empty `ids`, since a list with no ids chunks to no calls', () => {
    AZ_TAG_WRITES.forEach(({ step, idsVariable }) => {
      expect(renderChunks(step, idsVariable, [])).toEqual([]);
    });
    const ids = computeIds([]);
    expect(Object.values(ids)).toEqual([[], [], []]);
  });

  it('only writes a class tag for the alerts of that class', () => {
    const ids = computeIds([{ alert_id: 'fp-1', classification: 'false_positive' }]);
    const chunksFor = (variable: string, step: string) =>
      renderChunks(step, variable, ids[variable] as string[]);
    expect(chunksFor('az_false_positive_ids', 'set_az_false_positive_tags')).toEqual([['fp-1']]);
    expect(chunksFor('az_true_positive_ids', 'set_az_true_positive_tags')).toEqual([]);
    expect(chunksFor('az_inconclusive_ids', 'set_az_inconclusive_tags')).toEqual([]);
  });

  // The three writes run in order and the last one wins, so an alert id in two classes would end
  // with the last class's tag. The sub-workflow rules that out by failing on duplicate ids.
  it('relies on the analysis sub-workflow failing the run on duplicate alert ids', () => {
    const { steps } = parse(ALERT_ANALYSIS_WORKFLOW_YAML) as { steps: YamlStep[] };
    const reject = flatten(steps).find(({ name }) => name === 'fail_duplicate_caller_alert_ids');
    expect(reject?.type).toBe('workflow.fail');
  });

  it('reads each loop from the list its tag belongs to', () => {
    AZ_TAG_WRITES.forEach(({ step, idsVariable }) => {
      expect(loopOf(step).foreach).toContain(`variables.${idsVariable} `);
    });
  });

  it('adds its own class tag and removes the other two in the same call, never the one it adds', () => {
    const all = ['az:true_positive', 'az:false_positive', 'az:inconclusive'];
    AZ_TAG_WRITES.forEach(({ step, tagToAdd }) => {
      const { tags } = callOf(step)?.with as {
        tags: { tags_to_remove: string[]; tags_to_add: string[] };
      };
      expect(tags.tags_to_add).toEqual([tagToAdd]);
      // The claim tags leave in the same update, so an alert is never left with a verdict and a
      // claim, or with a claim and no verdict.
      const claimTags = ['az:triage_pending', 'az:triage_exec:{{ execution.id }}'];
      const verdictTags = [...tags.tags_to_remove, ...tags.tags_to_add].filter(
        (tag) => !claimTags.includes(tag)
      );
      expect(verdictTags.sort()).toEqual([...all].sort());
      expect(tags.tags_to_remove).toEqual(expect.arrayContaining(claimTags));
    });
  });

  it('retries each write and fails the run when one still fails', () => {
    AZ_TAG_STEPS.forEach((step) => {
      expect(callOf(step)?.['on-failure']?.retry?.['max-attempts']).toBe(3);
      expect(callOf(step)?.['on-failure']?.continue).toBeUndefined();
    });
  });

  it('runs before the verdict notes and the review dispatch', () => {
    const names = parsed.steps.map((step) => step.name);
    expect(names.indexOf('compute_az_tag_ids')).toBeLessThan(names.indexOf(AZ_TAG_STEPS[0]));
    AZ_TAG_STEPS.forEach((step) => {
      expect(names.indexOf(step)).toBeLessThan(names.indexOf('add_verdict_notes'));
    });
  });
});

// ---------------------------------------------------------------------------
// add_verdict_notes — the only verdict note on the Worker path
// ---------------------------------------------------------------------------
describe('floor_alert_triage_batch — add_verdict_notes', () => {
  const noteTemplate = (stepByName('add_verdict_note')?.with?.body as { note: { note: string } })
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

  describe('writing the notes in parallel chunks', () => {
    const loop = stepByName('add_verdict_notes') as YamlStep & {
      concurrency?: { max: number };
      mode?: string;
    };
    const parallel = stepByName('write_note_chunk') as YamlStep & {
      concurrency?: { max: number };
      mode?: string;
    };
    const verdicts = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        alert_id: `alert-${i + 1}`,
        classification: 'false_positive',
      }));

    const renderChunks = (count: number): Array<Array<{ alert_id: string }>> =>
      JSON.parse(
        renderString((loop.foreach ?? '').replace(/^\$\{\{/, '{{').trim(), {
          steps: { classify_alerts: { output: { verdicts: verdicts(count) } } },
        })
      );

    it('loops over chunks of verdicts and fans each chunk out in a parallel step', () => {
      expect(loop.type).toBe('foreach');
      expect(loop.foreach).toContain('chunk: 20');
      expect(parallel.type).toBe('parallel');
      expect(parallel.steps?.map((step) => step.name)).toEqual(['add_verdict_note']);
    });

    it('splits the verdicts into chunks that keep every alert exactly once', () => {
      const chunks = renderChunks(45);
      expect(chunks.map((chunk) => chunk.length)).toEqual([20, 20, 5]);
      expect(chunks.flat().map(({ alert_id: id }) => id)).toEqual(
        verdicts(45).map(({ alert_id: id }) => id)
      );
    });

    it('writes no notes for a run without verdicts', () => {
      expect(renderChunks(0)).toEqual([]);
    });

    // A fan-out that is no larger than the concurrency finishes in one tick; a larger one runs in
    // waves, and every wave reloads the execution state.
    it('keeps each chunk within the concurrency so it finishes in one tick', () => {
      const chunkSize = Number(/chunk: (\d+)/.exec(loop.foreach ?? '')?.[1]);
      expect(parallel.concurrency?.max).toBeGreaterThanOrEqual(chunkSize);
      // The schema ceilings for a parallel step.
      expect(parallel.concurrency?.max).toBeLessThanOrEqual(DEFAULT_PARALLEL_MAX_CONCURRENCY);
      expect(chunkSize).toBeLessThanOrEqual(DEFAULT_PARALLEL_MAX_FAN_OUT);
    });

    // The schema accepts a branch with `on-failure` or `if`; only building the graph rejects it,
    // and in the engine that rejection would be a failed run rather than a failed test.
    it('builds an execution graph, which rejects flow control inside a branch', () => {
      expect(() => convertToWorkflowGraph(parsed as unknown as WorkflowYaml)).not.toThrow();
    });

    it('lets every note in a chunk run even when one fails', () => {
      expect(parallel.mode).toBe('settled');
    });

    it('reads the verdicts for the fan-out from a step output, not from the chunk scope', () => {
      expect(stepByName('current_note_chunk')?.with?.verdicts).toBe('${{ foreach.item }}');
      expect(parallel.foreach).toBe('${{ steps.current_note_chunk.output.verdicts }}');
    });

    // A parallel branch is a straight line of atomic steps: flow control, including `on-failure`
    // and `if`, is rejected when the graph is built.
    it('keeps the branch body free of flow control', () => {
      (parallel.steps ?? []).forEach((step) => {
        expect(step['on-failure']).toBeUndefined();
        expect(step.if).toBeUndefined();
        expect(step.foreach).toBeUndefined();
      });
    });

    describe('retrying the notes that did not complete', () => {
      const collectExpr = stepByName('collect_chunk_failed_notes')?.with
        ?.chunk_failed_verdicts as string;
      const recordExpr = stepByName('record_failed_verdict_notes')?.with
        ?.failed_note_verdicts as string;
      const retry = stepByName('retry_failed_verdict_notes');

      const failedVerdictsOf = (results: unknown[]): unknown =>
        evalExpr(collectExpr, { steps: { write_note_chunk: { output: { results } } } });

      it('collects the verdict of every branch that did not complete', () => {
        const [a, b, c, d] = verdicts(4);
        expect(
          failedVerdictsOf([
            { index: 0, key: a, status: 'completed' },
            { index: 1, key: b, status: 'failed' },
            { index: 2, key: c, status: 'completed' },
            { index: 3, key: d, status: 'timed_out' },
          ])
        ).toEqual([b, d]);
      });

      it('collects nothing when every note completed', () => {
        const [a, b] = verdicts(2);
        expect(
          failedVerdictsOf([
            { index: 0, key: a, status: 'completed' },
            { index: 1, key: b, status: 'completed' },
          ])
        ).toEqual([]);
      });

      const accumulate = (
        accumulated: unknown[],
        chunkFailed: unknown[],
        staleVariable: unknown[] = []
      ): unknown =>
        evalExpr(recordExpr, {
          variables: { failed_note_verdicts: accumulated, chunk_failed_verdicts: staleVariable },
          steps: { collect_chunk_failed_notes: { output: { chunk_failed_verdicts: chunkFailed } } },
        });

      it('accumulates the failures across chunks', () => {
        const [a, b, c] = verdicts(3);
        expect(accumulate([a], [b, c])).toEqual([a, b, c]);
        expect(accumulate([a], [])).toEqual([a]);
      });

      // `variables` is a merge of every data.set output in run order, and an empty value does not
      // reliably shadow the previous chunk's, so a clean chunk after a failed one must not
      // re-add the failed one: the step output is what the accumulator has to read.
      it('does not re-add the failures of an earlier chunk when a later chunk is clean', () => {
        const [a, b] = verdicts(2);
        const afterFailedChunk = accumulate([a], [b]);
        expect(afterFailedChunk).toEqual([a, b]);
        expect(accumulate(afterFailedChunk as unknown[], [], [b])).toEqual([a, b]);
      });

      it('reads the failures from the collecting step, not from a variable', () => {
        expect(recordExpr).toContain(
          'steps.collect_chunk_failed_notes.output.chunk_failed_verdicts'
        );
        expect(recordExpr).not.toContain('variables.chunk_failed_verdicts');
      });

      it('starts the accumulator empty before the first chunk', () => {
        const names = parsed.steps.map((step) => step.name);
        expect(stepByName('init_failed_verdict_notes')?.with?.failed_note_verdicts).toEqual([]);
        expect(names.indexOf('init_failed_verdict_notes')).toBeLessThan(
          names.indexOf('add_verdict_notes')
        );
      });

      it('retries each failed note serially, with the retry the notes always had', () => {
        const retryStep = stepByName('retry_verdict_note');
        expect(retry?.type).toBe('foreach');
        expect(retry?.foreach).toContain('variables.failed_note_verdicts');
        expect(retryStep?.['on-failure']?.retry?.['max-attempts']).toBe(3);
        // A note that still fails fails the run, as it did before the notes ran in parallel.
        expect(retryStep?.['on-failure']?.continue).toBeUndefined();
      });

      it('runs after the notes and before the review is started', () => {
        const names = parsed.steps.map((step) => step.name);
        expect(names.indexOf('retry_failed_verdict_notes')).toBeGreaterThan(
          names.indexOf('add_verdict_notes')
        );
        expect(names.indexOf('gate_fp_close')).toBeGreaterThan(
          names.indexOf('retry_failed_verdict_notes')
        );
      });

      it('writes the same note as the first attempt', () => {
        expect(stepByName('retry_verdict_note')?.with).toEqual(
          stepByName('add_verdict_note')?.with
        );
      });
    });
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
describe('floor_alert_triage_batch — ai.conversation.metadata.patch failure handling', () => {
  const patchSteps = allSteps.filter((step) => step.type === 'ai.conversation.metadata.patch');

  it('finds every conversation-close step this workflow defines', () => {
    expect(patchSteps.map((step) => step.name).sort()).toEqual(['close_no_fp']);
  });

  it.each(['close_no_fp'])(
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
// notes exist.
// ---------------------------------------------------------------------------
describe('floor_alert_triage_batch — closure review hand-off', () => {
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
    AZ_TAG_STEPS.forEach((name) => expect(gate).toBeGreaterThan(stepIndex(name)));
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
      inputs: {
        rule_id: 'rule-1',
        rule_name: 'Noisy rule',
        autonomy: 'supervised',
        confidence_floor: 0.9,
      },
      steps: { create_investigation: { output: { conversation_id: 'conv-1' } } },
      variables: { fp_candidate_ids: ['a', 'b'] },
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

  describe('reading the review status', () => {
    const outcomeTemplate = stepByName('resolve_review_dispatch')?.with?.review_dispatch as string;
    const resolveDispatch = (status: string): string =>
      renderString(outcomeTemplate, {
        steps: { start_fp_review: { output: { status } } },
      }).trim();

    // The status comes from `workflow.executeAsync` itself. A separate read of the execution
    // would need extra privileges and retries, and would add a branch for "could not read".
    it('takes the status from the executeAsync output and never reads the execution again', () => {
      expect(
        allSteps.some(
          (step) =>
            step.type === 'kibana.request' &&
            /executions/.test(String((step.with as { path?: string })?.path))
        )
      ).toBe(false);
      expect(JSON.stringify(parsed)).not.toContain('read_review_execution');
    });

    it.each([
      ['skipped', 'failed'],
      ['failed', 'failed'],
      ['cancelled', 'failed'],
      ['timed_out', 'failed'],
      ['pending', 'started'],
      ['running', 'started'],
      ['waiting_for_child', 'started'],
      ['completed', 'started'],
    ])('resolves the status "%s" to "%s"', (status, expected) => {
      expect(resolveDispatch(status)).toBe(expected);
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
      ['handle_review_failed', 'failed'],
    ])('"%s" runs only for the "%s" dispatch', (branchName, dispatch) => {
      expect(stepByName(branchName)?.condition).toBe(
        `\${{ variables.review_dispatch == '${dispatch}' }}`
      );
    });
  });

  describe('a batch whose review ended without a decision', () => {
    const branchStepNames = (branchName: string) =>
      flatten(stepByName(branchName)?.steps ?? []).map((step) => step.name);

    // The per-rule limit that used to skip a review, and close the Investigation here, is gone.
    it('has no limit branch, since the review no longer skips a batch', () => {
      expect(stepByName('handle_review_limit')).toBeUndefined();
      expect(stepByName('close_investigation_review_limit')).toBeUndefined();
    });

    it('leaves the Investigation open when the review failed', () => {
      expect(
        flatten(stepByName('handle_review_failed')?.steps ?? []).some(
          (step) => step.type === 'ai.conversation.metadata.patch'
        )
      ).toBe(false);
    });

    it('fails the run for a review that ended without a decision, after commenting', () => {
      const names = branchStepNames('handle_review_failed');
      expect(names).toEqual(['post_comment_review_failed', 'abort_review_failed']);
      expect(stepByName('abort_review_failed')?.type).toBe('workflow.fail');
    });

    const renderReviewFailed = (autonomy: string, count: number): string => {
      const template = (stepByName('post_comment_review_failed')?.with as { message: string })
        .message;
      return renderString(template, {
        steps: { start_fp_review: { output: { status: 'failed' } } },
        variables: { fp_candidate_count: count },
        inputs: { autonomy },
      });
    };

    it.each([
      [1, 'is tagged az:false_positive', 'it is still open'],
      [3, 'are tagged az:false_positive', 'they are still open'],
    ])(
      'does not claim %i candidate alert(s) are still open when a supervised review failed',
      (count, tagged, stillOpen) => {
        // At supervised autonomy the review can approve and start closing before the Worker
        // reads its status, and a failed close may leave some candidates already closed.
        const rendered = renderReviewFailed('supervised', count);

        expect(rendered).toContain('status: failed');
        expect(rendered).toContain(tagged);
        expect(rendered).toContain('some may already be closed');
        expect(rendered).toContain(`rather than assuming ${stillOpen}`);
        expect(rendered).not.toContain('remain open');
      }
    );

    it.each([
      [1, '1 alert remains open'],
      [3, '3 alerts remain open'],
    ])(
      'says %i candidate alert(s) are still open when a manual review failed',
      (count, expected) => {
        // Manual autonomy closes nothing without a human decision, so a review that ended
        // without one cannot have closed any candidate.
        const rendered = renderReviewFailed('manual', count);

        expect(rendered).toContain('status: failed');
        expect(rendered).toContain(expected);
        expect(rendered).toContain('tagged az:false_positive');
        expect(rendered).not.toContain('may already be closed');
      }
    );
  });

  it('does not claim the proposal was decided when the hand-off comment is written', () => {
    const template = (stepByName('post_comment_review_started')?.with as { message: string })
      .message;
    const rendered = renderString(template, {
      variables: { fp_candidate_count: 2 },
      inputs: { autonomy: 'manual', confidence_floor: 0.85 },
    });

    expect(rendered).toContain('handed to the closure review');
    expect(rendered).toContain('A human decision is required.');
    expect(rendered).toContain('The outcome is posted here');
  });
});
