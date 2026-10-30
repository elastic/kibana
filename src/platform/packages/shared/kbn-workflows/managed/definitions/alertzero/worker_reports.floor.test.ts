/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW,
  ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW,
} from '.';
import {
  describeCloseReports,
  describeReportStep,
  INVESTIGATION_ID,
  renderReport,
  stepNamed,
  topLevelSteps,
} from './worker_reports.test_helpers';

/**
 * The Alert Triage Worker's reports (`alertzero.reportWorkerOutcome`), rendered the way the engine
 * renders them. The plugin's `shipped_yaml_contract.floor.test.ts` validates the same `with` blocks
 * against the step's real input schema; these tests pin the values each scenario renders.
 */

describe('Alert Triage close reports', () => {
  describeCloseReports({
    closeReports: [
      {
        closeReason: 'other',
        closeStep: 'close_batch_investigation',
        definition: ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW,
        reportStep: 'report_batch_investigation_closed',
      },
      {
        closeReason: 'false_positive',
        closeStep: 'close_investigation_after_approval',
        definition: ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW,
        reportStep: 'report_investigation_closed_after_approval',
      },
      {
        closeReason: 'other',
        closeStep: 'close_investigation_after_dismissal',
        definition: ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW,
        reportStep: 'report_investigation_closed_after_dismissal',
      },
      {
        closeReason: 'other',
        closeStep: 'close_investigation_after_join',
        definition: ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW,
        reportStep: 'report_investigation_closed_after_join',
      },
      {
        closeReason: 'other',
        closeStep: 'close_investigation_after_expiry',
        definition: ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW,
        reportStep: 'report_investigation_closed_after_expiry',
      },
    ],
    definitions: [
      ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW,
      ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW,
    ],
  });
});

describe('Alert Triage outcome reports', () => {
  describe('the batch (floor_alert_triage_batch.yaml)', () => {
    const steps = topLevelSteps(ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW.yaml);
    const names = steps.map(({ name }) => name);
    const batchReport = stepNamed(steps, 'report_batch_classified');
    const runReport = stepNamed(steps, 'report_worker_run_completed');

    describeReportStep(
      steps,
      'report_batch_classified',
      'alert_triage_batch_classified',
      'compute_below_floor_fp_ids'
    );

    it('reports the batch once its counts and false-positive candidates are known', () => {
      expect(names.indexOf('report_batch_classified')).toBeGreaterThan(
        names.indexOf('compute_classification_guard_counts')
      );
    });

    it('reports the run as the last step', () => {
      expect({
        continue: runReport['on-failure']?.continue,
        event: runReport.with?.event,
        last: names[names.length - 1],
      }).toEqual({
        continue: true,
        event: 'worker_run_completed',
        last: 'report_worker_run_completed',
      });
    });

    const batchContext = ({
      alerts,
      fpCandidates = 0,
      startedAlerts = 0,
      alertsJoined = 0,
      verdicts,
    }: {
      alerts: number;
      fpCandidates?: number;
      startedAlerts?: number;
      alertsJoined?: number;
      verdicts: { fp: number; inconclusive: number; tp: number };
    }): Record<string, unknown> => ({
      steps: {
        classify_alerts: {
          output: {
            false_positive_count: verdicts.fp,
            inconclusive_count: verdicts.inconclusive,
            true_positive_count: verdicts.tp,
          },
        },
        group_fp_candidates_call: {
          output: { alerts_joined: alertsJoined },
        },
      },
      variables: {
        alert_count: alerts,
        fp_candidate_count: fpCandidates,
        verdict_count: verdicts.fp + verdicts.inconclusive + verdicts.tp,
        started_alert_count: startedAlerts,
      },
    });

    it('renders a classified batch without an Investigation id, since a batch has none', () => {
      expect(
        renderReport(
          batchReport,
          batchContext({
            alerts: 40,
            fpCandidates: 20,
            verdicts: { fp: 23, inconclusive: 5, tp: 10 },
          })
        )
      ).toEqual({
        alerts_total: 40,
        alerts_without_verdict: 2,
        fp_below_floor: 3,
        fp_candidates: 20,
        verdicts_false_positive: 23,
        verdicts_inconclusive: 5,
        verdicts_true_positive: 10,
      });
    });

    it('counts every alert of a batch that came back without verdicts', () => {
      expect(
        renderReport(batchReport, {
          steps: { classify_alerts: { output: { verdicts: [] } } },
          variables: { alert_count: 7, fp_candidate_count: 0, verdict_count: 0 },
        })
      ).toEqual(
        expect.objectContaining({
          alerts_total: 7,
          alerts_without_verdict: 7,
          fp_below_floor: 0,
          verdicts_false_positive: 0,
        })
      );
    });

    it.each([
      [
        'a batch handed to the closure review',
        {
          alerts: 40,
          fpCandidates: 20,
          startedAlerts: 20,
          verdicts: { fp: 20, inconclusive: 10, tp: 10 },
        },
        {
          candidates_found: 40,
          degraded_reason: 'none',
          items_dispatched: 40,
          items_failed: 0,
          items_in_flight: '20',
          run_outcome: 'produced',
        },
      ],
      [
        'a batch whose candidates all joined a waiting proposal',
        {
          alerts: 20,
          fpCandidates: 20,
          alertsJoined: 20,
          verdicts: { fp: 20, inconclusive: 0, tp: 0 },
        },
        {
          candidates_found: 20,
          degraded_reason: 'none',
          items_dispatched: 20,
          items_failed: 0,
          items_in_flight: '20',
          run_outcome: 'produced',
        },
      ],
      [
        'a batch with no false-positive candidate',
        { alerts: 5, verdicts: { fp: 1, inconclusive: 0, tp: 4 } },
        {
          candidates_found: 5,
          degraded_reason: 'none',
          items_dispatched: 5,
          items_failed: 0,
          items_in_flight: '0',
          run_outcome: 'produced',
        },
      ],
      [
        'a batch with some alerts missing a verdict',
        { alerts: 10, verdicts: { fp: 0, inconclusive: 2, tp: 6 } },
        {
          candidates_found: 10,
          degraded_reason: 'missing_data',
          items_dispatched: 8,
          items_failed: 2,
          items_in_flight: '0',
          run_outcome: 'degraded_partial',
        },
      ],
      [
        'a batch that came back without any verdict',
        { alerts: 10, verdicts: { fp: 0, inconclusive: 0, tp: 0 } },
        {
          candidates_found: 10,
          degraded_reason: 'dependency_unavailable',
          items_dispatched: 0,
          items_failed: 10,
          items_in_flight: '0',
          run_outcome: 'failed_all_items',
        },
      ],
      [
        'an empty batch',
        { alerts: 0, verdicts: { fp: 0, inconclusive: 0, tp: 0 } },
        {
          candidates_found: 0,
          degraded_reason: 'none',
          items_dispatched: 0,
          items_failed: 0,
          items_in_flight: '0',
          run_outcome: 'empty_nothing_pending',
        },
      ],
    ])('renders the run for %s', (_scenario, scenario, expected) => {
      expect(renderReport(runReport, batchContext(scenario))).toEqual(expected);
    });

    it('sends no alert content', () => {
      expect(JSON.stringify([batchReport.with, runReport.with])).not.toMatch(
        /rationale|rule_name|load_alerts|verdicts \|/
      );
    });
  });

  describe('the closure review (floor_alert_triage_review.yaml)', () => {
    const steps = topLevelSteps(ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW.yaml);
    const names = steps.map(({ name }) => name);
    const report = stepNamed(steps, 'report_closure_resolved');

    it('reports the settled closure as the last step, after every outcome branch', () => {
      expect({
        continue: report['on-failure']?.continue,
        event: report.with?.event,
        last: names[names.length - 1],
      }).toEqual({
        continue: true,
        event: 'alert_triage_closure_resolved',
        last: 'report_closure_resolved',
      });
    });

    const reviewContext = ({
      autonomy = 'manual',
      failedRetag,
      liveRevision,
      outcome,
      readFailed = false,
    }: {
      autonomy?: string;
      failedRetag?: number;
      liveRevision?: number;
      outcome: string;
      readFailed?: boolean;
    }): Record<string, unknown> => ({
      inputs: { autonomy, conversation_id: INVESTIGATION_ID },
      steps: {
        get_proposal: readFailed ? { error: { message: 'HTTP 503' } } : { output: {} },
      },
      variables: {
        fp_candidate_count: 12,
        proposal_outcome: outcome,
        ...(failedRetag === undefined ? {} : { failed_retag_count: failedRetag }),
        ...(liveRevision === undefined ? {} : { live_revision: liveRevision }),
      },
    });

    it.each([
      [
        'an auto-approved closure',
        { autonomy: 'supervised', outcome: 'approved' },
        { auto_approve_requested: true, outcome: 'approved' },
      ],
      [
        'a dismissal whose re-tag partly failed',
        { failedRetag: 3, outcome: 'dismissed' },
        { alerts_retag_failed: 3, outcome: 'dismissed' },
      ],
      [
        'a dismissal whose proposal could not be read back',
        { outcome: 'dismissed', readFailed: true },
        { outcome: 'dismissed', proposal_read_failed: true },
      ],
      ['an expired proposal', { outcome: 'expired' }, { outcome: 'expired' }],
      [
        'a proposal that alerts joined',
        { liveRevision: 4, outcome: 'approved' },
        { outcome: 'approved', revisions: 4 },
      ],
      ['an unknown gate state', { outcome: 'unknown' }, { outcome: 'unknown' }],
      ['a value outside the vocabulary', { outcome: 'failed' }, { outcome: 'unknown' }],
    ])('renders %s', (_scenario, scenario, expected) => {
      expect(renderReport(report, reviewContext(scenario))).toEqual({
        alerts_proposed: 12,
        alerts_retag_failed: 0,
        auto_approve_requested: false,
        investigation_id: INVESTIGATION_ID,
        proposal_read_failed: false,
        revisions: 1,
        ...expected,
      });
    });
  });
});

describe('Alert Triage managed versions', () => {
  it.each([
    [
      ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW.id,
      ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW.version,
      12,
    ],
    [
      ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW.id,
      ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW.version,
      12,
    ],
  ])('bumps %s to the version that carries its reports', (_id, version, expected) => {
    expect(version).toBe(expected);
  });
});
