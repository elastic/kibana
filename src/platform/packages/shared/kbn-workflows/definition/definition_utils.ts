/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Step, WorkflowYaml } from '../spec/schema';
import {
  isForeachStep,
  isIfStep,
  isMergeStep,
  isParallelStep,
  isSwitchStep,
  isWhileStep,
} from '../types/utils';

/**
 * IMPORTANT: This file is used to collect all steps from a workflow definition.
 * This implementation is replicated in `elastic/workflows/build-catalog.mjs`, and must be kept in sync.
 * Any changes to this file must be reflected in the `build-catalog.mjs` file on the `elastic/workflows` repository.
 */
const ON_FAILURE_STEP_KEYS = ['on-failure', 'iteration-on-failure'] as const;

export type WorkflowStep = WorkflowYaml['steps'][number];

const isStepArray = (value: unknown): value is WorkflowYaml['steps'] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'object' && entry !== null);

export interface NestedStepGroup {
  readonly pathSuffix: string;
  readonly steps: WorkflowYaml['steps'];
}

interface NestedStepHandler {
  collect: (step: WorkflowStep) => ReadonlyArray<NestedStepGroup>;
  strip: (stripped: Record<string, unknown>, step: WorkflowStep) => void;
}

const pushStepGroup = (groups: NestedStepGroup[], pathSuffix: string, steps: unknown): void => {
  if (isStepArray(steps)) {
    groups.push({ pathSuffix, steps });
  }
};

const deleteNestedStepKey = (
  stripped: Record<string, unknown>,
  key: string,
  steps: unknown
): void => {
  if (isStepArray(steps)) {
    delete stripped[key];
  }
};

const stripObjectArraySteps = <T extends Record<string, unknown>>(
  items: T[]
): Array<Omit<T, 'steps'>> => items.map(({ steps: _steps, ...rest }) => rest as Omit<T, 'steps'>);

const nestedStepHandlers: ReadonlyArray<NestedStepHandler> = [
  {
    collect: (step) => {
      const groups: NestedStepGroup[] = [];

      if (isForeachStep(step) || isWhileStep(step) || isMergeStep(step)) {
        pushStepGroup(groups, '', step.steps);
      }

      return groups;
    },
    strip: (stripped, step) => {
      if (isForeachStep(step) || isWhileStep(step) || isMergeStep(step)) {
        deleteNestedStepKey(stripped, 'steps', step.steps);
      }
    },
  },
  {
    collect: (step) => {
      const groups: NestedStepGroup[] = [];

      if (isIfStep(step)) {
        pushStepGroup(groups, '', step.steps);
        pushStepGroup(groups, '.else', step.else);
      }

      return groups;
    },
    strip: (stripped, step) => {
      if (isIfStep(step)) {
        deleteNestedStepKey(stripped, 'steps', step.steps);
        deleteNestedStepKey(stripped, 'else', step.else);
      }
    },
  },
  {
    collect: (step) => {
      const groups: NestedStepGroup[] = [];

      if (isSwitchStep(step)) {
        step.cases.forEach((switchCase, caseIndex) => {
          pushStepGroup(groups, `.case[${caseIndex}]`, switchCase.steps);
        });
        pushStepGroup(groups, '.default', step.default);
      }

      return groups;
    },
    strip: (stripped, step) => {
      if (isSwitchStep(step)) {
        deleteNestedStepKey(stripped, 'default', step.default);
        if (Array.isArray(step.cases)) {
          stripped.cases = stripObjectArraySteps(step.cases as Array<Record<string, unknown>>);
        }
      }
    },
  },
  {
    collect: (step) => {
      const groups: NestedStepGroup[] = [];

      if (isParallelStep(step)) {
        // Dynamic fan-out exposes a single shared body (`steps` paired with
        // `foreach`); static branches expose one body per named branch
        // (`branches[].steps`). Collect whichever mode this parallel step uses.
        // Gate the dynamic body on `foreach` so a stray top-level `steps` on a
        // static step (schema-invalid, but be defensive) isn't double-collected.
        if (step.foreach !== undefined && Array.isArray(step.steps)) {
          pushStepGroup(groups, '', step.steps);
        }
        if (Array.isArray(step.branches)) {
          step.branches.forEach((branch, branchIndex) => {
            pushStepGroup(groups, `.branch[${branchIndex}]`, branch.steps);
          });
        }
      }

      return groups;
    },
    strip: (stripped, step) => {
      if (isParallelStep(step)) {
        if (Array.isArray(step.steps)) {
          deleteNestedStepKey(stripped, 'steps', step.steps);
        }
        if (Array.isArray(step.branches)) {
          stripped.branches = stripObjectArraySteps(
            step.branches as Array<Record<string, unknown>>
          );
        }
      }
    },
  },
  {
    collect: (step) => {
      const groups: NestedStepGroup[] = [];
      const stepRecord = step as Record<string, unknown>;

      for (const key of ON_FAILURE_STEP_KEYS) {
        const container = stepRecord[key];
        if (container && typeof container === 'object' && 'fallback' in container) {
          const { fallback } = container as { fallback?: unknown };
          pushStepGroup(groups, `.${key}.fallback`, fallback);
        }
      }

      return groups;
    },
    strip: (stripped) => {
      for (const key of ON_FAILURE_STEP_KEYS) {
        const container = stripped[key];
        if (container && typeof container === 'object' && 'fallback' in container) {
          const { fallback: _fallback, ...rest } = container as { fallback?: unknown };
          stripped[key] = rest;
        }
      }
    },
  },
];

const collectNestedStepGroups = (step: WorkflowStep): ReadonlyArray<NestedStepGroup> =>
  nestedStepHandlers.flatMap((handler) => handler.collect(step));

const stripNestedStepContent = (stripped: Record<string, unknown>, step: WorkflowStep): void => {
  for (const handler of nestedStepHandlers) {
    handler.strip(stripped, step);
  }
};

/** Returns nested step arrays and their path suffixes relative to the parent step path. */
export const getNestedStepGroups = (step: WorkflowStep): ReadonlyArray<NestedStepGroup> =>
  collectNestedStepGroups(step);

export interface VisitNestedStepEntry<TStep extends WorkflowStep = WorkflowStep> {
  readonly step: TStep;
  readonly path: string;
  readonly name: string;
}

export interface VisitNestedStepsOptions {
  readonly parentPath?: string;
  readonly requireValidName?: boolean;
}

const isValidStepName = (name: unknown): name is string =>
  typeof name === 'string' && name.trim().length > 0;

const countSiblingStepNames = (steps: ReadonlyArray<WorkflowStep>): Map<string, number> => {
  const nameCounts = new Map<string, number>();

  for (const step of steps) {
    if (isValidStepName(step.name)) {
      nameCounts.set(step.name, (nameCounts.get(step.name) ?? 0) + 1);
    }
  }

  return nameCounts;
};

const visitNestedStepsImpl = (
  steps: ReadonlyArray<WorkflowStep>,
  visitor: (entry: VisitNestedStepEntry) => void,
  options: VisitNestedStepsOptions = {}
): void => {
  const { parentPath = '', requireValidName = false } = options;
  const siblingNameCounts = countSiblingStepNames(steps);

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const shouldVisitStep = !requireValidName || isValidStepName(step.name);

    if (shouldVisitStep) {
      const hasDuplicateSiblingName = (siblingNameCounts.get(step.name) ?? 0) > 1;
      const pathSegment = hasDuplicateSiblingName ? `${step.name}[${index}]` : step.name;
      const path = parentPath ? `${parentPath}.${pathSegment}` : pathSegment;

      visitor({ step, path, name: step.name });

      for (const { pathSuffix, steps: childSteps } of collectNestedStepGroups(step)) {
        const childParentPath = pathSuffix ? `${path}${pathSuffix}` : path;
        visitNestedStepsImpl(childSteps, visitor, {
          ...options,
          parentPath: childParentPath,
        });
      }
    }
  }
};

/** Depth-first walk of all named steps, including nested container subtrees. */
export const visitNestedSteps = <TStep extends WorkflowStep>(
  steps: ReadonlyArray<TStep>,
  visitor: (entry: VisitNestedStepEntry<TStep>) => void,
  options: VisitNestedStepsOptions = {}
): void => {
  visitNestedStepsImpl(
    steps,
    (entry) => {
      visitor({ step: entry.step as unknown as TStep, path: entry.path, name: entry.name });
    },
    options
  );
};

/** Strip nested step trees so container entries compare only their own config fields. */
export const stripNestedStepContentForComparison = <TStep extends WorkflowStep>(
  step: TStep
): TStep => {
  const stripped = { ...step } as Record<string, unknown>;
  stripNestedStepContent(stripped, step);
  return stripped as TStep;
};

export const collectAllSteps = (steps: WorkflowYaml['steps']): Step[] => {
  const result: Step[] = [];
  for (const step of steps) {
    result.push(step);
    for (const { steps: childSteps } of collectNestedStepGroups(step)) {
      result.push(...collectAllSteps(childSteps));
    }
  }
  return result;
};

export function getStepByNameFromNestedSteps(
  steps: WorkflowYaml['steps'],
  stepName: string
): Step | null {
  for (const step of steps) {
    if (step.name === stepName) {
      return step;
    }
    for (const { steps: childSteps } of collectNestedStepGroups(step)) {
      const result = getStepByNameFromNestedSteps(childSteps, stepName);
      if (result) {
        return result;
      }
    }
  }
  return null;
}
