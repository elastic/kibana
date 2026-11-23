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
  ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID,
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
} from '.';
import { ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID } from './constants';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValuesById } from '../..';
import { getManagedWorkflowDefinitions } from '../..';
import { createWorkflowLiquidEngine } from '../../../common/utils';
import type { WorkflowStep } from '../../../definition';
import { getNestedStepGroups } from '../../../definition';

/**
 * Shared by the AlertZero Worker report tests: `worker_close_reports.test.ts`, which guards every
 * Worker close, and each Worker's own `worker_reports.<worker>.test.ts`. The Worker reports call
 * the AlertZero plugin's `alertzero.reportWorkerOutcome` step. This package cannot import the
 * plugin, so the plugin's `shipped_yaml_contract.<worker>.test.ts` validates the same `with`
 * blocks against the step's real input schema; these tests pin the values each scenario renders.
 */

export interface YamlStep {
  name: string;
  type?: string;
  if?: string;
  timeout?: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  cases?: Array<{ match?: string; steps: YamlStep[] }>;
  default?: YamlStep[];
  'on-failure'?: { continue?: boolean; fallback?: YamlStep[] };
}

export const REPORT_STEP_TYPE = 'alertzero.reportWorkerOutcome';
export const CLOSE_EVENT = 'worker_investigation_closed';

/**
 * An Investigation id as the Attack Discovery Worker derives it. The AlertZero plugin's
 * shipped-YAML contract tests use the same value.
 */
export const INVESTIGATION_ID = '50e2f8ae-f562-86bd-853f-8e0e1f72b9dd';

/** Configured like the engine's templating engine: a missing value renders as `''`. */
export const liquid = createWorkflowLiquidEngine({ strictFilters: true, strictVariables: false });

/** A whole-value `${{ }}` keeps its type; anything else renders as a string template. */
export const renderValue = (value: unknown, context: Record<string, unknown>): unknown => {
  if (typeof value === 'string' && value.startsWith('${{') && value.endsWith('}}')) {
    return liquid.evalValueSync(value.slice(3, -2).trim(), context);
  }
  return typeof value === 'string' ? liquid.parseAndRenderSync(value, context) : value;
};

export const topLevelSteps = (yaml: string): YamlStep[] =>
  (parse(yaml) as { steps: YamlStep[] }).steps;

export const stepNamed = (steps: YamlStep[], name: string): YamlStep => {
  const step = steps.find((candidate) => candidate.name === name);
  if (!step) {
    throw new Error(`No step named ${name}`);
  }
  return step;
};

/** The `with` block of a report step, rendered against a run's context, without the event. */
export const renderReport = (
  step: YamlStep,
  context: Record<string, unknown>
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(step.with ?? {})
      .filter(([key]) => key !== 'event')
      .map(([key, value]) => [key, renderValue(value, context)])
  );

/** A step's `if`, evaluated against a run's context. A step without one always runs. */
export const evalGuard = (step: YamlStep | undefined, context: Record<string, unknown>): unknown =>
  step?.if ? liquid.evalValueSync(step.if.trim().slice(3, -2).trim(), context) : true;

/** Asserts a report step is telemetry only: bounded, never fails the run, right before `before`. */
export const describeReportStep = (
  steps: YamlStep[],
  name: string,
  event: string,
  before: string
): void => {
  const names = steps.map((step) => step.name);

  it(`${name} reports ${event}`, () => {
    expect([stepNamed(steps, name).type, stepNamed(steps, name).with?.event]).toEqual([
      REPORT_STEP_TYPE,
      event,
    ]);
  });

  // The step gives up after 20s on its own, so a YAML timeout would only repeat that bound.
  it(`${name} continues on failure, with no timeout of its own`, () => {
    const step = stepNamed(steps, name);

    expect({ continue: step['on-failure']?.continue, timeout: step.timeout }).toEqual({
      continue: true,
      timeout: undefined,
    });
  });

  it(`${name} runs right before ${before}`, () => {
    expect(names.indexOf(before) - names.indexOf(name)).toBe(1);
  });
};

/** Any valid values will do: where a Worker reports does not depend on them. */
const WORKER_TEMPLATE_VALUES: Partial<ManagedWorkflowTemplateValuesById> = {
  [ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID]: {
    autonomyLevel: 'manual',
    extras: {
      autoCloseConfidenceScoreMinThreshold: 0.85,
      budgetPerHour: 1300,
      lookbackHours: 24,
      minSeverity: 'low',
      excludeBuildingBlocks: false,
      excludedRuleTags: [],
    },
    scheduleInterval: '15m',
    settingsVersion: 1,
  },
  [ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID]: {
    autonomyLevel: 'manual',
    scheduleInterval: '24h',
    settingsVersion: 1,
  },
  [ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID]: {
    autonomyLevel: 'manual',
    settingsVersion: 1,
  },
  [ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID]: {
    autonomyLevel: 'manual',
    scheduleInterval: '4h',
    settingsVersion: 1,
  },
  [ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID]: {
    autonomyLevel: 'manual',
    extras: { analysisWindowDays: 7, fpCountThreshold: 10, fpRateThresholdPct: 50 },
    scheduleInterval: '2h',
    settingsVersion: 1,
  },
  [ALERTZERO_WORKER_DETECTION_RULE_COVERAGE_WORKFLOW_ID]: {
    autonomyLevel: 'manual',
    extras: { lookbackDays: 14, maxGapsPerRun: 5 },
    scheduleInterval: '1h',
    settingsVersion: 1,
  },
};

const renderYaml = (definition: ManagedWorkflowDefinition): string => {
  if (typeof definition.yaml === 'string') {
    return definition.yaml;
  }
  const values = (WORKER_TEMPLATE_VALUES as Record<string, unknown>)[definition.id];
  if (!values || !definition.yamlTemplate) {
    throw new Error(`No template values for ${definition.id}; add them to WORKER_TEMPLATE_VALUES`);
  }
  return definition.yamlTemplate(values as never);
};

/** The top-level steps of a definition, rendering a `yamlTemplate` with representative values. */
export const stepsOf = (definition: ManagedWorkflowDefinition): YamlStep[] =>
  topLevelSteps(renderYaml(definition));

/**
 * The step lists nested directly in `step`, as the engine nests them. `YamlStep` is a loose view
 * of shipped YAML, so it is handed to the engine's walker as the engine's step type.
 */
const nestedStepLists = (step: YamlStep): YamlStep[][] =>
  getNestedStepGroups(step as WorkflowStep).map(({ steps }) => steps as YamlStep[]);

/** Every list of sibling steps, at any depth: the top level and every list nested in a step. */
const stepLists = (steps: YamlStep[]): YamlStep[][] => [
  steps,
  ...steps.flatMap((step) => nestedStepLists(step).flatMap(stepLists)),
];

/** Every step at any depth. */
export const allSteps = (steps: YamlStep[]): YamlStep[] => stepLists(steps).flat();

/**
 * How a step closes an Investigation: an `ai.conversation.metadata.patch`, whose output lists the
 * fields it changed, or a `kibana.request` to the Agentic Investigations status route, whose
 * output does not.
 */
export type CloseKind = 'patch' | 'status_route';

const STATUS_ROUTE_PATH = /\/internal\/investigations\/investigations\/(.+)\/status$/;

const closeKindOf = (step: YamlStep): CloseKind | undefined => {
  if (
    step.type === 'ai.conversation.metadata.patch' &&
    (step.with?.updates as Record<string, unknown> | undefined)?.status === 'closed'
  ) {
    return 'patch';
  }
  const path = step.with?.path;
  return step.type === 'kibana.request' &&
    step.with?.method === 'PUT' &&
    typeof path === 'string' &&
    STATUS_ROUTE_PATH.test(path) &&
    (step.with?.body as Record<string, unknown> | undefined)?.status === 'closed'
    ? 'status_route'
    : undefined;
};

/** The Investigation a close writes to, as the template the step renders it from. */
export const closedInvestigationId = (step: YamlStep): unknown =>
  closeKindOf(step) === 'status_route'
    ? String(step.with?.path).match(STATUS_ROUTE_PATH)?.[1]
    : step.with?.conversation_id;

const isCloseReport = (step: YamlStep | undefined): boolean =>
  step?.type === REPORT_STEP_TYPE && step.with?.event === CLOSE_EVENT;

/** One step that closes an Investigation, with the steps right before and after it in its list. */
export interface CloseInList {
  close: YamlStep;
  kind: CloseKind;
  next: YamlStep | undefined;
  previous: YamlStep | undefined;
}

/** Each step that closes an Investigation, with its neighbors in the same list. */
export const closesWithNextStep = (steps: YamlStep[]): CloseInList[] =>
  stepLists(steps).flatMap((list) =>
    list.flatMap((step, index) => {
      const kind = closeKindOf(step);
      return kind ? [{ close: step, kind, next: list[index + 1], previous: list[index - 1] }] : [];
    })
  );

/** Whether `step` reads the status of the Investigation `close` writes to. */
const isStatusReadFor = (step: YamlStep | undefined, close: YamlStep): boolean =>
  step?.type === 'ai.conversation.metadata.read' &&
  step.with?.conversation_id === closedInvestigationId(close);

/**
 * The status-route closes not directly preceded by a read of their Investigation's status. The
 * route returns no changed fields, so only that read tells the report whether the close changed
 * anything.
 */
export const findUnreadStatusRouteCloses = (steps: YamlStep[]): YamlStep[] =>
  closesWithNextStep(steps)
    .filter(
      ({ close, kind, previous }) => kind === 'status_route' && !isStatusReadFor(previous, close)
    )
    .map(({ close }) => close);

/** The closes that are not directly followed by a close report. */
export const findUnreportedCloses = (steps: YamlStep[]): YamlStep[] =>
  closesWithNextStep(steps)
    .filter(({ next }) => !isCloseReport(next))
    .map(({ close }) => close);

/** Whether any step, at any depth, is a report step. */
export const hasReportStep = (steps: YamlStep[]): boolean =>
  allSteps(steps).some(({ type }) => type === REPORT_STEP_TYPE);

export const getAlertZeroDefinitions = (): ManagedWorkflowDefinition[] =>
  getManagedWorkflowDefinitions().filter(
    ({ pluginId }) => pluginId === ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID
  );

/** One Worker close and the report that must follow it. */
export interface ExpectedCloseReport {
  /** The reason the report sends: the one the close writes, `other` when it writes none. */
  closeReason: string;
  closeStep: string;
  definition: ManagedWorkflowDefinition;
  reportStep: string;
}

export const closeLabel = ({
  closeStep,
  definition,
}: Pick<ExpectedCloseReport, 'closeStep' | 'definition'>): string =>
  `${definition.id}: ${closeStep}`;

/**
 * Asserts `closeReports` lists every close in a Worker's `definitions`, and that each close is
 * directly followed by its report, which never fails the run, reports the mapped reason, and runs
 * only when the close changed `status`: a patch close by its changed fields, a status-route close
 * by the status read right before it.
 */
export const describeCloseReports = ({
  closeReports,
  definitions,
}: {
  closeReports: readonly ExpectedCloseReport[];
  definitions: readonly ManagedWorkflowDefinition[];
}): void => {
  it('lists every close in the Worker workflows', () => {
    const found = definitions.flatMap((definition) =>
      closesWithNextStep(stepsOf(definition)).map(({ close }) =>
        closeLabel({ closeStep: close.name, definition })
      )
    );

    expect(found.sort()).toEqual(closeReports.map(closeLabel).sort());
  });

  describe.each(closeReports)(
    '$definition.id $reportStep',
    ({ closeReason, closeStep, definition, reportStep }) => {
      const found = closesWithNextStep(stepsOf(definition)).find(
        ({ close }) => close.name === closeStep
      );
      const report = found?.next;

      it('directly follows its close', () => {
        expect(report?.name).toBe(reportStep);
      });

      it('never fails the run', () => {
        expect({
          continue: report?.['on-failure']?.continue,
          timeout: report?.timeout,
        }).toEqual({ continue: true, timeout: undefined });
      });

      it('reports the closed Investigation with the mapped reason', () => {
        expect(report?.with).toEqual({
          close_reason: closeReason,
          event: CLOSE_EVENT,
          investigation_id: found ? closedInvestigationId(found.close) : undefined,
        });
      });

      it('reports the reason the close writes, or `other` when it writes none', () => {
        const written = (found?.close.with?.updates as Record<string, unknown> | undefined)
          ?.close_reason;
        const isReadBack = closeReason.includes(`steps.${closeStep}.output.metadata.close_reason`);

        expect(isReadBack || closeReason === (written ?? 'other')).toBe(true);
      });

      // Satisfies every extra condition a report shares with its close.
      const gates = {
        record_decision: { output: { declined: true } },
        record_proposal_action_decision: { output: { approved: true, dismissed: true } },
      };

      if (found?.kind === 'status_route') {
        describeStatusRouteCloseReport({ found, gates, report });
        return;
      }

      const closeOutput = (changedFields: string[]) => ({
        changed_fields: changedFields,
        metadata: { close_reason: 'resolved', status: 'closed' },
      });

      it.each([
        ['the close changed status', { output: closeOutput(['status', 'close_reason']) }, true],
        ['the Investigation was already closed', { output: closeOutput([]) }, false],
        ['the close only changed another field', { output: closeOutput(['summary']) }, false],
        ['the close failed', { error: { message: 'boom' } }, false],
      ])('runs only when %s', (_label, closeResult, expected) => {
        expect(evalGuard(report, { steps: { ...gates, [closeStep]: closeResult } }) === true).toBe(
          expected
        );
      });

      it('does not run when the close was skipped', () => {
        expect(evalGuard(report, { steps: gates }) === true).toBe(false);
      });
    }
  );
};

/**
 * The status route returns the new status, not what changed, so the report relies on the status
 * read right before the close: it runs only when that read found the Investigation `open` and the
 * close then succeeded.
 */
const describeStatusRouteCloseReport = ({
  found: { close, previous: read },
  gates,
  report,
}: {
  found: CloseInList;
  gates: Record<string, unknown>;
  report: YamlStep | undefined;
}): void => {
  it('reads the status of its Investigation right before the close', () => {
    expect(isStatusReadFor(read, close)).toBe(true);
  });

  it('reads only when it closes, and never fails the run on the read', () => {
    expect({ continue: read?.['on-failure']?.continue, if: read?.if }).toEqual({
      continue: true,
      if: close.if,
    });
  });

  const readName = read?.name ?? 'missing_status_read';
  const closed = { output: { status: 'closed' } };

  it.each([
    ['the close changed an open Investigation', { metadata: { status: 'open' } }, closed, true],
    ['the Investigation was already closed', { metadata: { status: 'closed' } }, closed, false],
    ['the status read failed', undefined, closed, false],
    ['the close failed', { metadata: { status: 'open' } }, { error: { message: 'boom' } }, false],
    ['the close was skipped', undefined, undefined, false],
  ])('runs only when %s', (_label, readOutput, closeResult, expected) => {
    expect(
      evalGuard(report, {
        steps: {
          ...gates,
          ...(readOutput ? { [readName]: { output: readOutput } } : {}),
          ...(closeResult ? { [close.name]: closeResult } : {}),
        },
      }) === true
    ).toBe(expected);
  });
};
