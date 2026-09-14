/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParallelStep, Step, SwitchStep, WorkflowYaml } from '@kbn/workflows';
import {
  ExecutionStatus,
  isForeachStep,
  isIfStep,
  isParallelStep,
  isSwitchStep,
  isWhileStep,
} from '@kbn/workflows';
import type { StepExecutionTreeItem } from '../ui/build_step_executions_tree';

const isPseudoTreeStep = (item: StepExecutionTreeItem): boolean =>
  item.stepType === '__overview' ||
  item.stepType === '__trigger' ||
  item.stepType === '__inputs' ||
  Boolean(item.isTriggerPseudoStep);

const isIterationChild = (item: StepExecutionTreeItem): boolean =>
  item.stepType === 'foreach-iteration' || item.stepType === 'while-iteration';

const hasRetryAttemptChildren = (item: StepExecutionTreeItem): boolean =>
  item.children.some((child) => child.isRetryAttempt);

const ghostDefinitionStep = (step: Step, index: number): StepExecutionTreeItem => ({
  stepId: step.name,
  stepType: step.type,
  executionIndex: index,
  stepExecutionId: null,
  status: ExecutionStatus.SKIPPED,
  children: [],
});

const resolveSwitchCaseBody = (
  child: StepExecutionTreeItem,
  definitionStep: SwitchStep
): Step[] | undefined => {
  if (child.stepType === 'enter-default-branch' || child.stepId === 'default') {
    return definitionStep.default;
  }

  const matchFromPrefix = child.stepId.startsWith('case_')
    ? child.stepId.slice('case_'.length)
    : child.stepId;
  const found = definitionStep.cases.find(
    (switchCase) => String(switchCase.match) === matchFromPrefix
  );
  return found?.steps;
};

const resolveParallelBranchBody = (
  child: StepExecutionTreeItem,
  definitionStep: ParallelStep
): Step[] | undefined => {
  if (definitionStep.steps?.length) {
    return definitionStep.steps;
  }

  const branches = definitionStep.branches;
  if (!branches?.length) {
    return undefined;
  }

  const index = Number(child.stepId);
  if (Number.isInteger(index) && index >= 0 && branches[index]) {
    return branches[index].steps;
  }

  const named = branches.find(
    (branch) => branch.name === child.stepId || branch.name === child.displayLabel
  );
  return named?.steps;
};

/**
 * Reorders tree rows to match the definition and inserts ghosted "Not run" leaves
 * for definition steps with no execution record.
 */
const alignStepsToDefinition = (
  children: StepExecutionTreeItem[],
  definitionSteps: Step[] | undefined
): StepExecutionTreeItem[] => {
  if (!definitionSteps?.length) {
    return children;
  }

  const executedByStepId = new Map<string, StepExecutionTreeItem>();
  for (const item of children) {
    executedByStepId.set(item.stepId, item);
  }

  const aligned = definitionSteps.map((step, index) => {
    const existing = executedByStepId.get(step.name);
    if (existing) {
      executedByStepId.delete(step.name);
      return alignNodeToDefinition(existing, step);
    }
    return ghostDefinitionStep(step, index);
  });

  return [...aligned, ...executedByStepId.values()];
};

const alignNodeToDefinition = (
  node: StepExecutionTreeItem,
  definitionStep: Step
): StepExecutionTreeItem => {
  if (hasRetryAttemptChildren(node)) {
    return node;
  }

  if (isForeachStep(definitionStep) || isWhileStep(definitionStep)) {
    return {
      ...node,
      children: node.children.map((child) =>
        isIterationChild(child)
          ? { ...child, children: alignStepsToDefinition(child.children, definitionStep.steps) }
          : child
      ),
    };
  }

  if (isIfStep(definitionStep)) {
    return {
      ...node,
      children: node.children.map((child) => {
        if (child.stepType !== 'if-branch') {
          return child;
        }
        const body = child.stepId === 'false' ? definitionStep.else : definitionStep.steps;
        return { ...child, children: alignStepsToDefinition(child.children, body) };
      }),
    };
  }

  if (isSwitchStep(definitionStep)) {
    return {
      ...node,
      children: node.children.map((child) => {
        if (child.stepType !== 'enter-case-branch' && child.stepType !== 'enter-default-branch') {
          return child;
        }
        return {
          ...child,
          children: alignStepsToDefinition(
            child.children,
            resolveSwitchCaseBody(child, definitionStep)
          ),
        };
      }),
    };
  }

  if (isParallelStep(definitionStep)) {
    return {
      ...node,
      children: node.children.map((child) => {
        if (child.stepType !== 'parallel-branch') {
          return child;
        }
        return {
          ...child,
          children: alignStepsToDefinition(
            child.children,
            resolveParallelBranchBody(child, definitionStep)
          ),
        };
      }),
    };
  }

  return node;
};

/**
 * Reorders top-level tree rows to match the workflow definition and inserts
 * ghosted "Not run" leaves for definition steps with no execution record.
 *
 * Recurses into executed foreach/if/while/switch/parallel bodies so nested
 * steps follow YAML order. Unexecuted control-flow steps stay leaves — no
 * fabricated children. Retry-attempt children are left unchanged.
 */
export const mergeDefinitionStepsIntoTree = (
  tree: StepExecutionTreeItem[],
  definition: WorkflowYaml | null | undefined
): StepExecutionTreeItem[] => {
  if (!definition?.steps?.length) {
    return tree;
  }

  const pseudoSteps = tree.filter(isPseudoTreeStep);
  const executedByStepId = new Map<string, StepExecutionTreeItem>();
  for (const item of tree) {
    if (!isPseudoTreeStep(item)) {
      executedByStepId.set(item.stepId, item);
    }
  }

  const aligned: StepExecutionTreeItem[] = definition.steps.map((step, index) => {
    const existing = executedByStepId.get(step.name);
    if (existing) {
      executedByStepId.delete(step.name);
      return alignNodeToDefinition(existing, step);
    }
    return ghostDefinitionStep(step, index);
  });

  // Preserve any executed top-level nodes not present in the definition (defensive).
  const leftovers = [...executedByStepId.values()];
  return [...pseudoSteps, ...aligned, ...leftovers];
};
