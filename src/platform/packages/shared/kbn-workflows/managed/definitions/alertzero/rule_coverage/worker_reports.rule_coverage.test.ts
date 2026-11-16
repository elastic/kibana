/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ALERTZERO_COVERAGE_REVIEW_WORKFLOW, ALERTZERO_COVERAGE_WORKER_WORKFLOW } from '..';
import {
  allSteps,
  describeCloseReports,
  describeReportStep,
  INVESTIGATION_ID,
  renderReport,
  stepNamed,
  stepsOf,
  topLevelSteps,
} from '../worker_reports.test_helpers';
import type { YamlStep } from '../worker_reports.test_helpers';

/**
 * The Rule Coverage Worker's reports (`alertzero.reportWorkerOutcome`), rendered
 * the way the engine renders them. The plugin's `shipped_yaml_contract.rule_coverage.test.ts` validates the same `with` blocks
 * against the step's real input schema; these tests pin the values each scenario renders.
 */

describe('Rule Coverage close reports', () => {
  describeCloseReports({
    closeReports: [
      // The review computes its reason, so its report reads it back from the close's output.
      {
        closeReason: '{{ steps.close_investigation_resolved.output.metadata.close_reason }}',
        closeStep: 'close_investigation_resolved',
        definition: ALERTZERO_COVERAGE_REVIEW_WORKFLOW,
        reportStep: 'report_investigation_closed_resolved',
      },
      {
        closeReason: 'other',
        closeStep: 'close_investigation_dismissed',
        definition: ALERTZERO_COVERAGE_REVIEW_WORKFLOW,
        reportStep: 'report_investigation_closed_dismissed',
      },
      {
        closeReason: 'other',
        closeStep: 'close_investigation_declined',
        definition: ALERTZERO_COVERAGE_REVIEW_WORKFLOW,
        reportStep: 'report_investigation_closed_declined',
      },
      {
        closeReason: 'other',
        closeStep: 'close_investigation_no_rule',
        definition: ALERTZERO_COVERAGE_REVIEW_WORKFLOW,
        reportStep: 'report_investigation_closed_no_rule',
      },
      {
        closeReason: 'other',
        closeStep: 'close_investigation_retry',
        definition: ALERTZERO_COVERAGE_REVIEW_WORKFLOW,
        reportStep: 'report_investigation_closed_retry',
      },
    ],
    definitions: [ALERTZERO_COVERAGE_WORKER_WORKFLOW, ALERTZERO_COVERAGE_REVIEW_WORKFLOW],
  });
});

describe('Rule Coverage metadata patches', () => {
  // The flyout shows `metadata.verdict` as a Conclusion section, which the MVP dropped.
  it('write no verdict', () => {
    const writers = [
      ALERTZERO_COVERAGE_WORKER_WORKFLOW,
      ALERTZERO_COVERAGE_REVIEW_WORKFLOW,
    ].flatMap((definition) =>
      allSteps(stepsOf(definition))
        .filter(
          (step) =>
            step.type === 'ai.conversation.metadata.patch' &&
            'verdict' in ((step.with?.updates as Record<string, unknown> | undefined) ?? {})
        )
        .map(({ name }) => `${definition.id}: ${name}`)
    );

    expect(writers).toEqual([]);
  });
});

describe('Rule Coverage outcome reports', () => {
  describe('the sweep (coverage_worker.yaml)', () => {
    const steps = topLevelSteps(ALERTZERO_COVERAGE_WORKER_WORKFLOW.yaml);
    const report = stepNamed(steps, 'report_worker_run_completed');

    describeReportStep(steps, 'report_worker_run_completed', 'worker_run_completed', 'emit_result');

    const MAX_OPEN_CHECKS = 100;
    const BATCH_SIZE = 5;

    const sweepContext = ({
      inFlight = 0,
      lookupFailed = false,
      pending = 0,
      searchFailed = false,
      started = 0,
    }: {
      inFlight?: number;
      lookupFailed?: boolean;
      pending?: number;
      searchFailed?: boolean;
      started?: number;
    }): Record<string, unknown> => ({
      consts: { no_rows: [] },
      steps: {
        collect_active_indicators: { output: { count: inFlight } },
        list_active_reviews: lookupFailed
          ? { error: { message: 'HTTP 500' } }
          : { output: { results: [] } },
        resolve_batch_size: { output: { size: BATCH_SIZE } },
        resolve_dispatch_batch: {
          output: {
            indicators: Array.from({ length: started }, (_, index) => ({ _id: `ki-${index}` })),
          },
        },
        resolve_free_slots: { output: { free: Math.max(MAX_OPEN_CHECKS - inFlight, 0) } },
        search_pending_indicators: searchFailed
          ? { error: { message: 'index_not_found_exception' } }
          : { output: { hits: { hits: [], total: { value: pending } } } },
      },
    });

    it.each([
      [
        'reviews started',
        { inFlight: 2, pending: 9, started: 5 },
        {
          candidates_found: 9,
          degraded_reason: 'none',
          items_dispatched: 5,
          items_in_flight: '7',
          lookup_failed: false,
          run_outcome: 'produced',
          source_read_failed: false,
        },
      ],
      [
        'an empty queue',
        {},
        {
          candidates_found: 0,
          degraded_reason: 'none',
          items_dispatched: 0,
          items_in_flight: '0',
          lookup_failed: false,
          run_outcome: 'empty_nothing_pending',
          source_read_failed: false,
        },
      ],
      [
        // A plain batch-size cut: slots were free, the batch was just smaller than the queue.
        'a batch of a longer queue, with slots to spare',
        { pending: 9, started: 5 },
        {
          candidates_found: 9,
          degraded_reason: 'none',
          items_dispatched: 5,
          items_in_flight: '5',
          lookup_failed: false,
          run_outcome: 'produced',
          source_read_failed: false,
        },
      ],
      [
        'a batch the open-review ceiling cut short',
        { inFlight: 98, pending: 9, started: 2 },
        {
          candidates_found: 9,
          degraded_reason: 'capacity',
          items_dispatched: 2,
          items_in_flight: '100',
          lookup_failed: false,
          run_outcome: 'degraded_partial',
          source_read_failed: false,
        },
      ],
      [
        'a pending queue with no free slot',
        { inFlight: 100, pending: 4 },
        {
          candidates_found: 4,
          degraded_reason: 'capacity',
          items_dispatched: 0,
          items_in_flight: '100',
          lookup_failed: false,
          run_outcome: 'empty_at_capacity',
          source_read_failed: false,
        },
      ],
      [
        'a failed search',
        { searchFailed: true },
        {
          candidates_found: 0,
          degraded_reason: 'dependency_unavailable',
          items_dispatched: 0,
          items_in_flight: '0',
          lookup_failed: false,
          run_outcome: 'failed_source_unavailable',
          source_read_failed: true,
        },
      ],
      [
        'a failed active-review lookup the sweep carried on without',
        { lookupFailed: true, pending: 3, started: 3 },
        {
          candidates_found: 3,
          degraded_reason: 'dependency_unavailable',
          items_dispatched: 3,
          items_in_flight: '3',
          lookup_failed: true,
          run_outcome: 'produced',
          source_read_failed: false,
        },
      ],
    ])('renders %s', (_scenario, scenario, expected) => {
      expect(renderReport(report, sweepContext(scenario))).toEqual(expected);
    });
  });

  describe('the review (coverage_review.yaml)', () => {
    const steps = topLevelSteps(ALERTZERO_COVERAGE_REVIEW_WORKFLOW.yaml);
    const report = stepNamed(steps, 'report_review_completed');
    // As in tuning, the manual entry gate ends the run in its `dismissed` and `expired` arms.
    const entryArm = (match: string): YamlStep[] =>
      stepNamed(stepNamed(steps, 'entry_gate').steps ?? [], 'entry_decision').cases?.find(
        (entryCase) => entryCase.match === match
      )?.steps ?? [];
    const declinedArm = entryArm('dismissed');
    const undecidedArm = entryArm('expired');

    describeReportStep(
      steps,
      'report_review_completed',
      'rule_coverage_review_completed',
      'emit_failure'
    );
    describeReportStep(
      declinedArm,
      'report_review_completed_declined',
      'rule_coverage_review_completed',
      'stop_declined'
    );
    describeReportStep(
      undecidedArm,
      'report_review_completed_undecided',
      'rule_coverage_review_completed',
      'stop_expired'
    );

    it.each([
      [
        'a declined review',
        () => stepNamed(declinedArm, 'report_review_completed_declined'),
        { mark_declined: { output: { result: 'updated' } } },
        { entry_gate: 'declined', ki_processed: true },
      ],
      [
        'an unanswered entry gate',
        () => stepNamed(undecidedArm, 'report_review_completed_undecided'),
        {},
        { entry_gate: 'undecided' },
      ],
    ])('renders %s, which ends the review before the check', (_label, getReport, outputs, gate) => {
      expect(
        renderReport(getReport(), {
          steps: {
            create_investigation: { output: { conversation_id: INVESTIGATION_ID } },
            ...outputs,
          },
        })
      ).toEqual({
        decision: 'none',
        investigation_id: INVESTIGATION_ID,
        proposal_kind: 'none',
        verdict: 'none',
        ...gate,
      });
    });

    const NOTHING_HAPPENED = {
      applied: false,
      approved_not_applied: false,
      check_failed: false,
      creation_failed: false,
      creation_skipped: false,
      entry_gate: 'skipped',
      investigation_id: INVESTIGATION_ID,
      ki_processed: false,
      rule_created: false,
      rule_source: '',
      rule_type: '',
    };

    const reviewContext = (
      verdict: string | undefined,
      stepOutputs: Record<string, unknown>
    ): Record<string, unknown> => ({
      steps: {
        coverage_check: { output: { structured_output: { verdict } } },
        create_investigation: verdict ? { output: { conversation_id: INVESTIGATION_ID } } : {},
        ...stepOutputs,
      },
    });

    it.each([
      [
        'an approved enable that landed',
        reviewContext('covered_disabled', {
          mark_processed: { output: { result: 'updated' } },
          propose_enable: { output: { decision: 'approved', status: 'succeeded' } },
          resolve_rule: {
            output: {
              enabled: false,
              id: 'rule-so-id',
              immutable: false,
              rule_source: { type: 'internal' },
              type: 'new_terms',
            },
          },
          record_decision: { output: { applied: true, approved: true, dismissed: false } },
          refetch_rule: { output: { enabled: true, id: 'rule-so-id', type: 'new_terms' } },
          resolve_outcome: {
            output: { enable_approved_not_applied: false, install_approved_not_applied: false },
          },
        }),
        {
          ...NOTHING_HAPPENED,
          applied: true,
          decision: 'approved',
          ki_processed: true,
          proposal_kind: 'enable_rule',
          rule_source: 'custom',
          rule_type: 'new_terms',
          verdict: 'covered_disabled',
        },
      ],
      [
        'an approved install that did not land',
        reviewContext('prebuilt_available', {
          propose_install: { output: { decision: 'approved', status: 'succeeded' } },
          record_decision: { output: { applied: true, approved: true, dismissed: false } },
          refetch_rule: { error: { message: 'HTTP 404: not found' } },
          resolve_outcome: {
            output: { enable_approved_not_applied: false, install_approved_not_applied: true },
          },
        }),
        {
          ...NOTHING_HAPPENED,
          approved_not_applied: true,
          decision: 'approved',
          proposal_kind: 'install_prebuilt_rule',
          rule_source: 'prebuilt',
          verdict: 'prebuilt_available',
        },
      ],
      [
        'a created rule',
        reviewContext('no_coverage', {
          mark_processed: { output: { result: 'updated' } },
          record_decision: { output: { applied: false, approved: true, dismissed: false } },
          run_rule_creation: {
            output: { created: true, decision: 'approved', reviewed: true, skip_reason: '' },
          },
        }),
        {
          ...NOTHING_HAPPENED,
          decision: 'approved',
          ki_processed: true,
          proposal_kind: 'create_rule',
          rule_created: true,
          rule_source: 'custom',
          rule_type: 'esql',
          verdict: 'no_coverage',
        },
      ],
      [
        'a rule creation that proposed nothing',
        reviewContext('no_coverage', {
          record_decision: { output: { applied: false, approved: false, dismissed: false } },
          run_rule_creation: {
            output: {
              created: false,
              decision: '',
              reviewed: false,
              skip_reason: 'No data source covers the technique.',
            },
          },
        }),
        {
          ...NOTHING_HAPPENED,
          creation_skipped: true,
          decision: 'none',
          proposal_kind: 'none',
          verdict: 'no_coverage',
        },
      ],
      [
        'a failed rule creation',
        reviewContext('no_coverage', {
          record_decision: { output: { applied: false, approved: false, dismissed: false } },
          run_rule_creation: { error: { message: 'child failed' } },
        }),
        {
          ...NOTHING_HAPPENED,
          creation_failed: true,
          decision: 'none',
          proposal_kind: 'none',
          verdict: 'no_coverage',
        },
      ],
      [
        'a dismissed confirmation after an approved entry gate',
        reviewContext('covered_enabled', {
          propose_confirm: { output: { decision: 'dismissed', status: 'no_action' } },
          propose_entry: { output: { decision: 'approved', status: 'no_action' } },
          record_decision: { output: { applied: false, approved: false, dismissed: true } },
          resolve_rule: {
            output: {
              enabled: true,
              id: 'rule-so-id',
              immutable: true,
              rule_source: { is_customized: false, type: 'external' },
              type: 'machine_learning',
            },
          },
        }),
        {
          ...NOTHING_HAPPENED,
          decision: 'dismissed',
          entry_gate: 'approved',
          proposal_kind: 'confirm_coverage',
          rule_source: 'prebuilt',
          // The rule's own type; the step maps it to `ml`.
          rule_type: 'machine_learning',
          verdict: 'covered_enabled',
        },
      ],
      [
        'a manual follow-up nobody decided',
        reviewContext('covered_disabled', {
          record_decision: { output: { applied: false, approved: false, dismissed: false } },
          report_unresolved_rule: { output: { status: 'expired' } },
        }),
        {
          ...NOTHING_HAPPENED,
          decision: 'undecided',
          proposal_kind: 'manual_follow_up',
          verdict: 'covered_disabled',
        },
      ],
      [
        'a verdict outside the vocabulary',
        reviewContext('partially_covered', {
          record_decision: { output: { applied: false, approved: true, dismissed: false } },
          report_unknown_verdict: { output: { decision: 'approved', status: 'no_action' } },
        }),
        {
          ...NOTHING_HAPPENED,
          decision: 'approved',
          proposal_kind: 'manual_follow_up',
          verdict: 'none',
        },
      ],
      [
        'a check that returned no verdict',
        reviewContext(undefined, {
          record_decision: { output: { applied: false, approved: false, dismissed: false } },
        }),
        {
          ...NOTHING_HAPPENED,
          check_failed: true,
          decision: 'none',
          investigation_id: '',
          proposal_kind: 'none',
          verdict: 'none',
        },
      ],
    ])('renders %s', (_scenario, context, expected) => {
      expect(renderReport(report, context)).toEqual(expected);
    });

    it('sends the free-text outputs only as flags', () => {
      expect(JSON.stringify(report.with)).not.toMatch(
        /check_error|creation_error|rule_name|rationale|\{\{ steps\.run_rule_creation\.output\.skip_reason \}\}/
      );
    });
  });
});
