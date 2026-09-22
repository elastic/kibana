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

const ON_FAILURE_STEP_KEYS = ['on-failure', 'iteration-on-failure'] as const;

const asStepArray = (value: unknown): WorkflowYaml['steps'] | undefined =>
  Array.isArray(value) ? (value as WorkflowYaml['steps']) : undefined;

const collectIgnoredKibanaFetcherPathsFromSteps = (
  steps: WorkflowYaml['steps'],
  prefix: DiagnosticPath,
  paths: DiagnosticPath[]
): void => {
  steps.forEach((step, index) => {
    const stepPath = [...prefix, index];
    if (stepHasIgnoredKibanaFetcher(step)) {
      paths.push([...stepPath, 'with', 'fetcher']);
    }
    collectIgnoredKibanaFetcherPathsFromContainers(
      step as Record<string, unknown>,
      stepPath,
      paths
    );
  });
};

const collectIgnoredKibanaFetcherPathsFromContainers = (
  step: Record<string, unknown>,
  stepPath: DiagnosticPath,
  paths: DiagnosticPath[]
): void => {
  const childSteps = asStepArray(step.steps);
  if (childSteps) {
    collectIgnoredKibanaFetcherPathsFromSteps(childSteps, [...stepPath, 'steps'], paths);
  }

  const elseSteps = asStepArray(step.else);
  if (elseSteps) {
    collectIgnoredKibanaFetcherPathsFromSteps(elseSteps, [...stepPath, 'else'], paths);
  }

  const defaultSteps = asStepArray(step.default);
  if (defaultSteps) {
    collectIgnoredKibanaFetcherPathsFromSteps(defaultSteps, [...stepPath, 'default'], paths);
  }

  if (Array.isArray(step.cases)) {
    step.cases.forEach((switchCase, caseIndex) => {
      const caseSteps = isRecord(switchCase) ? asStepArray(switchCase.steps) : undefined;
      if (caseSteps) {
        collectIgnoredKibanaFetcherPathsFromSteps(
          caseSteps,
          [...stepPath, 'cases', caseIndex, 'steps'],
          paths
        );
      }
    });
  }

  if (Array.isArray(step.branches)) {
    step.branches.forEach((branch, branchIndex) => {
      const branchSteps = isRecord(branch) ? asStepArray(branch.steps) : undefined;
      if (branchSteps) {
        collectIgnoredKibanaFetcherPathsFromSteps(
          branchSteps,
          [...stepPath, 'branches', branchIndex, 'steps'],
          paths
        );
      }
    });
  }

  for (const key of ON_FAILURE_STEP_KEYS) {
    const container = step[key];
    const fallbackSteps = isRecord(container) ? asStepArray(container.fallback) : undefined;
    if (fallbackSteps) {
      collectIgnoredKibanaFetcherPathsFromSteps(
        fallbackSteps,
        [...stepPath, key, 'fallback'],
        paths
      );
    }
  }
};

/** Structural `WorkflowDiagnostic.path` values for ignored kibana `with.fetcher` settings. */
export const collectIgnoredKibanaFetcherPaths = (
  steps: WorkflowYaml['steps'] | undefined
): DiagnosticPath[] => {
  if (!steps) {
    return [];
  }
  const paths: DiagnosticPath[] = [];
  collectIgnoredKibanaFetcherPathsFromSteps(steps, ['steps'], paths);
  return paths;
};

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
