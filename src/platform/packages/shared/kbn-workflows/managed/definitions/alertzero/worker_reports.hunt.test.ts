/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import {
  ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW,
  ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW,
  ALERTZERO_HUNT_WORKFLOW,
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW,
} from '.';
import {
  describeCloseReports,
  describeReportStep,
  INVESTIGATION_ID,
  renderReport,
  renderValue,
  stepNamed,
  topLevelSteps,
} from './worker_reports.test_helpers';

/**
 * The Continuous Threat Hunt Worker's reports (`alertzero.reportWorkerOutcome`), rendered the way
 * the engine renders them. The plugin's `shipped_yaml_contract.hunt.test.ts` validates the same
 * `with` blocks against the step's real input schema; these tests pin the values each scenario
 * renders.
 */

describe('Continuous Threat Hunt close reports', () => {
  describeCloseReports({
    closeReports: [
      {
        closeReason: 'benign',
        closeStep: 'dismiss_investigation_if_clean',
        definition: ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW,
        reportStep: 'report_investigation_closed_benign',
      },
      {
        closeReason: 'resolved',
        closeStep: 'close_if_settled',
        definition: ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW,
        reportStep: 'report_investigation_closed_settled',
      },
    ],
    definitions: [
      ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW,
      ALERTZERO_HUNT_WORKFLOW,
      ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW,
      ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW,
    ],
  });
});

describe('Continuous Threat Hunt outcome reports', () => {
  describe('the Worker (hunt_continuous_threat_hunt.yaml)', () => {
    const steps = topLevelSteps(
      ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW.yamlTemplate({
        autonomyLevel: 'assisted',
        scheduleInterval: '4h',
        settingsVersion: 1,
      })
    );
    const names = steps.map(({ name }) => name);
    const fanOut = stepNamed(steps, 'report_fan_out');
    const branch = fanOut.steps ?? [];
    const report = stepNamed(steps, 'report_worker_run_completed');

    it('records each report outcome as the last, atomic step of its branch', () => {
      const record = branch[branch.length - 1];

      expect({
        keys: Object.keys(record).sort(),
        name: record.name,
        outcome: record.with?.outcome,
        type: record.type,
      }).toEqual({
        keys: ['name', 'type', 'with'],
        name: 'record_report_outcome',
        outcome: '{{ steps.resolve_run_outcome.output.outcome }}',
        type: 'data.set',
      });
    });

    it('passes whether the hunt ran Tier 2 to packaging as a boolean', () => {
      const packageReport = stepNamed(branch, 'package_report');
      const inputs = packageReport.with?.inputs as Record<string, unknown>;

      expect(
        [{ tier2_invoked: true }, { tier2_invoked: false }, undefined].map((output) =>
          renderValue(inputs.tier2_invoked, { steps: { hunt: output ? { output } : {} } })
        )
      ).toEqual([true, false, false]);
    });

    it('reports the run as the last top-level step, after the fan-out', () => {
      expect({
        continue: report['on-failure']?.continue,
        event: report.with?.event,
        guard: report.if,
        last: names[names.length - 1],
        previous: names[names.length - 2],
      }).toEqual({
        continue: true,
        event: 'worker_run_completed',
        guard: undefined,
        last: 'report_worker_run_completed',
        previous: 'report_fan_out',
      });
    });

    const sweepContext = ({
      branchesFailed = 0,
      ids,
      outcomes = [],
      scope = 'ok',
      scopeFailed = false,
      selectFailed = false,
    }: {
      branchesFailed?: number;
      ids?: readonly string[];
      outcomes?: ReadonlyArray<'completed' | 'partial' | 'failed'>;
      scope?: 'ok' | 'degraded' | 'blocked';
      scopeFailed?: boolean;
      selectFailed?: boolean;
    }): Record<string, unknown> => {
      const blocked = scopeFailed || scope === 'blocked';
      return {
        steps: {
          check_index_scope: scopeFailed
            ? { error: { message: 'HTTP 500' } }
            : { output: { status: scope } },
          resolve_index_scope_gate: { output: { index_scope_blocked: blocked } },
          ...(blocked
            ? {}
            : {
                select_candidate_reports: selectFailed
                  ? { error: { message: 'HTTP 500' } }
                  : { output: { ids: ids ?? outcomes.map((_, index) => `report-${index}`) } },
              }),
          ...(blocked || selectFailed || outcomes.length + branchesFailed === 0
            ? {}
            : {
                report_fan_out: {
                  output: {
                    failed: branchesFailed,
                    results: [
                      ...outcomes.map((outcome) => ({ output: { outcome }, status: 'completed' })),
                      ...Array.from({ length: branchesFailed }, () => ({ status: 'failed' })),
                    ],
                  },
                },
              }),
        },
      };
    };

    it.each([
      [
        'every report hunted and packaged',
        { outcomes: ['completed', 'completed'] as const },
        {
          candidates_found: 2,
          degraded_reason: 'none',
          items_dispatched: 2,
          items_failed: '0',
          lookup_failed: false,
          run_outcome: 'produced',
          source_read_failed: false,
        },
      ],
      [
        'a partial hunt among completed ones',
        { outcomes: ['completed', 'partial'] as const },
        {
          candidates_found: 2,
          degraded_reason: 'other',
          items_dispatched: 2,
          items_failed: '0',
          lookup_failed: false,
          run_outcome: 'degraded_partial',
          source_read_failed: false,
        },
      ],
      [
        'a failed hunt and a failed branch among completed ones',
        { branchesFailed: 1, outcomes: ['completed', 'failed'] as const },
        {
          candidates_found: 2,
          degraded_reason: 'dependency_unavailable',
          items_dispatched: 3,
          items_failed: '2',
          lookup_failed: false,
          run_outcome: 'degraded_partial',
          source_read_failed: false,
        },
      ],
      [
        'every hunt failed',
        { outcomes: ['failed', 'failed'] as const },
        {
          candidates_found: 2,
          degraded_reason: 'dependency_unavailable',
          items_dispatched: 2,
          items_failed: '2',
          lookup_failed: false,
          run_outcome: 'failed_all_items',
          source_read_failed: false,
        },
      ],
      [
        'an empty selection',
        { ids: [] },
        {
          candidates_found: 0,
          degraded_reason: 'none',
          items_dispatched: 0,
          items_failed: '0',
          lookup_failed: false,
          run_outcome: 'empty_nothing_pending',
          source_read_failed: false,
        },
      ],
      [
        'a failed candidate selection',
        { selectFailed: true },
        {
          candidates_found: 0,
          degraded_reason: 'dependency_unavailable',
          items_dispatched: 0,
          items_failed: '0',
          lookup_failed: false,
          run_outcome: 'failed_source_unavailable',
          source_read_failed: true,
        },
      ],
      [
        'a blocked index scope',
        { scope: 'blocked' as const },
        {
          candidates_found: 0,
          degraded_reason: 'missing_data',
          items_dispatched: 0,
          items_failed: '0',
          lookup_failed: false,
          run_outcome: 'blocked_precondition',
          source_read_failed: false,
        },
      ],
      [
        'an index scope check that failed',
        { scopeFailed: true },
        {
          candidates_found: 0,
          degraded_reason: 'dependency_unavailable',
          items_dispatched: 0,
          items_failed: '0',
          lookup_failed: true,
          run_outcome: 'blocked_precondition',
          source_read_failed: false,
        },
      ],
    ])('renders %s', (_scenario, scenario, expected) => {
      expect(renderReport(report, sweepContext(scenario))).toEqual(expected);
    });
  });

  describe('the hunt (hunt.yaml)', () => {
    const steps = topLevelSteps(ALERTZERO_HUNT_WORKFLOW.yaml);

    it.each([
      ['Tier 2 ran', { status: 'tier1_and_tier2' }, true],
      [
        'Tier 2 was called and threw',
        { status: 'tier1_only', tier2_skipped_reason: 'tier2_failed' },
        true,
      ],
      [
        'Tier 2 was skipped',
        { status: 'tier1_only', tier2_skipped_reason: 'no_searchable_input' },
        false,
      ],
      ['only Tier 2 was skipped', { status: 'tier2_only_skipped' }, false],
      ['the hunt was blocked', { status: 'blocked' }, false],
      ['there is no coordinator result', undefined, false],
    ])('outputs tier2_invoked when %s', (_scenario, result, expected) => {
      const tier2 = stepNamed(steps, 'resolve_result_status').with?.result_tier2_invoked;

      expect(
        renderValue(tier2, {
          steps: {
            read_hunt_result: result ? { output: { data: { result, state: 'completed' } } } : {},
          },
        })
      ).toBe(expected);
    });

    it('declares and emits the tier2_invoked output', () => {
      const workflow = parse(ALERTZERO_HUNT_WORKFLOW.yaml) as {
        outputs: { properties: Record<string, { type: string }> };
      };

      expect({
        declared: workflow.outputs.properties.tier2_invoked,
        emitted: stepNamed(steps, 'emit_result').with?.tier2_invoked,
      }).toEqual({
        declared: { type: 'boolean' },
        emitted: '${{ variables.result_tier2_invoked }}',
      });
    });
  });

  describe('packaging (hunt_package_report.yaml)', () => {
    const steps = topLevelSteps(ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW.yaml);
    const report = stepNamed(steps, 'report_report_completed');

    describeReportStep(steps, 'report_report_completed', 'hunt_report_completed', 'emit_result');

    // `emit_package_failed` ends the run, so the step-failed path reports from the fallback.
    const fallbackSteps = stepNamed(steps, 'decide_and_package')['on-failure']
      ?.fallback as typeof steps;
    describeReportStep(
      fallbackSteps,
      'report_report_completed_package_failed',
      'hunt_report_completed',
      'emit_package_failed'
    );

    it('reports a packaging step that threw as run_incomplete, with nothing packaged', () => {
      expect(
        renderReport(stepNamed(fallbackSteps, 'report_report_completed_package_failed'), {
          inputs: {
            hasConfirmedHit: true,
            huntStatus: 'success',
            investigationConversationId: INVESTIGATION_ID,
            tier2_invoked: true,
          },
          steps: { decide_and_package: { error: { message: 'packaging blew up' } } },
          variables: {},
        })
      ).toEqual({
        closed_clean: false,
        coverage_kis_skipped: 0,
        coverage_kis_written: 0,
        has_confirmed_hit: true,
        hunt_status: 'success',
        investigation_id: INVESTIGATION_ID,
        mint_suppression: 'none',
        package_status: 'run_incomplete',
        proposals_dispatch_failed: 0,
        proposals_prepared: 0,
        tier2_invoked: true,
      });
    });

    it('accepts tier2_invoked as an optional boolean input', () => {
      const workflow = parse(ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW.yaml) as {
        triggers: Array<{
          inputs: { properties: Record<string, { type: string }>; required: string[] };
        }>;
      };
      const [{ inputs }] = workflow.triggers;

      expect({
        required: inputs.required.includes('tier2_invoked'),
        type: inputs.properties.tier2_invoked?.type,
      }).toEqual({ required: false, type: 'boolean' });
    });

    const packagingContext = ({
      dismissCloseFailed = false,
      dispatchFailed = 0,
      hit = true,
      huntStatus = 'success',
      packaged,
      status = 'success',
      tier2Invoked,
    }: {
      dismissCloseFailed?: boolean;
      dispatchFailed?: number;
      hit?: boolean;
      huntStatus?: string;
      packaged?: Record<string, unknown>;
      status?: string;
      tier2Invoked?: boolean;
    }): Record<string, unknown> => ({
      inputs: {
        hasConfirmedHit: hit,
        huntStatus,
        investigationConversationId: INVESTIGATION_ID,
        ...(tier2Invoked === undefined ? {} : { tier2_invoked: tier2Invoked }),
      },
      steps: { decide_and_package: packaged ? { output: packaged } : {} },
      variables: {
        dismiss_close_failed: dismissCloseFailed,
        dispatch_failed_count: dispatchFailed,
        package_status: status,
      },
    });

    it.each([
      [
        'packaged proposals after a Tier 2 run',
        {
          packaged: {
            coverage: {
              skipped: [{ reason: 'disabled' }],
              written: [{ kiId: 'a' }, { kiId: 'b' }],
            },
            dismiss: false,
            mintSuppression: 'none',
            proposals: [{}, {}, {}],
            status: 'packaged',
          },
          tier2Invoked: true,
        },
        {
          closed_clean: false,
          coverage_kis_skipped: 1,
          coverage_kis_written: 2,
          has_confirmed_hit: true,
          hunt_status: 'success',
          investigation_id: INVESTIGATION_ID,
          mint_suppression: 'none',
          package_status: 'success',
          proposals_dispatch_failed: 0,
          proposals_prepared: 3,
          tier2_invoked: true,
        },
      ],
      [
        'a clean run closed as benign',
        {
          hit: false,
          packaged: {
            coverage: { skipped: [], written: [] },
            dismiss: true,
            mintSuppression: 'none',
            proposals: [],
            status: 'packaged',
          },
          tier2Invoked: false,
        },
        {
          closed_clean: true,
          coverage_kis_skipped: 0,
          coverage_kis_written: 0,
          has_confirmed_hit: false,
          hunt_status: 'success',
          investigation_id: INVESTIGATION_ID,
          mint_suppression: 'none',
          package_status: 'success',
          proposals_dispatch_failed: 0,
          proposals_prepared: 0,
          tier2_invoked: false,
        },
      ],
      [
        'a clean run whose benign close failed',
        {
          dismissCloseFailed: true,
          hit: false,
          packaged: {
            coverage: { skipped: [], written: [] },
            dismiss: true,
            mintSuppression: 'none',
            proposals: [],
            status: 'packaged',
          },
          status: 'run_incomplete',
        },
        {
          closed_clean: false,
          coverage_kis_skipped: 0,
          coverage_kis_written: 0,
          has_confirmed_hit: false,
          hunt_status: 'success',
          investigation_id: INVESTIGATION_ID,
          mint_suppression: 'none',
          package_status: 'run_incomplete',
          proposals_dispatch_failed: 0,
          proposals_prepared: 0,
          tier2_invoked: undefined,
        },
      ],
      [
        'every proposal it would raise already exists, here or on another Investigation',
        {
          packaged: {
            alreadyOpenCount: 1,
            converged: [{ investigationConversationId: 'other-investigation' }],
            coverage: { skipped: [], written: [] },
            dismiss: false,
            mintSuppression: 'none',
            proposals: [],
            status: 'packaged',
          },
        },
        {
          closed_clean: false,
          coverage_kis_skipped: 0,
          coverage_kis_written: 0,
          has_confirmed_hit: true,
          hunt_status: 'success',
          investigation_id: INVESTIGATION_ID,
          mint_suppression: 'existing_proposals',
          package_status: 'success',
          proposals_dispatch_failed: 0,
          proposals_prepared: 0,
          tier2_invoked: undefined,
        },
      ],
      [
        'a proposal held back only by one already open on this Investigation',
        {
          packaged: {
            alreadyOpenCount: 1,
            coverage: { skipped: [], written: [] },
            dismiss: false,
            mintSuppression: 'none',
            proposals: [],
            status: 'packaged',
          },
        },
        {
          closed_clean: false,
          coverage_kis_skipped: 0,
          coverage_kis_written: 0,
          has_confirmed_hit: true,
          hunt_status: 'success',
          investigation_id: INVESTIGATION_ID,
          mint_suppression: 'existing_proposals',
          package_status: 'success',
          proposals_dispatch_failed: 0,
          proposals_prepared: 0,
          tier2_invoked: undefined,
        },
      ],
      [
        'a run packaging did not complete, after a hunt status outside the vocabulary',
        { hit: false, huntStatus: 'aborted', status: 'run_incomplete' },
        {
          closed_clean: false,
          coverage_kis_skipped: 0,
          coverage_kis_written: 0,
          has_confirmed_hit: false,
          hunt_status: 'unknown',
          investigation_id: INVESTIGATION_ID,
          mint_suppression: 'none',
          package_status: 'run_incomplete',
          proposals_dispatch_failed: 0,
          proposals_prepared: 0,
          tier2_invoked: undefined,
        },
      ],
    ])('renders %s', (_scenario, scenario, expected) => {
      expect(renderReport(report, packagingContext(scenario))).toEqual(expected);
    });

    it('sends no report, host or proposal text', () => {
      expect(JSON.stringify(report.with)).not.toMatch(
        /reportId|closureSummary|proposalBullets|package_summary|package_reason|title|comment/
      );
    });
  });
});

describe('Continuous Threat Hunt managed versions', () => {
  it.each([
    [
      ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW.id,
      ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW.version,
      5,
    ],
    [ALERTZERO_HUNT_WORKFLOW.id, ALERTZERO_HUNT_WORKFLOW.version, 2],
    [ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW.id, ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW.version, 2],
    [ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW.id, ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW.version, 2],
  ])('bumps %s to the version that carries its reports', (_id, version, expected) => {
    expect(version).toBe(expected);
  });
});
