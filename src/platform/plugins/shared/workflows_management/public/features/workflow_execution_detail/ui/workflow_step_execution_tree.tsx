/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiEmptyPromptProps, UseEuiTheme } from '@elastic/eui';
import { EuiEmptyPrompt, EuiIcon, EuiLoadingSpinner, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';

import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import {
  ExecutionStatus,
  isDangerousStatus,
  isFailedBeforeSteps,
  isInProgressStatus,
  isTerminalStatus,
} from '@kbn/workflows';
import type { StepExecutionTreeItem } from './build_step_executions_tree';
import { buildStepExecutionsTree, injectChildWorkflowSteps } from './build_step_executions_tree';
import { IterationGapRow } from './iteration_gap_row';
import { RetryWaitAnnotation } from './retry_wait_annotation';
import {
  getTreeIndentGuideOffset,
  type StatusPlacement,
  StepExecutionTreeRow,
  type StepExecutionTreeRowProps,
  TREE_INDENT_GUIDE_STANDOFF_PX,
  TREE_INDENT_GUIDE_WIDTH_PX,
  TREE_ROW_GAP_SIZE,
  TREE_ROW_PADDING_X_SIZE,
} from './step_execution_tree_row';
import {
  buildOverviewStepExecutionFromContext,
  buildTriggerStepExecutionFromContext,
} from './workflow_pseudo_step_context';
import { buildDiagnosisContextPackage } from '../lib/build_diagnosis_context_package';
import { buildIterationVirtualId } from '../lib/build_iteration_pseudo_step';
import type { ErrorPanelDiagnoseState } from '../lib/derive_error_panel_diagnose_availability';
import {
  buildIterationStatusOverrides,
  deriveIterationStatus,
} from '../lib/derive_iteration_status';
import { findStepRetryConfig } from '../lib/find_step_retry_delay';
import {
  iterationGapCount,
  iterationGapId,
  type IterationInfo,
  type IterationPinKind,
  planIterationCollapse,
} from '../lib/iteration_pins';
import { mergeDefinitionStepsIntoTree } from '../lib/merge_definition_steps_into_tree';
import { normalizeStepAi, stepAiToTokenUsage } from '../lib/normalize_step_ai';
import { parseWorkflowDurationMs } from '../lib/parse_workflow_duration';
import { rollupTokenUsage, type TokenRollupNode, tokenRollupToUsage } from '../lib/token_rollup';
import { useErrorPanelDiagnoseAvailability } from '../lib/use_error_panel_diagnose_availability';
import type { ChildWorkflowExecutionsMap } from '../model/use_child_workflow_executions';

const COLLAPSED_BY_DEFAULT_STEP_TYPES = [
  'foreach-iteration',
  'while-iteration',
  'parallel-branch',
  'enter-case-branch',
  'enter-default-branch',
];

const CONTROL_FLOW_STEP_TYPES = new Set(['foreach', 'while', 'if', 'switch', 'parallel']);

const BRANCH_LABEL_STEP_TYPES = new Set([
  'if-branch',
  'enter-case-branch',
  'enter-default-branch',
  'parallel-branch',
]);

/** Align indent guide under the chevron/icon column center — see getTreeIndentGuideOffset. */
const INDENT_GUIDE_CHILD_GAP_SIZE = TREE_ROW_GAP_SIZE;

export interface OpenTreeNode {
  id: string;
  defaultExpanded: boolean;
  row?: Omit<StepExecutionTreeRowProps, 'statusPlacement'> & {
    /** When set, OpenTreeNodes prefers this toggle over the default tree expand. */
    onToggleExpand?: () => void;
  };
  children: OpenTreeNode[];
  /** When set, OpenTreeNodes renders an IterationGapRow instead of a step row. */
  gap?: {
    from: number;
    to: number;
    count: number;
    isExpanded: boolean;
    executionTimeMs: number | null;
    usage?: StepExecutionTreeRowProps['usage'];
    usageCallCount?: number;
    onToggle: () => void;
  };
  /** Presentational wait between retry attempts — not a row. */
  retryWaitMs?: number;
}

const isIterationStepType = (stepType: string | undefined): boolean =>
  stepType === 'foreach-iteration' || stepType === 'while-iteration';

const formatIterationLabel = (n: number): string =>
  i18n.translate('workflows.WorkflowStepExecutionTree.iterationLabel', {
    defaultMessage: 'Iteration #{n}',
    values: { n },
  });

const formatAttemptLabel = (n: number): string =>
  // Attempts are 1-based (Attempt #1). Iterations stay 0-based deliberately —
  // their numbers mirror foreach.index / YAML expressions; attempts have no such
  // variable and 0-based ordinals are hostile. Do not "unify" the numbering.
  i18n.translate('workflows.WorkflowStepExecutionTree.attemptLabel', {
    defaultMessage: 'Attempt #{n}',
    values: { n },
  });

const computeInterAttemptWaitMs = (
  prev: WorkflowStepExecutionDto | undefined,
  next: WorkflowStepExecutionDto | undefined,
  configuredDelayMs: number | null
): number | null => {
  if (prev?.finishedAt && next?.startedAt) {
    const wait = Date.parse(next.startedAt) - Date.parse(prev.finishedAt);
    if (Number.isFinite(wait) && wait > 0) {
      return wait;
    }
  }
  return configuredDelayMs != null && configuredDelayMs > 0 ? configuredDelayMs : null;
};

const computeRetryWallTimeMs = (
  attempts: StepExecutionTreeItem[],
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>
): number | null => {
  const first = stepExecutionMap.get(attempts[0]?.stepExecutionId ?? '');
  const last = stepExecutionMap.get(attempts[attempts.length - 1]?.stepExecutionId ?? '');
  if (first?.startedAt && last?.finishedAt) {
    const wall = Date.parse(last.finishedAt) - Date.parse(first.startedAt);
    if (Number.isFinite(wall) && wall >= 0) {
      return wall;
    }
  }
  return null;
};

const sumSubtreeExecutionTimeMs = (
  items: StepExecutionTreeItem[],
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>
): number => {
  let total = 0;
  for (const item of items) {
    const exec = stepExecutionMap.get(item.stepExecutionId ?? '');
    if (exec?.executionTimeMs != null && Number.isFinite(exec.executionTimeMs)) {
      total += exec.executionTimeMs;
    }
    total += sumSubtreeExecutionTimeMs(item.children, stepExecutionMap);
  }
  return total;
};

const toRollupNode = (
  item: StepExecutionTreeItem,
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>
): TokenRollupNode => {
  const stepExecution = stepExecutionMap.get(item.stepExecutionId ?? '');
  return {
    ai: normalizeStepAi({
      usage: stepExecution?.usage,
      // When includeOutput is true (or a list payload already has output),
      // LangChain tokenUsage is normalized into the same AI metadata shape.
      output: stepExecution?.output,
    }),
    children: item.children.map((child) => toRollupNode(child, stepExecutionMap)),
  };
};

const subtreeHasDangerousStatus = (
  item: StepExecutionTreeItem,
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>
): boolean => {
  for (const child of item.children) {
    const childExec = stepExecutionMap.get(child.stepExecutionId ?? '');
    const childStatus = childExec?.status ?? child.status;
    if (childStatus != null && isDangerousStatus(childStatus)) {
      return true;
    }
    if (subtreeHasDangerousStatus(child, stepExecutionMap)) {
      return true;
    }
  }
  return false;
};

function buildIterationGapNode(
  foreachParentId: string,
  from: number,
  to: number,
  gapChildren: StepExecutionTreeItem[],
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>,
  isExpanded: boolean,
  onToggleGap: (gapId: string) => void
): OpenTreeNode {
  const gapId = iterationGapId(foreachParentId, from, to);
  const rollup = rollupTokenUsage({
    children: gapChildren.map((child) => toRollupNode(child, stepExecutionMap)),
  });
  const durationMs = sumSubtreeExecutionTimeMs(gapChildren, stepExecutionMap);

  return {
    id: gapId,
    defaultExpanded: false,
    children: [],
    row: {
      stepId: '',
      selected: false,
      onSelect: () => {
        onToggleGap(gapId);
      },
    },
    gap: {
      from,
      to,
      count: iterationGapCount(from, to),
      isExpanded,
      executionTimeMs: durationMs > 0 ? durationMs : null,
      usage: tokenRollupToUsage(rollup),
      usageCallCount: rollup.hasTokens && rollup.callCount > 1 ? rollup.callCount : undefined,
      onToggle: () => {
        onToggleGap(gapId);
      },
    },
  };
}

function collectIterationChildren(
  children: StepExecutionTreeItem[],
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>
): {
  byIndex: Map<number, StepExecutionTreeItem>;
  infos: IterationInfo[];
} {
  const byIndex = new Map<number, StepExecutionTreeItem>();
  const infos: IterationInfo[] = [];

  const isInFlightStatus = (s: ExecutionStatus | null | undefined): boolean =>
    s === ExecutionStatus.RUNNING ||
    s === ExecutionStatus.WAITING ||
    s === ExecutionStatus.WAITING_FOR_INPUT ||
    s === ExecutionStatus.WAITING_FOR_CHILD ||
    s === ExecutionStatus.PENDING;

  const subtreeHasInFlight = (item: StepExecutionTreeItem): boolean => {
    for (const child of item.children) {
      const childExec = stepExecutionMap.get(child.stepExecutionId ?? '');
      const childStatus = childExec?.status ?? child.status;
      if (isInFlightStatus(childStatus) || subtreeHasInFlight(child)) {
        return true;
      }
    }
    return false;
  };

  for (const child of children) {
    if (isIterationStepType(child.stepType)) {
      const index = parseInt(child.stepId, 10);
      if (!isNaN(index)) {
        byIndex.set(index, child);
        const childStatus =
          stepExecutionMap.get(child.stepExecutionId ?? '')?.status ?? child.status;
        infos.push({
          index,
          hasFailed:
            (childStatus != null && isDangerousStatus(childStatus)) ||
            subtreeHasDangerousStatus(child, stepExecutionMap),
          isInFlight: isInFlightStatus(childStatus) || subtreeHasInFlight(child),
        });
      }
    }
  }
  return { byIndex, infos };
}

function convertTreeToOpenNodes(
  treeItems: StepExecutionTreeItem[],
  stepExecutionMap: Map<string, WorkflowStepExecutionDto>,
  selectedId: string | null,
  onSelectStepExecution: (stepExecutionId: string) => void,
  expandedGapIds: Set<string>,
  onToggleGap: (gapId: string) => void,
  options?: {
    executionUsage?: WorkflowStepExecutionDto['usage'];
    autoExpandErrorForStepId?: string | null;
    /** One-shot pulse on the error region for this step execution id. */
    errorArrivalPulseStepId?: string | null;
    isExecutionComplete?: boolean;
    /** Pin metadata keyed by iteration index for the current foreach/while parent. */
    iterationPinByIndex?: Map<number, { kinds: IterationPinKind[]; autoExpand: boolean }>;
    /** Parent foreach/while stepId — used for synthetic iteration virtual ids. */
    foreachParentStepId?: string;
    /** Sibling-aware derived statuses (includes trailing not-run constraint). */
    iterationStatusOverrides?: Map<number, ExecutionStatus>;
    definition?: WorkflowYaml | null;
    /**
     * When false, foreach/while iteration children render as a full list
     * (every iteration pinned, no gap rows). Defaults to true (Table tab).
     */
    collapseIterations?: boolean;
    diagnose?: {
      state: ErrorPanelDiagnoseState;
      requiredLicenseTier: string;
      licenseManagementHref: string;
      onOpenLicenseManagement: () => void;
      onDiagnoseStep: (stepExecution: WorkflowStepExecutionDto) => void;
      isDiagnoseHandoffInFlight?: boolean;
    };
  }
): OpenTreeNode[] {
  return treeItems.flatMap((item) => {
    const stepExecution = stepExecutionMap.get(item.stepExecutionId ?? '');
    const stepTypeEarly = stepExecution?.stepType ?? item.stepType ?? '';
    const iterationIndexEarly = isIterationStepType(stepTypeEarly)
      ? parseInt(item.stepId, 10)
      : NaN;

    const status = (() => {
      if (isIterationStepType(stepTypeEarly)) {
        if (
          !Number.isNaN(iterationIndexEarly) &&
          options?.iterationStatusOverrides?.has(iterationIndexEarly)
        ) {
          return options.iterationStatusOverrides.get(iterationIndexEarly);
        }
        return deriveIterationStatus(item, stepExecutionMap);
      }
      return stepExecution?.status ?? item.status ?? undefined;
    })();

    const ifBranchVirtualId =
      item.stepType === 'if-branch' && !stepExecution
        ? `if-branch:${item.stepId}:${item.executionIndex}`
        : null;
    const enterCaseBranchVirtualId =
      item.stepType === 'enter-case-branch' && !stepExecution
        ? `enter-case-branch:${item.stepId}:${item.executionIndex}:${
            item.status ?? ExecutionStatus.COMPLETED
          }`
        : null;
    const iterationVirtualId =
      isIterationStepType(stepTypeEarly) &&
      !stepExecution &&
      options?.foreachParentStepId &&
      !Number.isNaN(iterationIndexEarly)
        ? buildIterationVirtualId(
            stepTypeEarly as 'foreach-iteration' | 'while-iteration',
            options.foreachParentStepId,
            iterationIndexEarly
          )
        : null;
    const selected = ifBranchVirtualId
      ? selectedId === ifBranchVirtualId
      : enterCaseBranchVirtualId
      ? selectedId === enterCaseBranchVirtualId
      : iterationVirtualId
      ? selectedId === iterationVirtualId
      : selectedId === stepExecution?.id;

    const stepId = stepExecution?.stepId ?? item.stepId;
    const stepType = stepExecution?.stepType ?? item.stepType ?? '';
    const isTriggerPseudoStep = stepType.startsWith('trigger_');
    const triggerDisplayLabel = isTriggerPseudoStep
      ? i18n.translate('workflows.WorkflowStepExecutionTree.triggerLabel', {
          defaultMessage: '{type} trigger',
          values: {
            type:
              stepType === 'trigger_manual'
                ? i18n.translate('workflows.WorkflowStepExecutionTree.triggerManual', {
                    defaultMessage: 'Manual',
                  })
                : stepType === 'trigger_alert'
                ? i18n.translate('workflows.WorkflowStepExecutionTree.triggerAlert', {
                    defaultMessage: 'Alert',
                  })
                : stepType === 'trigger_scheduled'
                ? i18n.translate('workflows.WorkflowStepExecutionTree.triggerScheduled', {
                    defaultMessage: 'Scheduled',
                  })
                : stepType.replace(/^trigger_/, ''),
          },
        })
      : undefined;

    const iterationIndex = isIterationStepType(stepType) ? parseInt(item.stepId, 10) : NaN;
    const iterationPin = !isNaN(iterationIndex)
      ? options?.iterationPinByIndex?.get(iterationIndex)
      : undefined;
    const iterationDisplayLabel = !isNaN(iterationIndex)
      ? formatIterationLabel(iterationIndex)
      : undefined;

    const displayLabel =
      triggerDisplayLabel ??
      iterationDisplayLabel ??
      (item.isRetryAttempt && item.attemptNumber != null
        ? formatAttemptLabel(item.attemptNumber)
        : undefined) ??
      item.displayLabel ??
      stepId;

    const isSkeletonStep =
      (stepExecution?.id?.startsWith('skeleton-') ?? false) ||
      stepType === '__loading' ||
      // Definition-merged ghosts: no execution record → Not run, non-interactive.
      (item.stepExecutionId == null &&
        !isIterationStepType(stepType) &&
        !BRANCH_LABEL_STEP_TYPES.has(stepType) &&
        (status === ExecutionStatus.SKIPPED || status === ExecutionStatus.PENDING) &&
        item.children.length === 0);

    const isBranchLabel = BRANCH_LABEL_STEP_TYPES.has(stepType);

    const stepAiMeta = normalizeStepAi({
      usage: stepExecution?.usage,
      output: stepExecution?.output,
    });

    const rolledUsage = (() => {
      if (isTriggerPseudoStep) {
        const triggerUsage = options?.executionUsage;
        return triggerUsage && triggerUsage.totalTokens > 0 ? triggerUsage : undefined;
      }
      if (stepExecution?.usage && stepExecution.usage.totalTokens > 0) {
        return stepExecution.usage;
      }
      const fromOutput = stepAiToTokenUsage(stepAiMeta ?? {});
      if (fromOutput) {
        return fromOutput;
      }
      if (
        (CONTROL_FLOW_STEP_TYPES.has(stepType) ||
          isIterationStepType(stepType) ||
          (item.retryAttemptCount != null && item.retryAttemptCount > 0)) &&
        item.children.length > 0
      ) {
        return tokenRollupToUsage(rollupTokenUsage(toRollupNode(item, stepExecutionMap)));
      }
      return undefined;
    })();
    const rolledCallCount = (() => {
      if (
        (!CONTROL_FLOW_STEP_TYPES.has(stepType) &&
          !isIterationStepType(stepType) &&
          !(item.retryAttemptCount != null && item.retryAttemptCount > 0)) ||
        stepExecution?.usage
      ) {
        return undefined;
      }
      const rollup = rollupTokenUsage(toRollupNode(item, stepExecutionMap));
      return rollup.hasTokens && rollup.callCount > 1 ? rollup.callCount : undefined;
    })();
    const leafUsageModel =
      rolledCallCount == null && item.children.length === 0 ? stepAiMeta?.model : undefined;

    const selectStep = () => {
      if (stepExecution?.id) {
        onSelectStepExecution(stepExecution.id);
      } else if (iterationVirtualId) {
        onSelectStepExecution(iterationVirtualId);
      } else if (ifBranchVirtualId) {
        onSelectStepExecution(ifBranchVirtualId);
      } else if (enterCaseBranchVirtualId) {
        onSelectStepExecution(enterCaseBranchVirtualId);
      } else if (item.children.length > 0) {
        const firstChildId = item.children[0].stepExecutionId;
        if (firstChildId) {
          onSelectStepExecution(firstChildId);
        }
      }
    };

    const buildIterationPlanNodes = (
      foreachParentId: string,
      foreachParentStepId: string,
      children: StepExecutionTreeItem[]
    ): OpenTreeNode[] | null => {
      const { byIndex, infos } = collectIterationChildren(children, stepExecutionMap);
      if (infos.length === 0) return null;

      const plan = planIterationCollapse(infos, {
        isExecutionComplete: options?.isExecutionComplete ?? true,
        threshold: options?.collapseIterations === false ? Number.POSITIVE_INFINITY : undefined,
      });

      const pinByIndex = new Map<number, { kinds: IterationPinKind[]; autoExpand: boolean }>();
      for (const entry of plan) {
        if (entry.type === 'pin') {
          pinByIndex.set(entry.index, { kinds: entry.kinds, autoExpand: entry.autoExpand });
        }
      }

      const statusOverrides = buildIterationStatusOverrides(children, stepExecutionMap);
      const childOptions = {
        ...options,
        foreachParentStepId,
        iterationPinByIndex: pinByIndex,
        iterationStatusOverrides: statusOverrides,
      };
      const nodes: OpenTreeNode[] = [];

      for (const entry of plan) {
        if (entry.type === 'gap') {
          const gapChildren: StepExecutionTreeItem[] = [];
          for (let i = entry.from; i <= entry.to; i++) {
            const iter = byIndex.get(i);
            if (iter) gapChildren.push(iter);
          }
          const gapId = iterationGapId(foreachParentId, entry.from, entry.to);
          const isExpanded = expandedGapIds.has(gapId);
          nodes.push(
            buildIterationGapNode(
              foreachParentId,
              entry.from,
              entry.to,
              gapChildren,
              stepExecutionMap,
              isExpanded,
              onToggleGap
            )
          );
          if (isExpanded) {
            nodes.push(
              ...convertTreeToOpenNodes(
                gapChildren,
                stepExecutionMap,
                selectedId,
                onSelectStepExecution,
                expandedGapIds,
                onToggleGap,
                childOptions
              )
            );
          }
        } else {
          const iter = byIndex.get(entry.index);
          if (iter) {
            nodes.push(
              ...convertTreeToOpenNodes(
                [iter],
                stepExecutionMap,
                selectedId,
                onSelectStepExecution,
                expandedGapIds,
                onToggleGap,
                childOptions
              )
            );
          }
        }
      }

      return nodes;
    };

    const hasNestedIterations = item.children.some((c) => isIterationStepType(c.stepType));
    const isForeachOrWhileParent = stepType === 'foreach' || stepType === 'while';

    const nodeId =
      item.stepExecutionId ??
      iterationVirtualId ??
      ifBranchVirtualId ??
      enterCaseBranchVirtualId ??
      `${item.stepId}-${item.executionIndex}-no-step-execution`;

    const childNodesForParent = (() => {
      if (item.children.length === 0) return [] as OpenTreeNode[];

      if (isForeachOrWhileParent && hasNestedIterations) {
        const foreachParentId = item.stepExecutionId ?? `${item.stepId}-${item.executionIndex}`;
        const planned = buildIterationPlanNodes(foreachParentId, stepId, item.children);
        if (planned) return planned;
      }

      if (hasNestedIterations) {
        const statusOverrides = buildIterationStatusOverrides(item.children, stepExecutionMap);
        return convertTreeToOpenNodes(
          item.children,
          stepExecutionMap,
          selectedId,
          onSelectStepExecution,
          expandedGapIds,
          onToggleGap,
          {
            ...options,
            foreachParentStepId: stepId,
            iterationPinByIndex: undefined,
            iterationStatusOverrides: statusOverrides,
          }
        );
      }

      const isRetryParent =
        item.retryAttemptCount != null &&
        item.retryAttemptCount > 0 &&
        item.children.every((c) => c.isRetryAttempt);

      if (isRetryParent) {
        // Wait annotations between attempts. Attempt lists that exceed the
        // iteration collapse threshold can reuse pin-and-gap unchanged later —
        // do not special-case attempts out of that model.
        const configuredDelayMs = parseWorkflowDurationMs(
          findStepRetryConfig(options?.definition, stepId)?.delay
        );
        const nodes: OpenTreeNode[] = [];
        for (let i = 0; i < item.children.length; i++) {
          if (i > 0) {
            const prevExec = stepExecutionMap.get(item.children[i - 1].stepExecutionId ?? '');
            const nextExec = stepExecutionMap.get(item.children[i].stepExecutionId ?? '');
            const waitMs = computeInterAttemptWaitMs(prevExec, nextExec, configuredDelayMs);
            if (waitMs != null) {
              nodes.push({
                id: `retry-wait:${stepId}:${i}`,
                defaultExpanded: false,
                children: [],
                retryWaitMs: waitMs,
              });
            }
          }
          nodes.push(
            ...convertTreeToOpenNodes(
              [item.children[i]],
              stepExecutionMap,
              selectedId,
              onSelectStepExecution,
              expandedGapIds,
              onToggleGap,
              { ...options, iterationPinByIndex: undefined, iterationStatusOverrides: undefined }
            )
          );
        }
        return nodes;
      }

      return convertTreeToOpenNodes(
        item.children,
        stepExecutionMap,
        selectedId,
        onSelectStepExecution,
        expandedGapIds,
        onToggleGap,
        { ...options, iterationPinByIndex: undefined, iterationStatusOverrides: undefined }
      );
    })();

    const showAggregateDanger =
      !isBranchLabel &&
      !(status != null && isDangerousStatus(status)) &&
      subtreeHasDangerousStatus(item, stepExecutionMap);

    const rolledDuration = (() => {
      if (
        item.retryAttemptCount != null &&
        item.retryAttemptCount > 0 &&
        item.children.length > 0
      ) {
        const wall = computeRetryWallTimeMs(item.children, stepExecutionMap);
        if (wall != null) return wall;
        return sumSubtreeExecutionTimeMs([item], stepExecutionMap);
      }
      if (isIterationStepType(stepType) && item.children.length > 0) {
        return sumSubtreeExecutionTimeMs([item], stepExecutionMap);
      }
      return stepExecution?.executionTimeMs ?? null;
    })();

    const isFailureAttempt =
      item.isRetryAttempt && item.isFinalAttempt && status != null && isDangerousStatus(status);
    const errorMessage = status && isDangerousStatus(status) ? stepExecution?.error ?? null : null;
    const retryLeadIn =
      isFailureAttempt && item.retryAttemptCount != null && errorMessage
        ? i18n.translate('workflows.executionFlyout.failedStep.allAttemptsFailed', {
            defaultMessage: 'All {n} attempts failed. Last error: {message}',
            values: {
              n: item.retryAttemptCount,
              message: typeof errorMessage === 'string' ? errorMessage : errorMessage.message,
            },
          })
        : undefined;

    const isRetryParentRow =
      item.retryAttemptCount != null && item.retryAttemptCount > 0 && !item.isRetryAttempt;
    const carriesErrorRegion =
      Boolean(errorMessage) &&
      status != null &&
      isDangerousStatus(status) &&
      !isRetryParentRow &&
      (!item.isRetryAttempt || Boolean(item.isFinalAttempt));
    const selectedStepExecution = selectedId ? stepExecutionMap.get(selectedId) : undefined;
    // Border follows error ownership: owning step selected (this row or a sibling attempt).
    const showDangerSelectionBorder =
      carriesErrorRegion &&
      stepExecution != null &&
      selectedId != null &&
      (selectedId === stepExecution.id || selectedStepExecution?.stepId === stepExecution.stepId);
    const arrivalPulse =
      carriesErrorRegion &&
      stepExecution != null &&
      options?.errorArrivalPulseStepId != null &&
      options.errorArrivalPulseStepId === stepExecution.id;

    const isInFlightAttempt =
      status === ExecutionStatus.RUNNING ||
      status === ExecutionStatus.WAITING ||
      status === ExecutionStatus.WAITING_FOR_INPUT ||
      status === ExecutionStatus.WAITING_FOR_CHILD ||
      status === ExecutionStatus.PENDING;

    const rowStateTags = (() => {
      if (item.isRetryAttempt && item.isFinalAttempt) {
        return isInFlightAttempt ? (['running'] as const) : (['final'] as const);
      }
      if (item.retryRecovered) {
        return ['recovered'] as const;
      }
      return undefined;
    })();

    const retryMaxAttempts = (() => {
      if (item.isRetryAttempt || item.retryAttemptCount == null) return undefined;
      const configured = findStepRetryConfig(options?.definition, stepId)?.maxAttempts;
      if (configured == null) return undefined;
      // Engine retries while attemptIndex < max-attempts (0-based), so total allowed = max-attempts + 1.
      return configured + 1;
    })();

    const defaultExpanded = (() => {
      if (iterationPin?.autoExpand) return true;
      if (item.retryAttemptCount != null && item.retryAttemptCount > 0) return true;
      if (childNodesForParent.length === 0) return false;
      return !COLLAPSED_BY_DEFAULT_STEP_TYPES.includes(item.stepType);
    })();

    const node: OpenTreeNode = {
      id: nodeId,
      defaultExpanded,
      children: childNodesForParent,
      row: {
        stepId: displayLabel,
        stepType,
        selected,
        status,
        executionTimeMs: rolledDuration,
        usage: rolledUsage,
        usageCallCount: rolledCallCount,
        usageModel: leafUsageModel,
        iterationPinKinds: iterationPin?.kinds,
        stateTags: rowStateTags ? [...rowStateTags] : undefined,
        onSelect: selectStep,
        isExpandable: childNodesForParent.length > 0,
        isTrigger: isTriggerPseudoStep,
        isBranchLabel,
        isSkeleton: isSkeletonStep,
        showAggregateDanger,
        attemptNumber: item.isRetryAttempt ? undefined : item.attemptNumber,
        isRetryAttempt: item.isRetryAttempt,
        retryAttemptCount: item.isRetryAttempt ? undefined : item.retryAttemptCount,
        retryMaxAttempts,
        error: errorMessage,
        onViewFailedStepInput:
          status && isDangerousStatus(status) && stepExecution?.id
            ? () => onSelectStepExecution(stepExecution.id)
            : undefined,
        errorPanelDiagnoseState: options?.diagnose?.state,
        onDiagnoseFailedStep: (() => {
          const diagnose = options?.diagnose;
          if (
            status &&
            isDangerousStatus(status) &&
            stepExecution != null &&
            diagnose != null &&
            (diagnose.state === 'a' || diagnose.state === 'b')
          ) {
            return () => diagnose.onDiagnoseStep(stepExecution);
          }
          return undefined;
        })(),
        isDiagnoseLoading: options?.diagnose?.isDiagnoseHandoffInFlight,
        errorPanelRequiredLicenseTier: options?.diagnose?.requiredLicenseTier,
        errorPanelLicenseManagementHref: options?.diagnose?.licenseManagementHref,
        onOpenLicenseManagement: options?.diagnose?.onOpenLicenseManagement,
        errorPanelExpanded:
          options?.autoExpandErrorForStepId != null &&
          stepExecution?.id === options.autoExpandErrorForStepId,
        errorPanelAriaLabel: item.isRetryAttempt
          ? i18n.translate('workflows.executionFlyout.failedStep.attemptRegionLabel', {
              defaultMessage: 'Error details for Attempt {n}',
              values: { n: item.attemptNumber ?? 0 },
            })
          : undefined,
        errorPanelMessageOverride: retryLeadIn,
        showDangerSelectionBorder,
        arrivalPulse,
      },
    };

    return [node];
  });
}

const OpenTreeNodes = ({
  nodes,
  expandedIds,
  onToggleExpand,
  statusPlacement,
  depth = 0,
  leafList = false,
}: {
  nodes: OpenTreeNode[];
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  statusPlacement: StatusPlacement;
  depth?: number;
  /** Flat iteration lists: no expand chevrons; keep gutter only to align with gap ⋯. */
  leafList?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  // Reserve the chevron gutter for every row in this sibling group only if at
  // least one sibling shows a chevron or gap-link glyph. Leaf-only groups
  // (attempt lists) drop the slot and shift left.
  const reserveChevronSlot = leafList
    ? nodes.some((n) => n.gap != null)
    : nodes.some(
        (n) =>
          n.gap != null || (n.row != null && (Boolean(n.row.isExpandable) || n.children.length > 0))
      );

  return (
    <>
      {nodes.map((node) => {
        if (node.retryWaitMs != null) {
          return (
            <div key={node.id} data-depth={depth}>
              <RetryWaitAnnotation
                durationMs={node.retryWaitMs}
                reserveChevronSlot={reserveChevronSlot}
              />
            </div>
          );
        }

        if (node.gap) {
          return (
            <div key={node.id} data-depth={depth}>
              <IterationGapRow
                from={node.gap.from}
                to={node.gap.to}
                count={node.gap.count}
                isExpanded={node.gap.isExpanded}
                executionTimeMs={node.gap.executionTimeMs}
                usage={node.gap.usage}
                usageCallCount={node.gap.usageCallCount}
                onToggle={node.gap.onToggle}
              />
            </div>
          );
        }

        if (!node.row) {
          return null;
        }

        const hasTreeChildren = !leafList && node.children.length > 0;
        const isExpandable = !leafList && (Boolean(node.row.isExpandable) || hasTreeChildren);
        const handleToggle = leafList
          ? undefined
          : node.row.onToggleExpand ??
            (hasTreeChildren ? () => onToggleExpand(node.id) : undefined);
        const isExpanded = leafList
          ? false
          : node.row.onToggleExpand
          ? Boolean(node.row.isExpanded)
          : hasTreeChildren && expandedIds.has(node.id);

        return (
          <div
            key={node.id}
            data-depth={depth}
            data-step-execution-id={node.id}
            data-test-subj="workflowStepTreeNode"
          >
            <StepExecutionTreeRow
              {...node.row}
              isExpanded={isExpanded}
              onToggleExpand={handleToggle}
              isExpandable={isExpandable}
              reserveChevronSlot={reserveChevronSlot}
              statusPlacement={statusPlacement}
              data-test-subj={
                node.row.isBranchLabel
                  ? 'workflowStepExecutionTreeBranchRow'
                  : 'step-execution-tree-item-label'
              }
            />
            {isExpanded && hasTreeChildren && (
              <div
                data-test-subj="workflowStepTreeIndentGuide"
                css={css`
                  margin-top: ${TREE_INDENT_GUIDE_STANDOFF_PX}px;
                  margin-left: ${getTreeIndentGuideOffset(euiTheme.size[TREE_ROW_PADDING_X_SIZE])};
                  padding-left: ${euiTheme.size[INDENT_GUIDE_CHILD_GAP_SIZE]};
                  border-left: ${TREE_INDENT_GUIDE_WIDTH_PX}px solid
                    ${euiTheme.colors.borderBaseSubdued};
                `}
              >
                <OpenTreeNodes
                  nodes={node.children}
                  expandedIds={expandedIds}
                  onToggleExpand={onToggleExpand}
                  statusPlacement={statusPlacement}
                  depth={depth + 1}
                  leafList={leafList}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

const collectDefaultExpandedIds = (nodes: OpenTreeNode[], into: Set<string>) => {
  for (const node of nodes) {
    if (node.defaultExpanded && node.children.length > 0) {
      into.add(node.id);
    }
    collectDefaultExpandedIds(node.children, into);
  }
};

/**
 * Iterations section rows: full flat list of iteration leaves (no nested step
 * trees / expand chevrons). Gap rows are already disabled via collapseIterations.
 */
const asFlatIterationRows = (nodes: OpenTreeNode[]): OpenTreeNode[] =>
  nodes.map((node) => {
    if (node.gap || !node.row) {
      return node;
    }
    return {
      ...node,
      children: [],
      defaultExpanded: false,
      row: {
        ...node.row,
        isExpandable: false,
        isExpanded: false,
        onToggleExpand: undefined,
      },
    };
  });

export interface StepExecutionOpenTreeProps {
  /** Tree roots to convert (e.g. a single foreach node). */
  roots: StepExecutionTreeItem[];
  stepExecutions: WorkflowStepExecutionDto[];
  selectedId: string | null;
  onStepExecutionClick: (stepExecutionId: string) => void;
  isExecutionComplete?: boolean;
  /**
   * When true, render only the converted roots' children (foreach → iterations)
   * as a full flat list — no pin/gap collapse, no nested step expand.
   */
  childrenOnly?: boolean;
  statusPlacement?: StatusPlacement;
  'data-test-subj'?: string;
}

/**
 * Shared open-tree renderer used by the Table tab and foreach Iterations section.
 * Table tab keeps pin-and-gap; Iterations section (`childrenOnly`) lists every
 * iteration as a leaf.
 */
export const StepExecutionOpenTree = ({
  roots,
  stepExecutions,
  selectedId,
  onStepExecutionClick,
  isExecutionComplete = true,
  childrenOnly = false,
  statusPlacement = 'right',
  'data-test-subj': dataTestSubj,
}: StepExecutionOpenTreeProps) => {
  const [expandedGapIds, setExpandedGapIds] = useState<Set<string>>(new Set());
  const [userExpandedIds, setUserExpandedIds] = useState<Set<string> | null>(null);

  const onToggleGap = useCallback((id: string) => {
    setExpandedGapIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const stepExecutionMap = useMemo(() => {
    const map = new Map<string, WorkflowStepExecutionDto>();
    for (const step of stepExecutions) {
      map.set(step.id, step);
    }
    return map;
  }, [stepExecutions]);

  const openNodes = useMemo(() => {
    const converted = convertTreeToOpenNodes(
      roots,
      stepExecutionMap,
      selectedId,
      onStepExecutionClick,
      expandedGapIds,
      onToggleGap,
      {
        isExecutionComplete,
        // Iterations section: show every iteration; Table tab keeps pin/gap.
        collapseIterations: childrenOnly ? false : undefined,
      }
    );
    if (childrenOnly && converted.length === 1) {
      return asFlatIterationRows(converted[0].children);
    }
    return converted;
  }, [
    childrenOnly,
    expandedGapIds,
    isExecutionComplete,
    onStepExecutionClick,
    onToggleGap,
    roots,
    selectedId,
    stepExecutionMap,
  ]);

  const defaultExpandedIds = useMemo(() => {
    const ids = new Set<string>();
    collectDefaultExpandedIds(openNodes, ids);
    return ids;
  }, [openNodes]);

  const expandedIds = userExpandedIds ?? defaultExpandedIds;

  const onToggleExpand = useCallback(
    (id: string) => {
      setUserExpandedIds((prev) => {
        const base = prev ?? new Set(defaultExpandedIds);
        const next = new Set(base);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [defaultExpandedIds]
  );

  return (
    <div
      role="group"
      data-test-subj={dataTestSubj}
      aria-label={i18n.translate('workflows.WorkflowStepExecutionTree.openTreeAriaLabel', {
        defaultMessage: 'Step execution tree',
      })}
    >
      <OpenTreeNodes
        nodes={openNodes}
        expandedIds={expandedIds}
        onToggleExpand={onToggleExpand}
        statusPlacement={statusPlacement}
        leafList={childrenOnly}
      />
    </div>
  );
};

const flattenIfBranches = (items: StepExecutionTreeItem[]): StepExecutionTreeItem[] =>
  items.flatMap((item) => {
    if (item.stepType === 'if-branch' || item.stepType === 'enter-case-branch') {
      const branchTaken = item.children.some((c) => c.stepExecutionId != null);
      return [
        {
          ...item,
          status: branchTaken ? ExecutionStatus.COMPLETED : ExecutionStatus.SKIPPED,
          children: [],
        },
        ...flattenIfBranches(item.children),
      ];
    }
    if (isIterationStepType(item.stepType)) {
      return [
        {
          ...item,
          children: flattenIfBranches(item.children),
        },
      ];
    }
    return [{ ...item, children: flattenIfBranches(item.children) }];
  });

const emptyPromptCommonProps: EuiEmptyPromptProps = { titleSize: 'xs', paddingSize: 's' };

export interface WorkflowStepExecutionTreeProps {
  execution: WorkflowExecutionDto | null;
  definition: WorkflowYaml | null;
  error: Error | null;
  onStepExecutionClick: (stepExecutionId: string) => void;
  selectedId: string | null;
  childExecutionsMap?: ChildWorkflowExecutionsMap;
  isLoadingChildExecutions?: boolean;
  /** Auto-expand the inline error panel for this step execution id (failed execution open). */
  autoExpandErrorForStepId?: string | null;
  /** One-shot arrival pulse on the error region for this step execution id. */
  errorArrivalPulseStepId?: string | null;
  /** Status icon anchoring. Trailing after name/meta; never before the type icon. */
  statusPlacement?: StatusPlacement;
  /** Display name for Diagnose conversation titles. */
  workflowName?: string;
  /** Close step subflyout(s) before opening Agent Builder diagnose chat. */
  onBeforeDiagnose?: () => void;
}

export const WorkflowStepExecutionTree = ({
  error,
  execution,
  definition,
  onStepExecutionClick,
  selectedId,
  childExecutionsMap,
  isLoadingChildExecutions,
  autoExpandErrorForStepId,
  errorArrivalPulseStepId,
  statusPlacement = 'right',
  workflowName,
  onBeforeDiagnose,
}: WorkflowStepExecutionTreeProps) => {
  const styles = useMemoCss(componentStyles);
  const [expandedGapIds, setExpandedGapIds] = useState<Set<string>>(new Set());
  const [userExpandedIds, setUserExpandedIds] = useState<Set<string> | null>(null);
  const diagnoseAvailability = useErrorPanelDiagnoseAvailability();

  const onDiagnoseStep = useCallback(
    (stepExecution: WorkflowStepExecutionDto) => {
      if (!execution) return;
      onBeforeDiagnose?.();
      const contextPackage = buildDiagnosisContextPackage({
        failedStep: stepExecution,
        allStepExecutions: execution.stepExecutions,
        definition,
        workflowId: execution.workflowId ?? '',
        executionId: execution.id,
      });
      diagnoseAvailability.openDiagnose({
        contextPackage,
        workflowName:
          workflowName ||
          execution.workflowName ||
          execution.workflowDefinition?.name ||
          execution.workflowId ||
          'Workflow',
      });
    },
    [definition, diagnoseAvailability, execution, onBeforeDiagnose, workflowName]
  );

  const diagnoseOptions = useMemo(
    () => ({
      state: diagnoseAvailability.state,
      requiredLicenseTier: diagnoseAvailability.requiredLicenseTier,
      licenseManagementHref: diagnoseAvailability.licenseManagementHref,
      onOpenLicenseManagement: diagnoseAvailability.openLicenseManagement,
      onDiagnoseStep,
      isDiagnoseHandoffInFlight: diagnoseAvailability.isDiagnoseHandoffInFlight,
    }),
    [diagnoseAvailability, onDiagnoseStep]
  );

  const onToggleGap = useCallback((id: string) => {
    setExpandedGapIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const failedBeforeSteps =
    execution != null && isFailedBeforeSteps(execution.status, execution.stepExecutions);

  const openNodes = useMemo(() => {
    if (!execution || !definition || error) return [] as OpenTreeNode[];
    if (
      execution.stepExecutions?.length === 0 &&
      !isInProgressStatus(execution.status) &&
      !failedBeforeSteps
    ) {
      return [] as OpenTreeNode[];
    }

    const stepExecutionNameMap = new Map<string, WorkflowStepExecutionDto>();
    const stepExecutionMap = new Map<string, WorkflowStepExecutionDto>();

    for (const stepExecution of execution.stepExecutions) {
      stepExecutionNameMap.set(stepExecution.stepId, stepExecution);
      stepExecutionMap.set(stepExecution.id, stepExecution);
    }

    if (!isTerminalStatus(execution.status) || failedBeforeSteps) {
      definition.steps
        .filter((step) => !stepExecutionNameMap.has(step.name))
        .filter((step) => !execution.stepId || step.name === execution.stepId)
        .map((step, index) => ({
          stepId: step.name,
          stepType: step.type,
          status: 'pending' as WorkflowStepExecutionDto['status'],
          id: `skeleton-${step.name}-${step.type}-${index}`,
          scopeStack: [],
          workflowRunId: '',
          workflowId: '',
          startedAt: '',
          finishedAt: '',
          children: [],
          globalExecutionIndex: 0,
          stepExecutionIndex: 0,
          topologicalIndex: 0,
        }))
        .forEach((skeletonStepExecution) =>
          stepExecutionMap.set(skeletonStepExecution.id, skeletonStepExecution)
        );
    }

    let stepExecutionsTree = buildStepExecutionsTree(
      Array.from(stepExecutionMap.values()),
      execution.context,
      execution.status,
      execution.triggeredBy
    );
    stepExecutionsTree = mergeDefinitionStepsIntoTree(stepExecutionsTree, definition);

    const { tree: treeWithChildren, childStepExecutions } = injectChildWorkflowSteps(
      stepExecutionsTree,
      childExecutionsMap ?? new Map(),
      isLoadingChildExecutions ?? false
    );
    stepExecutionsTree = treeWithChildren;
    for (const childStep of childStepExecutions) {
      stepExecutionMap.set(childStep.id, childStep);
    }

    const overviewPseudoStep = stepExecutionsTree.find((item) => item.stepType === '__overview');
    if (overviewPseudoStep) {
      stepExecutionMap.set('__overview', buildOverviewStepExecutionFromContext(execution));
    }

    const triggerTreeItem =
      stepExecutionsTree.find((item) => item.stepType === '__trigger') ??
      stepExecutionsTree.find((item) => item.stepType === '__inputs');
    if (triggerTreeItem && execution.context) {
      const triggerExecution = buildTriggerStepExecutionFromContext(execution);
      if (triggerExecution) {
        stepExecutionMap.set(triggerExecution.id, triggerExecution);
        triggerTreeItem.stepExecutionId = triggerExecution.id;
        triggerTreeItem.stepType = triggerExecution.stepType ?? '';
      }
    }
    const visibleTree = stepExecutionsTree.filter((item) => item.stepType !== '__overview');
    // No step-tree text filter: collapse/pin/gap findability is auto-scroll, the
    // header failure link, and iteration pins. If search returns, spec
    // expand-on-match and matches inside collapsed gaps/attempts first.
    const flatTree = flattenIfBranches(visibleTree);

    return convertTreeToOpenNodes(
      flatTree,
      stepExecutionMap,
      selectedId,
      onStepExecutionClick,
      expandedGapIds,
      onToggleGap,
      {
        executionUsage: execution.usage,
        autoExpandErrorForStepId,
        errorArrivalPulseStepId,
        isExecutionComplete: isTerminalStatus(execution.status),
        definition,
        diagnose: diagnoseOptions,
      }
    );
  }, [
    autoExpandErrorForStepId,
    errorArrivalPulseStepId,
    childExecutionsMap,
    definition,
    diagnoseOptions,
    error,
    execution,
    expandedGapIds,
    failedBeforeSteps,
    isLoadingChildExecutions,
    onStepExecutionClick,
    onToggleGap,
    selectedId,
  ]);

  const defaultExpandedIds = useMemo(() => {
    const ids = new Set<string>();
    collectDefaultExpandedIds(openNodes, ids);
    return ids;
  }, [openNodes]);

  const expandedIds = userExpandedIds ?? defaultExpandedIds;

  const onToggleExpand = useCallback(
    (id: string) => {
      setUserExpandedIds((prev) => {
        const base = prev ?? new Set(defaultExpandedIds);
        const next = new Set(base);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [defaultExpandedIds]
  );

  if (!execution) {
    return (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        icon={<EuiLoadingSpinner size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.WorkflowStepExecutionTree.loadingStepExecutions"
              defaultMessage="Loading step executions..."
            />
          </h2>
        }
      />
    );
  }

  if (error) {
    return (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        icon={<EuiIcon type="error" size="l" aria-hidden={true} />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.WorkflowStepExecutionTree.errorLoadingStepExecutions"
              defaultMessage="Error loading step executions"
            />
          </h2>
        }
        body={<EuiText>{error.message}</EuiText>}
      />
    );
  }

  if (
    execution.stepExecutions?.length === 0 &&
    !isInProgressStatus(execution.status) &&
    !failedBeforeSteps
  ) {
    return (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        icon={<EuiIcon type="listBullet" size="l" aria-hidden={true} />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.WorkflowStepExecutionTree.noExecutionFound"
              defaultMessage="No step executions found"
            />
          </h2>
        }
      />
    );
  }

  if (definition) {
    return (
      <div
        css={styles.treeViewContainer}
        role="tree"
        aria-label={i18n.translate(
          'workflows.WorkflowStepExecutionTree.workflowStepExecutionTreeAriaLabel',
          {
            defaultMessage: 'Workflow step execution tree',
          }
        )}
        data-test-subj="workflowStepExecutionTree"
      >
        <OpenTreeNodes
          nodes={openNodes}
          expandedIds={expandedIds}
          onToggleExpand={onToggleExpand}
          statusPlacement={statusPlacement}
        />
      </div>
    );
  }

  return (
    <EuiEmptyPrompt
      {...emptyPromptCommonProps}
      icon={<EuiIcon type="error" size="l" aria-hidden={true} />}
      title={
        <h2>
          <FormattedMessage
            id="workflows.WorkflowStepExecutionTree.errorLoadingStepExecutions"
            defaultMessage="Error loading execution graph"
          />
        </h2>
      }
    />
  );
};

const componentStyles = {
  treeViewContainer: ({ euiTheme }: UseEuiTheme) => css`
    padding-block: ${euiTheme.size.xs};
  `,
};
