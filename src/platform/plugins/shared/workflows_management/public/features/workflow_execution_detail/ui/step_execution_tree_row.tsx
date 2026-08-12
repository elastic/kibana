/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { SerializedError, WorkflowTokenUsage } from '@kbn/workflows';
import { ExecutionStatus, isDangerousStatus } from '@kbn/workflows';
import { FailedStepErrorPanel } from './failed_step_error_panel';
import { formatDuration } from '../../../shared/lib/format_duration';
import { getExecutionStatusIcon } from '../../../shared/ui/status_badge';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { TokenUsageBadge } from '../../../shared/ui/token_usage_badge/token_usage_badge';

/** Chevron / icon gutter width — leaves reserve the same space so names align. */
export const TREE_ROW_CHEVRON_SLOT_PX = 16;

export type StatusPlacement = 'inline' | 'right';

export interface StepExecutionTreeRowProps {
  stepId: string;
  stepType?: string;
  status?: ExecutionStatus;
  executionTimeMs?: number | null;
  usage?: WorkflowTokenUsage;
  usageCallCount?: number;
  selected: boolean;
  onSelect: () => void;
  /** Parent rows with children. */
  isExpandable?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isTrigger?: boolean;
  /** Structural labels (branch / iteration range) — no metadata cluster. */
  isBranchLabel?: boolean;
  isSkeleton?: boolean;
  /**
   * Override interactivity. Branch labels default non-interactive; set true for
   * clickable structural controls (e.g. collapsed iteration range `#0-1`).
   */
  forceInteractive?: boolean;
  attemptNumber?: number;
  error?: SerializedError | string | null;
  onViewFailedStepInput?: () => void;
  errorPanelExpanded?: boolean;
  /**
   * Where the non-success status icon anchors. Default `inline` (after metadata).
   * `right` keeps everything else inline-left and only pushes the status icon.
   */
  statusPlacement?: StatusPlacement;
  /** Show danger status when an ancestor aggregates a failed descendant. */
  showAggregateDanger?: boolean;
  'data-test-subj'?: string;
}

const notRunLabel = i18n.translate('workflowsManagement.stepExecutionTreeRow.notRun', {
  defaultMessage: 'Not run',
});

const shouldShowStatusIcon = (
  status: ExecutionStatus | undefined,
  showAggregateDanger: boolean
): boolean => {
  if (showAggregateDanger) return true;
  if (!status) return false;
  if (status === ExecutionStatus.COMPLETED || status === ExecutionStatus.SKIPPED) return false;
  if (status === ExecutionStatus.PENDING) return false;
  return (
    isDangerousStatus(status) ||
    status === ExecutionStatus.RUNNING ||
    status === ExecutionStatus.WAITING ||
    status === ExecutionStatus.WAITING_FOR_INPUT ||
    status === ExecutionStatus.WAITING_FOR_CHILD ||
    status === ExecutionStatus.CANCELLED
  );
};

const StatusIcon = ({
  status,
  showAggregateDanger,
}: {
  status?: ExecutionStatus;
  showAggregateDanger: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  if (showAggregateDanger && (!status || !isDangerousStatus(status))) {
    return (
      <EuiIcon
        type="error"
        color={euiTheme.colors.danger}
        size="s"
        data-test-subj="workflowStepTreeStatusIcon"
        aria-label={i18n.translate('workflowsManagement.stepExecutionTreeRow.descendantFailed', {
          defaultMessage: 'Contains a failed step',
        })}
      />
    );
  }
  if (!status) return null;
  if (status === ExecutionStatus.RUNNING) {
    return <EuiLoadingSpinner size="s" data-test-subj="workflowStepTreeStatusIcon" />;
  }
  return (
    <span data-test-subj="workflowStepTreeStatusIcon">
      {getExecutionStatusIcon(euiTheme, status)}
    </span>
  );
};

/**
 * Single open-tree row: chevron gutter, step icon, name, then inline-left metadata.
 * Shared for steps, parents, branch labels, and the trigger row.
 */
export const StepExecutionTreeRow = React.memo<StepExecutionTreeRowProps>(
  ({
    stepId,
    stepType = '',
    status,
    executionTimeMs = null,
    usage,
    usageCallCount,
    selected,
    onSelect,
    isExpandable = false,
    isExpanded = false,
    onToggleExpand,
    isTrigger = false,
    isBranchLabel = false,
    isSkeleton = false,
    forceInteractive,
    attemptNumber,
    error,
    onViewFailedStepInput,
    errorPanelExpanded,
    statusPlacement = 'inline',
    showAggregateDanger = false,
    'data-test-subj': dataTestSubj = 'workflowStepExecutionTreeRow',
  }) => {
    const { euiTheme } = useEuiTheme();
    const isDangerous = status != null && isDangerousStatus(status);
    const isInactive = status === ExecutionStatus.SKIPPED || status === ExecutionStatus.PENDING;
    const showNotRun = isInactive && !isTrigger && !isBranchLabel;
    const isInteractive = forceInteractive ?? (!isSkeleton && !isBranchLabel);
    const allowHover = isInteractive && !showNotRun;
    const showStatus = !isBranchLabel && shouldShowStatusIcon(status, showAggregateDanger);

    const hoverBg = euiTheme.colors.backgroundBaseInteractiveHover;
    const selectBg = euiTheme.colors.backgroundBaseInteractiveSelect;
    const radius = euiTheme.border.radius.medium;

    const expandLabel = i18n.translate('workflowsManagement.stepExecutionTreeRow.expandAriaLabel', {
      defaultMessage: '{expanded, select, true{Collapse} other{Expand}} {stepName}',
      values: { expanded: isExpanded, stepName: stepId },
    });

    const statusNode = showStatus ? (
      <StatusIcon status={status} showAggregateDanger={showAggregateDanger && !isDangerous} />
    ) : null;

    const durationNode = (() => {
      if (isBranchLabel || isTrigger) return null;
      if (showNotRun) {
        return (
          <EuiText size="xs" color="subdued" data-test-subj="workflowStepTreeDuration">
            {notRunLabel}
          </EuiText>
        );
      }
      if (
        executionTimeMs != null &&
        Number.isFinite(executionTimeMs) &&
        executionTimeMs >= 0 &&
        status !== ExecutionStatus.WAITING_FOR_INPUT
      ) {
        return (
          <EuiText size="xs" color="subdued" data-test-subj="workflowStepTreeDuration">
            {formatDuration(executionTimeMs)}
          </EuiText>
        );
      }
      return null;
    })();

    const tokenNode =
      !isBranchLabel && usage ? (
        <TokenUsageBadge
          usage={usage}
          compact
          callCount={usageCallCount}
          data-test-subj="workflowStepTreeTokenUsage"
        />
      ) : null;

    const metaInline = (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        wrap={false}
        css={css`
          flex-shrink: 0;
          min-width: 0;
        `}
        data-test-subj="workflowStepTreeMeta"
      >
        {durationNode && <EuiFlexItem grow={false}>{durationNode}</EuiFlexItem>}
        {tokenNode && <EuiFlexItem grow={false}>{tokenNode}</EuiFlexItem>}
        {statusPlacement === 'inline' && statusNode && (
          <EuiFlexItem grow={false}>{statusNode}</EuiFlexItem>
        )}
      </EuiFlexGroup>
    );

    const rowBg = (() => {
      if (isDangerous) return euiTheme.colors.backgroundBaseDanger;
      if (isTrigger) return euiTheme.colors.backgroundBaseSubdued;
      if (selected) return selectBg;
      return 'transparent';
    })();

    return (
      <div
        data-test-subj={dataTestSubj}
        data-selected={selected ? 'true' : 'false'}
        data-status-placement={statusPlacement}
        css={css`
          width: 100%;
          min-width: 0;
          border-radius: ${radius};
          background-color: ${rowBg};
          opacity: ${showNotRun || isSkeleton ? 0.55 : 1};
          ${allowHover
            ? `
            cursor: pointer;
            &:hover {
              background-color: ${
                isDangerous
                  ? euiTheme.colors.backgroundBaseDanger
                  : selected
                  ? selectBg
                  : hoverBg
              };
            }
          `
            : isInteractive
            ? `cursor: pointer;`
            : ''}
          ${selected && isDangerous
            ? `outline: 1px solid ${euiTheme.colors.borderBasePrimary};`
            : ''}
        `}
      >
        <EuiFlexGroup
          alignItems="center"
          gutterSize="xs"
          responsive={false}
          wrap={false}
          css={css`
            padding: ${euiTheme.size.xs} ${euiTheme.size.s};
            min-height: 28px;
          `}
          onClick={
            isInteractive
              ? (e) => {
                  e.preventDefault();
                  onSelect();
                }
              : undefined
          }
          onKeyDown={
            isInteractive
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect();
                  }
                }
              : undefined
          }
          role={isInteractive ? 'treeitem' : undefined}
          tabIndex={isInteractive ? 0 : undefined}
          aria-selected={isInteractive ? selected : undefined}
          aria-expanded={isExpandable ? isExpanded : undefined}
        >
          <EuiFlexItem
            grow={false}
            css={css`
              width: ${TREE_ROW_CHEVRON_SLOT_PX}px;
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            `}
            data-test-subj="workflowStepTreeChevronSlot"
          >
            {isExpandable ? (
              <EuiButtonIcon
                iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
                size="xs"
                color="text"
                aria-label={expandLabel}
                aria-expanded={isExpanded}
                data-test-subj="workflowStepTreeChevron"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleExpand?.();
                }}
              />
            ) : (
              <span aria-hidden="true" />
            )}
          </EuiFlexItem>

          <EuiFlexItem
            grow={false}
            css={css`
              flex-shrink: 0;
              display: flex;
              align-items: center;
            `}
            data-test-subj="workflowStepTreeIconSlot"
          >
            {isBranchLabel ? (
              <EuiIcon
                type="sortRight"
                size="s"
                color="subdued"
                aria-hidden={true}
                data-test-subj="workflowStepTreeBranchGlyph"
              />
            ) : (
              <StepIcon
                stepType={stepType || stepId}
                executionStatus={isTrigger ? null : status ?? null}
              />
            )}
          </EuiFlexItem>

          <EuiFlexItem
            grow={false}
            css={css`
              min-width: 0;
              max-width: 100%;
            `}
          >
            <EuiText
              size="s"
              css={css`
                font-weight: ${isExpandable ? 500 : 400};
                color: ${selected
                  ? euiTheme.colors.textPrimary
                  : isDangerous
                  ? euiTheme.colors.danger
                  : isInactive
                  ? euiTheme.colors.textDisabled
                  : 'inherit'};
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              `}
            >
              <span data-test-subj="workflowStepName">
                {attemptNumber !== undefined && (
                  <span
                    css={css`
                      color: ${euiTheme.colors.textSubdued};
                      font-variant-numeric: tabular-nums;
                    `}
                  >
                    #{attemptNumber}{' '}
                  </span>
                )}
                {stepId}
              </span>
            </EuiText>
          </EuiFlexItem>

          {!isBranchLabel && (
            <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
              {metaInline}
            </EuiFlexItem>
          )}

          {statusPlacement === 'right' && statusNode && (
            <EuiFlexItem
              grow={true}
              css={css`
                display: flex;
                justify-content: flex-end;
                align-items: center;
                min-width: ${euiTheme.size.l};
              `}
            >
              {statusNode}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {isDangerous && error && onViewFailedStepInput && (
          <FailedStepErrorPanel
            error={error}
            stepType={stepType}
            onViewInput={onViewFailedStepInput}
            defaultExpanded={errorPanelExpanded ?? true}
          />
        )}
      </div>
    );
  }
);

StepExecutionTreeRow.displayName = 'StepExecutionTreeRow';
