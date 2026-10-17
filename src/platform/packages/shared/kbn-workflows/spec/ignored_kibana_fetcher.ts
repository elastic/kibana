/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from './schema';
import { visitNestedSteps } from '../definition/definition_utils';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isKibanaWorkflowStepType = (stepType: string): boolean =>
  stepType.startsWith('kibana.');

export const stepHasIgnoredKibanaFetcher = (step: { type?: string; with?: unknown }): boolean => {
  if (
    typeof step.type !== 'string' ||
    !isKibanaWorkflowStepType(step.type) ||
    !isRecord(step.with)
  ) {
    return false;
  }
  return (
    Object.prototype.hasOwnProperty.call(step.with, 'fetcher') && step.with.fetcher !== undefined
  );
};

type DiagnosticPath = Array<string | number>;

export interface IgnoredKibanaFetcherOccurrence {
  path: DiagnosticPath;
  stepType: string;
  stepName?: string;
}

/** Core self-client ignores YAML `fetcher` for every `kibana.*` step. */
export const shouldWarnIgnoredKibanaFetcher = (
  stepType: string,
  warnKibanaFetcher: boolean
): boolean => warnKibanaFetcher && isKibanaWorkflowStepType(stepType);

const ON_FAILURE_STEP_KEYS = ['on-failure', 'iteration-on-failure'] as const;

const asStepArray = (value: unknown): WorkflowYaml['steps'] | undefined =>
  Array.isArray(value) ? (value as WorkflowYaml['steps']) : undefined;

const collectIgnoredKibanaFetcherOccurrencesFromSteps = (
  steps: WorkflowYaml['steps'],
  prefix: DiagnosticPath,
  occurrences: IgnoredKibanaFetcherOccurrence[]
): void => {
  steps.forEach((step, index) => {
    const stepPath = [...prefix, index];
    if (stepHasIgnoredKibanaFetcher(step)) {
      occurrences.push({
        path: [...stepPath, 'with', 'fetcher'],
        stepType: step.type,
        stepName: typeof step.name === 'string' ? step.name : undefined,
      });
    }
    collectIgnoredKibanaFetcherOccurrencesFromContainers(
      step as Record<string, unknown>,
      stepPath,
      occurrences
    );
  });
};

const collectIgnoredKibanaFetcherOccurrencesFromContainers = (
  step: Record<string, unknown>,
  stepPath: DiagnosticPath,
  occurrences: IgnoredKibanaFetcherOccurrence[]
): void => {
  const childSteps = asStepArray(step.steps);
  if (childSteps) {
    collectIgnoredKibanaFetcherOccurrencesFromSteps(
      childSteps,
      [...stepPath, 'steps'],
      occurrences
    );
  }

  const elseSteps = asStepArray(step.else);
  if (elseSteps) {
    collectIgnoredKibanaFetcherOccurrencesFromSteps(elseSteps, [...stepPath, 'else'], occurrences);
  }

  const defaultSteps = asStepArray(step.default);
  if (defaultSteps) {
    collectIgnoredKibanaFetcherOccurrencesFromSteps(
      defaultSteps,
      [...stepPath, 'default'],
      occurrences
    );
  }

  if (Array.isArray(step.cases)) {
    step.cases.forEach((switchCase, caseIndex) => {
      const caseSteps = isRecord(switchCase) ? asStepArray(switchCase.steps) : undefined;
      if (caseSteps) {
        collectIgnoredKibanaFetcherOccurrencesFromSteps(
          caseSteps,
          [...stepPath, 'cases', caseIndex, 'steps'],
          occurrences
        );
      }
    });
  }

  if (Array.isArray(step.branches)) {
    step.branches.forEach((branch, branchIndex) => {
      const branchSteps = isRecord(branch) ? asStepArray(branch.steps) : undefined;
      if (branchSteps) {
        collectIgnoredKibanaFetcherOccurrencesFromSteps(
          branchSteps,
          [...stepPath, 'branches', branchIndex, 'steps'],
          occurrences
        );
      }
    });
  }

  for (const key of ON_FAILURE_STEP_KEYS) {
    const container = step[key];
    const fallbackSteps = isRecord(container) ? asStepArray(container.fallback) : undefined;
    if (fallbackSteps) {
      collectIgnoredKibanaFetcherOccurrencesFromSteps(
        fallbackSteps,
        [...stepPath, key, 'fallback'],
        occurrences
      );
    }
  }
};

/** Structural `WorkflowDiagnostic.path` values plus step type for ignored kibana `with.fetcher` settings. */
export const collectIgnoredKibanaFetcherOccurrences = (
  steps: WorkflowYaml['steps'] | undefined
): IgnoredKibanaFetcherOccurrence[] => {
  if (!steps) {
    return [];
  }
  const occurrences: IgnoredKibanaFetcherOccurrence[] = [];
  collectIgnoredKibanaFetcherOccurrencesFromSteps(steps, ['steps'], occurrences);
  return occurrences;
};

/** Structural `WorkflowDiagnostic.path` values for ignored kibana `with.fetcher` settings. */
export const collectIgnoredKibanaFetcherPaths = (
  steps: WorkflowYaml['steps'] | undefined
): DiagnosticPath[] => collectIgnoredKibanaFetcherOccurrences(steps).map(({ path }) => path);

/** Step names whose YAML still sets `with.fetcher` on a kibana.* step. */
export const collectIgnoredKibanaFetcherStepNames = (
  steps: WorkflowYaml['steps'] | undefined
): string[] => {
  if (!steps) {
    return [];
  }
  const names: string[] = [];
  visitNestedSteps(steps, ({ step, name }) => {
    if (stepHasIgnoredKibanaFetcher(step)) {
      names.push(name);
    }
  });
  return names;
};
