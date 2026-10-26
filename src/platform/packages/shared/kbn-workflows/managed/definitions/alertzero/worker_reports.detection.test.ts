/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERTZERO_COVERAGE_REVIEW_WORKFLOW,
  ALERTZERO_COVERAGE_WORKER_WORKFLOW,
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW,
} from '.';
import {
  describeCloseReports,
  describeReportStep,
  evalGuard,
  INVESTIGATION_ID,
  renderReport,
  stepNamed,
  topLevelSteps,
} from './worker_reports.test_helpers';
import type { YamlStep } from './worker_reports.test_helpers';

/**
 * The Rule Tuning and Rule Coverage Workers' reports (`alertzero.reportWorkerOutcome`), rendered
 * the way the engine renders them. The plugin's `shipped_yaml_contract.detection.test.ts` validates
 * the same `with` blocks against the step's real input schema; these tests pin the values each
 * scenario renders.
 */

describe('Rule Tuning and Rule Coverage close reports', () => {
  describeCloseReports({
    closeReports: [
      {
        closeReason: 'other',
        closeStep: 'close_investigation_declined',
        definition: ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW,
        reportStep: 'report_investigation_closed_declined',
      },
      {
        closeReason: 'resolved',
        closeStep: 'close_investigation_applied',
        definition: ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW,
        reportStep: 'report_investigation_closed_applied',
      },
      {
        closeReason: 'other',
        closeStep: 'close_investigation_dismissed',
        definition: ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW,
        reportStep: 'report_investigation_closed_dismissed',
      },
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
    ],
    definitions: [
      ALERTZERO_RULE_TUNING_WORKER_WORKFLOW,
      ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW,
      ALERTZERO_COVERAGE_WORKER_WORKFLOW,
      ALERTZERO_COVERAGE_REVIEW_WORKFLOW,
    ],
  });
});

describe('Rule Tuning outcome reports', () => {
  describe('the sweep (rule_tuning_worker.yaml)', () => {
    const steps = topLevelSteps(ALERTZERO_RULE_TUNING_WORKER_WORKFLOW.yaml);
    const report = stepNamed(steps, 'report_worker_run_completed');

    describeReportStep(steps, 'report_worker_run_completed', 'worker_run_completed', 'emit_result');

    /** A harvest row; the rule's `id@revision` key is its seventh column. */
    const harvestRow = (ruleKey: string): unknown[] => [0, 0, 0, 0, 0, 0, ruleKey];

    const sweepContext = ({
      activeReviews = 0,
      eligible = 0,
      harvestFailed = false,
      ineligible = 0,
      lookupFailed = false,
      requested = 0,
      rulesLookupFailed = false,
    }: {
      activeReviews?: number;
      /** Harvested rules that are still enabled, at the revision their alerts came from. */
      eligible?: number;
      harvestFailed?: boolean;
      /** Harvested rules disabled or edited since their alerts. */
      ineligible?: number;
      lookupFailed?: boolean;
      requested?: number;
      rulesLookupFailed?: boolean;
    }): Record<string, unknown> => {
      const eligibleKeys = Array.from({ length: eligible }, (_, index) => `rule-${index}@1`);
      const ineligibleKeys = Array.from({ length: ineligible }, (_, index) => `stale-${index}@1`);
      return {
        consts: { no_rows: [] },
        steps: {
          collect_active_rules: { output: { expected: activeReviews } },
          harvest_fp_alerts_by_rule: harvestFailed
            ? { error: { message: 'search_phase_execution_exception' } }
            : { output: { values: [...eligibleKeys, ...ineligibleKeys].map(harvestRow) } },
          list_active_reviews: lookupFailed
            ? { error: { message: 'HTTP 500' } }
            : { output: { results: [] } },
          list_enabled_candidates: rulesLookupFailed
            ? { error: { message: 'HTTP 500' } }
            : { output: { data: [] } },
          // Rendered from `list_enabled_candidates`, so a failed lookup leaves no key.
          resolve_current_revisions: {
            output: {
              rule_revision_keys: rulesLookupFailed ? ',' : `,${eligibleKeys.join(',')},`,
            },
          },
          resolve_fanout_rows: {
            output: { rows: Array.from({ length: requested }, (_, index) => [`rule-${index}`]) },
          },
        },
      };
    };

    it.each([
      [
        'reviews requested for noisy rules',
        { activeReviews: 1, eligible: 3, requested: 2 },
        {
          candidates_found: 3,
          degraded_reason: 'none',
          items_dispatched: 2,
          items_in_flight: '3',
          lookup_failed: false,
          run_outcome: 'produced',
          source_read_failed: false,
        },
      ],
      [
        'no noisy rule',
        {},
        {
          candidates_found: 0,
          degraded_reason: 'none',
          items_dispatched: 0,
          items_in_flight: '0',
          lookup_failed: false,
          run_outcome: 'empty_nothing_found',
          source_read_failed: false,
        },
      ],
      [
        'a failed harvest',
        { harvestFailed: true },
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
        // 15 noisy rules, 3 disabled or edited since their alerts, and the fan-out cap of 10:
        // found minus dispatched is exactly what the cap held back.
        'only the rules still eligible for review, of a harvest the cap cut short',
        { eligible: 12, ineligible: 3, requested: 10 },
        {
          candidates_found: 12,
          degraded_reason: 'none',
          items_dispatched: 10,
          items_in_flight: '10',
          lookup_failed: false,
          run_outcome: 'produced',
          source_read_failed: false,
        },
      ],
      [
        // Without the enabled rules, no harvested rule can be confirmed eligible.
        'a failed rules lookup after a harvest that worked, which empties the fan-out',
        { eligible: 3, rulesLookupFailed: true },
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
        'a failed in-flight lookup the sweep carried on without',
        { eligible: 2, lookupFailed: true, requested: 2 },
        {
          candidates_found: 2,
          degraded_reason: 'dependency_unavailable',
          items_dispatched: 2,
          items_in_flight: '2',
          lookup_failed: true,
          run_outcome: 'produced',
          source_read_failed: false,
        },
      ],
      [
        // The harvest drops rules already under review, so the sweep finds nothing new.
        'nothing new to review while reviews are in flight',
        { activeReviews: 2 },
        {
          candidates_found: 0,
          degraded_reason: 'none',
          items_dispatched: 0,
          items_in_flight: '2',
          lookup_failed: false,
          run_outcome: 'empty_nothing_found',
          source_read_failed: false,
        },
      ],
    ])('renders %s', (_scenario, scenario, expected) => {
      expect(renderReport(report, sweepContext(scenario))).toEqual(expected);
    });

    // The sweep starts its reviews without waiting for them and keeps no decision totals,
    // so the report reads none of them.
    it('reads no review decision total', () => {
      expect(JSON.stringify(report.with)).not.toMatch(
        /reviews_approved|reviews_failed|rules_applied|run_reviews/
      );
    });
  });

  describe('the review (rule_tuning_review.yaml)', () => {
    const steps = topLevelSteps(ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW.yaml);
    // The manual entry gate ends the run in its `dismissed` and `expired` arms, so each arm
    // reports the review itself, right before the step that stops the run.
    const entryArm = (match: string): YamlStep[] =>
      stepNamed(stepNamed(steps, 'entry_gate').steps ?? [], 'entry_decision').cases?.find(
        (entryCase) => entryCase.match === match
      )?.steps ?? [];
    const declinedArm = entryArm('dismissed');
    const undecidedArm = entryArm('expired');
    const declinedReport = stepNamed(declinedArm, 'report_review_completed_declined');
    const undecidedReport = stepNamed(undecidedArm, 'report_review_completed_undecided');
    const report = stepNamed(steps, 'report_review_completed');

    describeReportStep(
      declinedArm,
      'report_review_completed_declined',
      'rule_tuning_review_completed',
      'stop_declined'
    );
    describeReportStep(
      undecidedArm,
      'report_review_completed_undecided',
      'rule_tuning_review_completed',
      'stop_expired'
    );
    describeReportStep(
      steps,
      'report_review_completed',
      'rule_tuning_review_completed',
      'emit_result'
    );

    it('reports a declined or unanswered entry gate unconditionally inside its own arm', () => {
      expect([evalGuard(declinedReport, {}), evalGuard(undecidedReport, {})]).toEqual([true, true]);
    });

    it.each([
      ['a declined review', () => declinedReport, 'declined'],
      ['an unanswered entry gate', () => undecidedReport, 'undecided'],
    ])('renders %s', (_label, getReport, entryGate) => {
      expect(
        renderReport(getReport(), {
          steps: {
            create_investigation: { output: { conversation_id: INVESTIGATION_ID } },
            fetch_rule: {
              output: {
                enabled: true,
                immutable: true,
                rule_source: { type: 'external' },
                type: 'eql',
              },
            },
          },
        })
      ).toEqual({
        applied: false,
        backtest_ran: false,
        backtest_reduced_alerts: false,
        change_type: 'none',
        confidence: 'none',
        decision: 'none',
        entry_gate: entryGate,
        investigation_id: INVESTIGATION_ID,
        rule_source: 'prebuilt',
        rule_type: 'eql',
        rule_unavailable: false,
      });
    });

    const reviewContext = ({
      changeType = 'query',
      confidence = 'high',
      decision,
      entryDecision,
      entryStatus,
      previews = { current: 12, proposed: 3 },
      proposalStatus = 'succeeded',
      rule = { immutable: false, rule_source: { type: 'internal' }, type: 'query' },
      ruleAvailable = true,
      ruleChanged = true,
    }: {
      changeType?: string;
      confidence?: string;
      decision?: 'approved' | 'dismissed';
      entryDecision?: 'approved' | 'dismissed';
      entryStatus?: string;
      previews?: { current: number; proposed: number } | null;
      proposalStatus?: string;
      rule?: Record<string, unknown>;
      ruleAvailable?: boolean;
      /** Whether the re-read rule has a newer revision than the one the review read. */
      ruleChanged?: boolean;
    }): Record<string, unknown> => {
      const knownArm = ['query', 'risk_score', 'exception', 'threshold', 'schedule'].includes(
        changeType
      )
        ? `propose_${changeType}`
        : 'propose_manual';
      const applied = decision === 'approved' && knownArm !== 'propose_manual';
      const context: { steps: Record<string, unknown> } = {
        steps: {
          ...(ruleAvailable
            ? {
                create_investigation: { output: { conversation_id: INVESTIGATION_ID } },
                diagnose_rule: {
                  output: { structured_output: { change_type: changeType, confidence } },
                },
                fetch_rule: { output: { ...rule, enabled: true, revision: 1 } },
                ...(applied
                  ? {
                      refetch_rule: {
                        output: { id: 'rule-so-id', revision: ruleChanged ? 2 : 1 },
                      },
                    }
                  : {}),
                [knownArm]: { output: { decision, status: proposalStatus } },
                record_preview_outcome: {
                  output: previews
                    ? {
                        current_alert_count: previews.current,
                        current_succeeded: true,
                        proposed_alert_count: previews.proposed,
                        proposed_succeeded: true,
                      }
                    : {
                        current_alert_count: -1,
                        current_succeeded: false,
                        proposed_alert_count: -1,
                        proposed_succeeded: false,
                      },
                },
                record_proposal_action_decision: {
                  output: {
                    applied,
                    approved: decision === 'approved',
                    dismissed: decision === 'dismissed',
                  },
                },
              }
            : { fetch_rule: { error: { message: 'HTTP 404: rule not found' } } }),
          ...(entryStatus
            ? { propose_entry: { output: { decision: entryDecision, status: entryStatus } } }
            : {}),
        },
      };
      // The review computes whether the change landed in its own step before it reports.
      return {
        steps: {
          ...context.steps,
          resolve_applied: { output: renderReport(stepNamed(steps, 'resolve_applied'), context) },
        },
      };
    };

    it.each([
      [
        'an applied query change at assisted autonomy',
        { decision: 'approved' as const },
        {
          applied: true,
          approved_not_applied: false,
          backtest_ran: true,
          backtest_reduced_alerts: true,
          change_type: 'query',
          confidence: 'high',
          decision: 'approved',
          entry_gate: 'skipped',
          investigation_id: INVESTIGATION_ID,
          rule_source: 'custom',
          rule_type: 'query',
          rule_unavailable: false,
        },
      ],
      [
        'a dismissed exception after an approved entry gate, with a failed backtest',
        {
          changeType: 'exception',
          confidence: 'medium',
          decision: 'dismissed' as const,
          entryDecision: 'approved' as const,
          entryStatus: 'no_action',
          previews: null,
          proposalStatus: 'no_action',
        },
        {
          applied: false,
          approved_not_applied: false,
          backtest_ran: false,
          backtest_reduced_alerts: false,
          change_type: 'exception',
          confidence: 'medium',
          decision: 'dismissed',
          entry_gate: 'approved',
          investigation_id: INVESTIGATION_ID,
          rule_source: 'custom',
          rule_type: 'query',
          rule_unavailable: false,
        },
      ],
      [
        'a change type the arms do not name, which the manual arm takes',
        { changeType: 'disable_rule', confidence: 'certain', decision: 'approved' as const },
        {
          applied: false,
          approved_not_applied: false,
          backtest_ran: true,
          backtest_reduced_alerts: true,
          change_type: 'manual',
          confidence: 'none',
          decision: 'approved',
          entry_gate: 'skipped',
          investigation_id: INVESTIGATION_ID,
          rule_source: 'custom',
          rule_type: 'query',
          rule_unavailable: false,
        },
      ],
      [
        'a proposal nobody decided after an approved entry gate',
        {
          changeType: 'risk_score',
          entryDecision: 'approved' as const,
          entryStatus: 'no_action',
          previews: { current: 3, proposed: 3 },
          proposalStatus: 'expired',
        },
        {
          applied: false,
          approved_not_applied: false,
          backtest_ran: true,
          backtest_reduced_alerts: false,
          change_type: 'risk_score',
          confidence: 'high',
          decision: 'undecided',
          entry_gate: 'approved',
          investigation_id: INVESTIGATION_ID,
          rule_source: 'custom',
          rule_type: 'query',
          rule_unavailable: false,
        },
      ],
      [
        'a rule that could not be read',
        { ruleAvailable: false },
        {
          applied: false,
          approved_not_applied: false,
          backtest_ran: false,
          backtest_reduced_alerts: false,
          change_type: 'none',
          confidence: 'none',
          decision: 'none',
          entry_gate: 'skipped',
          investigation_id: '',
          rule_source: '',
          rule_type: '',
          rule_unavailable: true,
        },
      ],
      [
        'an approved query change whose rule did not change, which did not land',
        { decision: 'approved' as const, ruleChanged: false },
        {
          applied: false,
          approved_not_applied: true,
          backtest_ran: true,
          backtest_reduced_alerts: true,
          change_type: 'query',
          confidence: 'high',
          decision: 'approved',
          entry_gate: 'skipped',
          investigation_id: INVESTIGATION_ID,
          rule_source: 'custom',
          rule_type: 'query',
          rule_unavailable: false,
        },
      ],
      [
        // An added exception item leaves the rule's revision alone.
        'an approved exception, which lands without a new rule revision',
        { changeType: 'exception', decision: 'approved' as const, ruleChanged: false },
        {
          applied: true,
          approved_not_applied: false,
          backtest_ran: true,
          backtest_reduced_alerts: true,
          change_type: 'exception',
          confidence: 'high',
          decision: 'approved',
          entry_gate: 'skipped',
          investigation_id: INVESTIGATION_ID,
          rule_source: 'custom',
          rule_type: 'query',
          rule_unavailable: false,
        },
      ],
    ])('renders %s', (_scenario, scenario, expected) => {
      expect(renderReport(report, reviewContext(scenario))).toEqual(expected);
    });

    // The step maps the type to the event's vocabulary (`to_detection_rule_type.ts`).
    it.each([['machine_learning'], ['saved_query'], ['threat_match'], ['a_type_added_later']])(
      "passes a %s rule's own type through",
      (type) => {
        expect(
          renderReport(report, reviewContext({ decision: 'approved', rule: { type } }))
        ).toEqual(expect.objectContaining({ rule_type: type }));
      }
    );

    it.each([
      [
        'an external rule source',
        { rule_source: { is_customized: true, type: 'external' } },
        'prebuilt',
      ],
      ['an immutable rule', { immutable: true }, 'prebuilt'],
      [
        'an internal rule source',
        { immutable: false, rule_source: { type: 'internal' } },
        'custom',
      ],
    ])('reports %s as rule_source %s', (_label, rule, ruleSource) => {
      expect(
        renderReport(
          report,
          reviewContext({ decision: 'approved', rule: { ...rule, type: 'query' } })
        )
      ).toEqual(expect.objectContaining({ rule_source: ruleSource }));
    });

    it('sends no text the model wrote', () => {
      expect(JSON.stringify(report.with)).not.toMatch(
        /summary|fp_pattern|reasoning|proposed_query|title/
      );
    });
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
      'emit_result'
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

describe('Rule Tuning and Rule Coverage managed versions', () => {
  it.each([
    [ALERTZERO_RULE_TUNING_WORKER_WORKFLOW.id, ALERTZERO_RULE_TUNING_WORKER_WORKFLOW.version, 30],
    [ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW.id, ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW.version, 32],
    [ALERTZERO_COVERAGE_WORKER_WORKFLOW.id, ALERTZERO_COVERAGE_WORKER_WORKFLOW.version, 5],
    [ALERTZERO_COVERAGE_REVIEW_WORKFLOW.id, ALERTZERO_COVERAGE_REVIEW_WORKFLOW.version, 6],
  ])('bumps %s to the version that carries its reports', (_id, version, expected) => {
    expect(version).toBe(expected);
  });
});
