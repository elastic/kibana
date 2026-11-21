/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW, ALERTZERO_RULE_TUNING_WORKER_WORKFLOW } from '..';
import {
  allSteps,
  describeCloseReports,
  describeReportStep,
  evalGuard,
  INVESTIGATION_ID,
  renderReport,
  stepNamed,
  stepsOf,
  topLevelSteps,
} from '../worker_reports.test_helpers';
import type { YamlStep } from '../worker_reports.test_helpers';

/**
 * The Rule Tuning Worker's reports (`alertzero.reportWorkerOutcome`), rendered
 * the way the engine renders them. The plugin's `shipped_yaml_contract.rule_tuning.test.ts` validates the same `with` blocks against
 * the step's real input schema; these tests pin the values each scenario renders.
 */

describe('Rule Tuning close reports', () => {
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
    ],
    definitions: [ALERTZERO_RULE_TUNING_WORKER_WORKFLOW, ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW],
  });
});

describe('Rule Tuning metadata patches', () => {
  // The flyout shows `metadata.verdict` as a Conclusion section, which the MVP dropped.
  it('write no verdict', () => {
    const writers = [
      ALERTZERO_RULE_TUNING_WORKER_WORKFLOW,
      ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW,
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

describe('Rule Tuning outcome reports', () => {
  describe('the sweep (rule_tuning_worker.yaml)', () => {
    const steps = topLevelSteps(ALERTZERO_RULE_TUNING_WORKER_WORKFLOW.yaml);
    const report = stepNamed(steps, 'report_worker_run_completed');

    describeReportStep(
      steps,
      'report_worker_run_completed',
      'worker_run_completed',
      'emit_failed_result'
    );

    /** A harvest row; the rule's `id@revision` key is its fifth column. */
    const harvestRow = (ruleKey: string): unknown[] => [0, 0, 0, 0, ruleKey];

    const withReadFailure = (context: {
      consts: Record<string, unknown>;
      steps: Record<string, unknown>;
    }): Record<string, unknown> => ({
      ...context,
      steps: {
        ...context.steps,
        resolve_read_failure: {
          output: renderReport(stepNamed(steps, 'resolve_read_failure'), context),
        },
      },
    });

    const sweepContext = ({
      activeReviews = 0,
      eligible = 0,
      harvestFailed = false,
      ineligible = 0,
      lookupFailed = false,
      requested = 0,
      rulesLookupFailed = false,
      rulesTruncated = false,
      screenFailed = false,
    }: {
      activeReviews?: number;
      /** Harvested rules that are still enabled, at the revision their alerts came from. */
      eligible?: number;
      harvestFailed?: boolean;
      /** Harvested rules edited since their alerts. */
      ineligible?: number;
      lookupFailed?: boolean;
      requested?: number;
      rulesLookupFailed?: boolean;
      /** More enabled rules than the lookup's page holds. */
      rulesTruncated?: boolean;
      screenFailed?: boolean;
    }): Record<string, unknown> => {
      const eligibleKeys = Array.from({ length: eligible }, (_, index) => `rule-${index}@1`);
      const ineligibleKeys = Array.from({ length: ineligible }, (_, index) => `stale-${index}@1`);
      const harvested = [...eligibleKeys, ...ineligibleKeys];
      return withReadFailure({
        consts: { no_rows: [] },
        steps: {
          collect_active_rules: { output: { expected: activeReviews } },
          // Skipped after a failed lookup or screen, so it has no output at all.
          ...(rulesLookupFailed || screenFailed
            ? {}
            : {
                harvest_fp_alerts_by_rule: harvestFailed
                  ? { error: { message: 'search_phase_execution_exception' } }
                  : { output: { values: harvested.map(harvestRow) } },
              }),
          list_active_reviews: lookupFailed
            ? { error: { message: 'HTTP 500' } }
            : { output: { results: [] } },
          list_enabled_rules: rulesLookupFailed
            ? { error: { message: 'HTTP 500' } }
            : { output: { data: [] } },
          // Skipped after a failed lookup, so its keys are unset.
          ...(rulesLookupFailed
            ? {}
            : {
                resolve_enabled_rules: {
                  output: {
                    rule_revision_keys: `,${eligibleKeys.join(',')},`,
                    truncated: rulesTruncated,
                  },
                },
              }),
          resolve_fanout_rows: {
            output: { rows: Array.from({ length: requested }, (_, index) => [`rule-${index}`]) },
          },
          screen_rule_fp_rates: screenFailed
            ? { error: { message: 'search_phase_execution_exception' } }
            : { output: { values: [] } },
        },
      });
    };

    it.each([
      ['a failed harvest', { harvestFailed: true }, true],
      ['a failed enabled-rule lookup', { rulesLookupFailed: true }, true],
      ['a failed screen', { screenFailed: true }, true],
      ['a failed active-review lookup', { lookupFailed: true }, false],
      ['reviews requested for noisy rules', { eligible: 3, requested: 2 }, false],
      ['no noisy rule', {}, false],
    ])('ends the sweep as failed after %s', (_scenario, scenario, expected) => {
      expect(evalGuard(stepNamed(steps, 'emit_failed_result'), sweepContext(scenario))).toBe(
        expected
      );
    });

    it('ends the run with a failed workflow output', () => {
      const { type, status } = stepNamed(steps, 'emit_failed_result') as YamlStep & {
        status?: string;
      };

      expect({ type, status }).toEqual({ type: 'workflow.output', status: 'failed' });
    });

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
        // 15 noisy rules, 3 edited since their alerts, and the fan-out cap of 10:
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
        // Without the enabled rules the screen and the harvest are skipped.
        'a failed rules lookup, which skips the screen and the harvest',
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
        'a failed screen, which skips the harvest',
        { eligible: 3, screenFailed: true },
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
        // The first page of enabled rules was full: the rules past it were never
        // screened, so the reviews it did start are only part of the picture.
        'a space with more enabled rules than one lookup page holds',
        { eligible: 2, requested: 2, rulesTruncated: true },
        {
          candidates_found: 2,
          degraded_reason: 'capacity',
          items_dispatched: 2,
          items_in_flight: '2',
          lookup_failed: false,
          run_outcome: 'degraded_partial',
          source_read_failed: false,
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
        // The screen drops rules already under review, so the sweep finds nothing new.
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
