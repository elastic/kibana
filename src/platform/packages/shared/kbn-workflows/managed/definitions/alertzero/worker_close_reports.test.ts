/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  findUnreadStatusRouteCloses,
  findUnreportedCloses,
  getAlertZeroDefinitions,
  hasReportStep,
  stepsOf,
  topLevelSteps,
} from './worker_reports.test_helpers';
import type { YamlStep } from './worker_reports.test_helpers';

/**
 * Every Worker that closes its own Investigation reports the close through
 * `alertzero.reportWorkerOutcome`, right after the step that closes it: an
 * `ai.conversation.metadata.patch` that writes `status: closed`, reported only when that patch
 * changed `status`, or a `kibana.request` to the Agentic Investigations status route, which
 * returns no changed fields, so the Worker reads the status right before it and reports only when
 * it was `open`.
 *
 * Workers start reporting one at a time, each in its own change. The guard checks only the
 * workflows a Worker has claimed by adding a report step, and ignores the rest. Each Worker also declares the workflows it reports from in
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

  it('reads the status right before every status-route close in a workflow that reports', () => {
    const unread = getAlertZeroDefinitions().flatMap((definition) => {
      const steps = stepsOf(definition);
      return hasReportStep(steps)
        ? findUnreadStatusRouteCloses(steps).map(({ name }) => `${definition.id}: ${name}`)
        : [];
    });

    expect(unread).toEqual([]);
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

    it('finds a close in a static parallel branch', () => {
      const steps = topLevelSteps(`
steps:
  - name: fan_out
    type: parallel
    branches:
      - name: settle
        steps:
${close}
`);

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

    const readStatus = `
          - name: read_status_before_close
            type: ai.conversation.metadata.read
            with:
              conversation_id: "{{ inputs.conversation_id }}"`;
    const statusRouteClose = (method = 'PUT', status = 'closed') => `
          - name: close_over_status_route
            type: kibana.request
            with:
              method: ${method}
              path: "/s/{{ workflow.spaceId }}/internal/investigations/investigations/{{ inputs.conversation_id }}/status"
              body:
                status: ${status}`;
    const closeReport = `
          - name: report_investigation_closed
            type: alertzero.reportWorkerOutcome
            with:
              event: worker_investigation_closed`;

    it('finds a status-route close that no report follows', () => {
      expect(
        findUnreportedCloses(topLevelSteps(workflow(statusRouteClose()))).map(({ name }) => name)
      ).toEqual(['close_over_status_route']);
    });

    it('accepts a status-route close followed by its close report', () => {
      expect(
        findUnreportedCloses(topLevelSteps(workflow(`${statusRouteClose()}${closeReport}`)))
      ).toEqual([]);
    });

    it.each([
      ['a status read', () => statusRouteClose('GET')],
      ['a reopen', () => statusRouteClose('PUT', 'open')],
    ])('does not treat %s over the status route as a close', (_label, build) => {
      expect(findUnreportedCloses(topLevelSteps(workflow(build())))).toEqual([]);
    });

    it('finds a status-route close with no status read right before it', () => {
      expect(
        findUnreadStatusRouteCloses(
          topLevelSteps(workflow(`${statusRouteClose()}${closeReport}`))
        ).map(({ name }) => name)
      ).toEqual(['close_over_status_route']);
    });

    it('finds a status-route close whose read is of another Investigation', () => {
      const otherRead = readStatus.replace('inputs.conversation_id', 'inputs.other_id');

      expect(
        findUnreadStatusRouteCloses(
          topLevelSteps(workflow(`${otherRead}${statusRouteClose()}${closeReport}`))
        ).map(({ name }) => name)
      ).toEqual(['close_over_status_route']);
    });

    it('accepts a status-route close right after a status read of its Investigation', () => {
      expect(
        findUnreadStatusRouteCloses(
          topLevelSteps(workflow(`${readStatus}${statusRouteClose()}${closeReport}`))
        )
      ).toEqual([]);
    });

    it('does not ask a patch close for a status read', () => {
      expect(findUnreadStatusRouteCloses(topLevelSteps(workflow(close)))).toEqual([]);
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
