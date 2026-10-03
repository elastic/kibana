/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  findUnreportedCloses,
  getAlertZeroDefinitions,
  hasReportStep,
  stepsOf,
  topLevelSteps,
} from './worker_reports.test_helpers';
import type { YamlStep } from './worker_reports.test_helpers';

/**
 * Every Worker that closes its own Investigation reports the close through
 * `alertzero.reportWorkerOutcome`, right after the `ai.conversation.metadata.patch` step that
 * writes `status: closed`, and only when that patch changed `status`.
 *
 * Workers start reporting one at a time, each in its own change, so the guard covers the
 * workflows a Worker has claimed, and leaves every other workflow as it is on `main`. A workflow
 * is claimed once it has a report step. Each Worker also declares the workflows it reports from in
 * its own `shipped_yaml_contract.<worker>.fixture.ts` in the AlertZero plugin, whose
 * `shipped_yaml_contract.test.ts` fails unless the declared workflows are exactly the ones with a
 * report step. So a claimed workflow cannot lose its last report unnoticed, and no shared list
 * changes when a Worker starts reporting. Each Worker's `worker_reports.<worker>.test.ts` then
 * pins every close in its workflows and the report that follows it.
 *
 * The guard is opt-in: it checks only workflows that already have a report step. Until a Worker's
 * change adds its first report step, no workflow has one, so the guard passes without checking
 * anything.
 */

/** The unreported closes of a claimed workflow. An unclaimed workflow has none to report. */
const findUnreportedClaimedCloses = (steps: YamlStep[]): YamlStep[] =>
  hasReportStep(steps) ? findUnreportedCloses(steps) : [];

describe('Worker Investigation close reports', () => {
  it('follows every close in a workflow that reports through the step with a close report', () => {
    const unreported = getAlertZeroDefinitions().flatMap((definition) =>
      findUnreportedClaimedCloses(stepsOf(definition)).map(
        ({ name }) => `${definition.id}: ${name}`
      )
    );

    expect(unreported).toEqual([]);
  });

  describe('the guard', () => {
    const workflow = (closeSteps: string): string => `
steps:
  - name: decide
    type: switch
    cases:
      - match: approved
        steps:
${closeSteps}
`;
    const close = `
          - name: close_investigation
            type: ai.conversation.metadata.patch
            with:
              conversation_id: "{{ inputs.conversation_id }}"
              updates:
                status: closed`;
    const runReport = `
  - name: report_run_completed
    type: alertzero.reportWorkerOutcome
    with:
      event: worker_run_completed`;

    it('leaves the closes of a workflow without a report step unchecked', () => {
      expect(findUnreportedClaimedCloses(topLevelSteps(workflow(close)))).toEqual([]);
    });

    it('catches an unreported close once the workflow has a report step', () => {
      expect(
        findUnreportedClaimedCloses(topLevelSteps(`${workflow(close)}${runReport}`)).map(
          ({ name }) => name
        )
      ).toEqual(['close_investigation']);
    });

    it('finds a close in a nested step list that no report follows', () => {
      const steps = topLevelSteps(
        workflow(`${close}
          - name: journal_closed
            type: workflow.execute`)
      );

      expect(findUnreportedCloses(steps).map(({ name }) => name)).toEqual(['close_investigation']);
    });

    it('finds a close that is the last step of its list', () => {
      expect(findUnreportedCloses(topLevelSteps(workflow(close))).map(({ name }) => name)).toEqual([
        'close_investigation',
      ]);
    });

    it('accepts a close followed by its close report', () => {
      const steps = topLevelSteps(
        workflow(`${close}
          - name: report_investigation_closed
            type: alertzero.reportWorkerOutcome
            with:
              event: worker_investigation_closed`)
      );

      expect(findUnreportedCloses(steps)).toEqual([]);
    });

    it('does not accept a report of another event after a close', () => {
      const steps = topLevelSteps(
        workflow(`${close}
          - name: report_run_completed
            type: alertzero.reportWorkerOutcome
            with:
              event: worker_run_completed`)
      );

      expect(findUnreportedCloses(steps).map(({ name }) => name)).toEqual(['close_investigation']);
    });
  });
});
