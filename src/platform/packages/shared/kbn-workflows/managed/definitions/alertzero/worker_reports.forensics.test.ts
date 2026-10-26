/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW,
  ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW,
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW,
} from '.';
import {
  describeCloseReports,
  describeReportStep,
  evalGuard,
  renderReport,
  stepNamed,
  topLevelSteps,
} from './worker_reports.test_helpers';

/**
 * The Endpoint Analysis Worker's reports (`alertzero.reportWorkerOutcome`), rendered the way the
 * engine renders them. The plugin's `shipped_yaml_contract.forensics.test.ts` validates the same
 * `with` blocks against the step's real input schema; these tests pin the values each scenario
 * renders.
 */

describe('Endpoint Analysis close reports', () => {
  // Only the proposal gate closes an Investigation, through the Agentic Investigations status
  // route. The route writes no close reason, so the report sends `other`.
  describeCloseReports({
    closeReports: [
      {
        closeReason: 'other',
        closeStep: 'close_if_settled',
        definition: ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW,
        reportStep: 'report_investigation_closed_settled',
      },
    ],
    definitions: [
      ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW,
      ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW,
      ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW,
    ],
  });
});

describe('Endpoint Analysis outcome reports', () => {
  describe('the Worker (forensics_endpoint_analysis.yaml)', () => {
    const steps = topLevelSteps(
      ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW.yamlTemplate({
        autonomyLevel: 'manual',
        settingsVersion: 1,
      })
    );
    const report = stepNamed(steps, 'report_worker_run_completed');

    describeReportStep(steps, 'report_worker_run_completed', 'worker_run_completed', 'emit_result');

    // `start_runs` as the engine's parallel step returns it: a dispatch the engine dropped as a
    // duplicate still completes its branch, with `start_run`'s output saying `skipped`.
    const dispatched = (status: string) => ({ output: { status }, status: 'completed' });
    const sweepContext = ({
      pending = 0,
      refused = 0,
      searchFailed = false,
      skipped = 0,
      started = 0,
    }: {
      pending?: number;
      refused?: number;
      searchFailed?: boolean;
      skipped?: number;
      started?: number;
    }): Record<string, unknown> => {
      const context = {
        steps: {
          search_pending_indicators: searchFailed
            ? { error: { message: 'search failed' } }
            : { output: { hits: { hits: [], total: { value: pending } } } },
          ...(started + skipped + refused > 0
            ? {
                start_runs: {
                  output: {
                    failed: refused,
                    results: [
                      ...Array.from({ length: started }, () => dispatched('pending')),
                      ...Array.from({ length: skipped }, () => dispatched('skipped')),
                      ...Array.from({ length: refused }, () => ({
                        error: { message: 'refused' },
                        status: 'failed',
                      })),
                    ],
                    succeeded: started + skipped,
                    total: started + skipped + refused,
                  },
                },
              }
            : {}),
        },
      };
      return {
        steps: {
          ...context.steps,
          resolve_reported_starts: {
            output: renderReport(stepNamed(steps, 'resolve_reported_starts'), context),
          },
        },
      };
    };

    it('counts the starts in a step that never fails the sweep', () => {
      expect(stepNamed(steps, 'resolve_reported_starts')['on-failure']?.continue).toBe(true);
    });

    // The Worker polls every minute; an empty poll must not send an event. Neither may a poll that
    // only re-dispatched an indicator whose analysis is still running.
    it.each([
      ['an empty poll', {}, false],
      ['a poll whose batch the engine dropped entirely', { pending: 0, started: 0 }, false],
      ['a poll that started analyses', { pending: 2, started: 2 }, true],
      ['a poll whose only dispatch was a running analysis', { pending: 1, skipped: 1 }, false],
      [
        'a poll that started one next to a running one',
        { pending: 2, skipped: 1, started: 1 },
        true,
      ],
      ['a poll whose dispatch the engine refused', { pending: 1, refused: 1 }, true],
      ['a poll whose search failed', { searchFailed: true }, true],
    ])('reports %s: %s', (_scenario, scenario, expected) => {
      expect(evalGuard(report, sweepContext(scenario))).toBe(expected);
    });

    it.each([
      [
        'analyses started',
        { pending: 3, started: 2 },
        {
          candidates_found: 3,
          degraded_reason: 'none',
          items_dispatched: 2,
          items_failed: 0,
          items_in_flight: 2,
          run_outcome: 'produced',
          source_read_failed: false,
        },
      ],
      [
        'one analysis started next to one still running, which counts once, when it started',
        { pending: 2, skipped: 1, started: 1 },
        {
          candidates_found: 2,
          degraded_reason: 'none',
          items_dispatched: 1,
          items_failed: 0,
          items_in_flight: 1,
          run_outcome: 'produced',
          source_read_failed: false,
        },
      ],
      [
        'a refused dispatch next to a started one',
        { pending: 2, refused: 1, started: 1 },
        {
          candidates_found: 2,
          degraded_reason: 'dependency_unavailable',
          items_dispatched: 1,
          items_failed: 1,
          items_in_flight: 1,
          run_outcome: 'degraded_partial',
          source_read_failed: false,
        },
      ],
      [
        'every dispatch refused',
        { pending: 2, refused: 2 },
        {
          candidates_found: 2,
          degraded_reason: 'dependency_unavailable',
          items_dispatched: 0,
          items_failed: 2,
          items_in_flight: 0,
          run_outcome: 'failed_all_items',
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
          items_failed: 0,
          items_in_flight: 0,
          run_outcome: 'failed_source_unavailable',
          source_read_failed: true,
        },
      ],
    ])('renders %s', (_scenario, scenario, expected) => {
      expect(renderReport(report, sweepContext(scenario))).toEqual(expected);
    });
  });

  describe('the analysis run (forensics_run_endpoint_analysis.yaml)', () => {
    const steps = topLevelSteps(ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW.yaml);
    const report = stepNamed(steps, 'report_analysis_completed');

    // Before the verdict writes, which fail the run once their retries are used up: a failed
    // write must not lose the report of the run that did the work.
    describeReportStep(
      steps,
      'report_analysis_completed',
      'endpoint_analysis_completed',
      'mark_processed'
    );

    it('reads no verdict write, so reporting before them changes nothing it sends', () => {
      expect(JSON.stringify(report.with)).not.toMatch(/steps\.mark_/);
    });

    const FINDING_IDS = { iocs: 'forensic-iocs-ki-1', timeline: 'forensic-timeline-ki-1' };

    const runContext = ({
      actions = 0,
      agentFailed = false,
      attached = true,
      dispatched = 0,
      dispatchFailed = 0,
      host = 'host-1',
      investigationReadable = true,
      priorCount = 0,
      readKi = true,
      request = true,
      supervised = false,
      unrecorded = false,
    }: {
      actions?: number;
      agentFailed?: boolean;
      attached?: boolean;
      dispatched?: number;
      dispatchFailed?: number;
      host?: string;
      investigationReadable?: boolean;
      priorCount?: number;
      readKi?: boolean;
      request?: boolean;
      supervised?: boolean;
      unrecorded?: boolean;
    }): Record<string, unknown> => ({
      steps: {
        finding_ids: { output: FINDING_IDS },
        forensic_analysis: agentFailed
          ? { error: { message: 'agent failed' } }
          : {
              output: {
                structured_output: {
                  propose: actions > 0,
                  recommendedActions: Array.from({ length: actions }, () => ({})),
                },
              },
            },
        read_ki: { output: { hits: { hits: readKi ? [{ _id: 'ki-1' }] : [] } } },
        resolve_autonomy: { output: { level: supervised ? 'supervised' : 'manual' } },
        resolve_finding_presence: { output: { iocs: attached, timeline: attached } },
        resolve_host: { output: { host_name: host } },
        resolve_prior_assessment: { output: { count: priorCount } },
        resolve_proposal_dispatch: { output: { failed: dispatchFailed } },
        resolve_proposals: { output: { proposals_lost: dispatchFailed > 0 } },
        resolve_request: { output: { has_request: request } },
        resolve_run_outcome: {
          output: { attached, outcome_unrecorded: unrecorded, settled: attached || host === '' },
        },
        verify_investigation: investigationReadable ? { output: { metadata: {} } } : {},
        ...(dispatched + dispatchFailed > 0
          ? { propose_actions: { output: { failed: dispatchFailed, succeeded: dispatched } } }
          : {}),
      },
    });

    const NOTHING = {
      actions_recommended: 0,
      agent_failed: false,
      auto_approve_requested: false,
      findings_attached: false,
      host_resolved: true,
      iocs_found: false,
      proposals_dispatch_failed: 0,
      proposals_dispatched: 0,
      reused_prior_assessment: false,
      timeline_found: false,
    };

    it.each([
      [
        'findings attached and containment proposed for auto-approval',
        { actions: 2, dispatched: 2, supervised: true },
        {
          ...NOTHING,
          actions_recommended: 2,
          analysis_outcome: 'processed',
          auto_approve_requested: true,
          findings_attached: true,
          iocs_found: true,
          proposals_dispatched: 2,
          timeline_found: true,
        },
      ],
      [
        'a supervised run whose agent recommended nothing, so no gate was asked to auto-approve',
        { supervised: true },
        {
          ...NOTHING,
          analysis_outcome: 'processed',
          findings_attached: true,
          iocs_found: true,
          timeline_found: true,
        },
      ],
      [
        'a supervised run whose only proposal failed to launch',
        { actions: 1, dispatchFailed: 1, supervised: true },
        {
          ...NOTHING,
          actions_recommended: 1,
          analysis_outcome: 'proposals_lost',
          findings_attached: true,
          iocs_found: true,
          proposals_dispatch_failed: 1,
          timeline_found: true,
        },
      ],
      // The agent does not run again, so the run cannot vouch for the earlier run's outcome and
      // retires the indicator as `failed`.
      [
        "an earlier run's findings reused, with no outcome recorded",
        { priorCount: 2, unrecorded: true },
        {
          ...NOTHING,
          analysis_outcome: 'failed',
          findings_attached: true,
          iocs_found: true,
          reused_prior_assessment: true,
          timeline_found: true,
        },
      ],
      [
        'a proposal that did not reach the queue',
        { actions: 2, dispatchFailed: 1, dispatched: 1 },
        {
          ...NOTHING,
          actions_recommended: 2,
          analysis_outcome: 'proposals_lost',
          findings_attached: true,
          iocs_found: true,
          proposals_dispatch_failed: 1,
          proposals_dispatched: 1,
          timeline_found: true,
        },
      ],
      [
        'a failed agent that left no findings',
        { agentFailed: true, attached: false },
        { ...NOTHING, agent_failed: true, analysis_outcome: 'failed' },
      ],
      [
        'a discovery that names no host',
        { attached: false, host: '' },
        { ...NOTHING, analysis_outcome: 'no_host', host_resolved: false },
      ],
      [
        'an Investigation that could not be read',
        { attached: false, investigationReadable: false },
        { ...NOTHING, analysis_outcome: 'unreachable' },
      ],
      [
        'a malformed indicator',
        { attached: false, request: false },
        { ...NOTHING, analysis_outcome: 'invalid' },
      ],
      [
        'an indicator that was no longer pending',
        { attached: false, readKi: false, request: false },
        { ...NOTHING, analysis_outcome: 'not_pending' },
      ],
    ])('renders %s', (_scenario, scenario, expected) => {
      expect(renderReport(report, runContext(scenario))).toEqual(expected);
    });

    it('sends no host, IoC, timeline or action content', () => {
      expect(JSON.stringify(report.with)).not.toMatch(
        /\{\{ steps\.resolve_host\.output\.host_name \}\}|rationale|actionId|actionInput|investigation_id/
      );
    });
  });
});

describe('Endpoint Analysis managed versions', () => {
  it.each([
    [
      ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW.id,
      ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW.version,
      6,
    ],
    [
      ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW.id,
      ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW.version,
      14,
    ],
    [
      ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW.id,
      ALERTZERO_FORENSICS_PROPOSAL_GATE_WORKFLOW.version,
      4,
    ],
  ])('bumps %s to the version that carries its reports', (_id, version, expected) => {
    expect(version).toBe(expected);
  });
});
