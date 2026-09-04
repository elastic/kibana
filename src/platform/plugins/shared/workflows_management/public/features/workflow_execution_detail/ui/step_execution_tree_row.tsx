/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { SerializedError, WorkflowTokenUsage } from '@kbn/workflows';
import { ExecutionStatus, isDangerousStatus } from '@kbn/workflows';
import { getStepIconType } from '@kbn/workflows-ui';
import { FailedStepErrorPanel } from './failed_step_error_panel';
import { TreeStateTag, type TreeStateTagKind } from './tree_state_tag';
import { formatDuration } from '../../../shared/lib/format_duration';
import { getExecutionStatusIcon } from '../../../shared/ui/status_badge';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { TokenUsageBadge } from '../../../shared/ui/token_usage_badge/token_usage_badge';
import type { ErrorPanelDiagnoseState } from '../lib/derive_error_panel_diagnose_availability';
import type { IterationPinKind } from '../lib/iteration_pins';

/** Chevron / gap-glyph gutter width — reserved per sibling group when needed. */
export const TREE_ROW_CHEVRON_SLOT_PX = 16;
/** Step / attempt icon column width (EuiIcon size="m"). */
export const TREE_ROW_ICON_SLOT_PX = 16;

/**
 * Shared open-tree row spacing. Tune here — consumers read these constants
 * (row flex gap, vertical padding, indent-guide geometry).
 */
export const TREE_ROW_GAP_SIZE = 's' as const; // euiTheme.size.s → 8px
export const TREE_ROW_PADDING_X_SIZE = 's' as const; // euiTheme.size.s → 8px
/** Previous vertical padding was size.xs (4px); +2px breathing room. */
export const TREE_ROW_PADDING_Y_PX = 6;
export const TREE_INDENT_GUIDE_WIDTH_PX = 1.5;
/** Space between the parent row bottom and the start of the guide. */
export const TREE_INDENT_GUIDE_STANDOFF_PX = 2;

/**
 * Horizontal offset from the node wrapper's left edge to the indent guide,
 * so the guide sits under the parent row's chevron-slot center:
 * row left padding + half the chevron slot.
 */
export const getTreeIndentGuideOffset = (rowPaddingX: string): string =>
  `calc(${rowPaddingX} + ${TREE_ROW_CHEVRON_SLOT_PX / 2}px)`;

export type StatusPlacement = 'inline' | 'right';

export interface StepExecutionTreeRowProps {
  stepId: string;
  stepType?: string;
  status?: ExecutionStatus;
  executionTimeMs?: number | null;
  usage?: WorkflowTokenUsage;
  usageCallCount?: number;
  /** Leaf AI model name for the token badge popover footer. */
  usageModel?: string;
  /**
   * When set, inline metadata shows "{n} iterations · {duration}" (legacy range rows).
   * Prefer gap rows for collapsed ranges.
   */
  iterationCount?: number;
  /** Pin tags for foreach/while iteration exemplar rows (failed / latest / running). */
  iterationPinKinds?: IterationPinKind[];
  /**
   * Extra qualitative tags (e.g. retry `final`). Merged with `iterationPinKinds`
   * after the name; metric pills stay in the metadata cluster.
   */
  stateTags?: TreeStateTagKind[];
  selected: boolean;
  onSelect: () => void;
  /** Parent rows with children. */
  isExpandable?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isTrigger?: boolean;
  /** Structural labels (branch / case) — no metadata cluster; uses → glyph. */
  isBranchLabel?: boolean;
  isSkeleton?: boolean;
  /**
   * Override interactivity. Branch labels default non-interactive; set true for
   * clickable structural controls.
   */
  forceInteractive?: boolean;
  /** Legacy #N prefix; prefer `isRetryAttempt` + Attempt label. */
  attemptNumber?: number;
  /** This row is a retry attempt of its parent step. */
  isRetryAttempt?: boolean;
  /** On the retry parent: attempts that actually ran (used). */
  retryAttemptCount?: number;
  /** On the retry parent: total allowed attempts denominator (config max-attempts + 1). */
  retryMaxAttempts?: number;
  /**
   * When false, omit the chevron gutter so leaf-only sibling groups (e.g. attempts)
   * shift left. Computed per sibling group by the parent list renderer.
   */
  reserveChevronSlot?: boolean;
  error?: SerializedError | string | null;
  onViewFailedStepInput?: () => void;
  /** AI diagnose CTA state for the inline error panel (A–D). */
  errorPanelDiagnoseState?: ErrorPanelDiagnoseState;
  onDiagnoseFailedStep?: () => void;
  isDiagnoseLoading?: boolean;
  errorPanelRequiredLicenseTier?: string;
  errorPanelLicenseManagementHref?: string;
  onOpenLicenseManagement?: () => void;
  errorPanelExpanded?: boolean;
  /** Accessible name for the inline error region. */
  errorPanelAriaLabel?: string;
  /** Optional full message body (retry exhaustion lead-in + last error). */
  errorPanelMessageOverride?: string;
  /**
   * Danger border around this error region because the owning step is selected
   * (may be a sibling retry attempt, not this row).
   */
  showDangerSelectionBorder?: boolean;
  /** One-shot arrival pulse when navigating to this failure (header link / flyout open). */
  arrivalPulse?: boolean;
  /**
   * Where the in-progress status icon (spinner / hourglass) anchors. Always
   * trailing (after name/meta) — the chevron gutter is the only element before
   * the step-type icon. Failed steps tint the step icon and label instead of
   * showing a separate error glyph.
   */
  statusPlacement?: StatusPlacement;
  /** Show danger status when an ancestor aggregates a failed descendant. */
  showAggregateDanger?: boolean;
  'data-test-subj'?: string;
}

const notRunLabel = i18n.translate('workflowsManagement.stepExecutionTreeRow.notRun', {
  defaultMessage: 'Not run',
});

const shouldShowStatusIcon = (status: ExecutionStatus | undefined): boolean => {
  if (!status) return false;
  return (
    status === ExecutionStatus.RUNNING ||
    status === ExecutionStatus.WAITING ||
    status === ExecutionStatus.WAITING_FOR_INPUT ||
    status === ExecutionStatus.WAITING_FOR_CHILD
  );
};

const StatusIcon = ({ status }: { status?: ExecutionStatus }) => {
  const { euiTheme } = useEuiTheme();
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
 * Single open-tree row: chevron gutter, status (when inline), step icon, name,
 * then inline-left metadata. Shared for steps, parents, branch labels, and the
 * trigger row.
 */
export const StepExecutionTreeRow = React.memo<StepExecutionTreeRowProps>(
  ({
    stepId,
    stepType = '',
    status,
    executionTimeMs = null,
    usage,
    usageCallCount,
    usageModel,
    iterationCount,
    iterationPinKinds = [],
    stateTags = [],
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
    isRetryAttempt = false,
    retryAttemptCount,
    retryMaxAttempts,
    reserveChevronSlot = true,
    error,
    onViewFailedStepInput,
    errorPanelDiagnoseState,
    onDiagnoseFailedStep,
    isDiagnoseLoading,
    errorPanelRequiredLicenseTier,
    errorPanelLicenseManagementHref,
    onOpenLicenseManagement,
    errorPanelExpanded: _errorPanelExpanded,
    errorPanelAriaLabel,
    errorPanelMessageOverride,
    showDangerSelectionBorder = false,
    arrivalPulse = false,
    statusPlacement = 'right',
    showAggregateDanger = false,
    'data-test-subj': dataTestSubj = 'workflowStepExecutionTreeRow',
  }) => {
    const { euiTheme, colorMode } = useEuiTheme();
    const isIterationParent = stepType === 'foreach-iteration' || stepType === 'while-iteration';
    const hasFailedPin = iterationPinKinds.includes('failed');
    const isRetryParent = retryAttemptCount != null && retryAttemptCount > 0 && !isRetryAttempt;
    const statusIsDangerous = status != null && isDangerousStatus(status);
    /** Danger fill only on the failure's location — never on retry parents or earlier attempts. */
    const showDangerFill =
      hasFailedPin ||
      (statusIsDangerous && !isRetryParent && (!isRetryAttempt || stateTags.includes('final')));
    const isDangerous = showDangerFill;
    const isInactive = status === ExecutionStatus.SKIPPED || status === ExecutionStatus.PENDING;
    const showNotRun = isInactive && !isTrigger && !isBranchLabel;
    const isInteractive = forceInteractive ?? (!isSkeleton && !isBranchLabel && !isRetryParent);
    const allowHover = isInteractive && !showNotRun;
    const tintDanger = statusIsDangerous || showAggregateDanger || hasFailedPin;
    const typeIconIsHourglass = getStepIconType(stepType || stepId) === 'hourglass';
    const isWaitingStatus =
      status === ExecutionStatus.WAITING ||
      status === ExecutionStatus.WAITING_FOR_INPUT ||
      status === ExecutionStatus.WAITING_FOR_CHILD;
    // Trailing hourglass only — never a leading slot. Skip it when the type
    // icon is already hourglass-shaped (duplicate glyph).
    const showStatus =
      !isBranchLabel && shouldShowStatusIcon(status) && !(isWaitingStatus && typeIconIsHourglass);

    const hoverBg = euiTheme.colors.backgroundBaseInteractiveHover;
    const selectBg = euiTheme.colors.backgroundBaseInteractiveSelect;
    const radius = euiTheme.border.radius.medium;
    // Light theme: stronger danger border for contrast against the danger fill.
    const dangerSelectionBorder =
      colorMode === 'LIGHT' ? euiTheme.colors.borderStrongDanger : euiTheme.colors.borderBaseDanger;

    const expandLabel = i18n.translate('workflowsManagement.stepExecutionTreeRow.expandAriaLabel', {
      defaultMessage: '{expanded, select, true{Collapse} other{Expand}} {stepName}',
      values: { expanded: isExpanded, stepName: stepId },
    });

    // Dedupe while preserving order: pin kinds, waiting annotation, then extra tags.
    const waitingTags: TreeStateTagKind[] =
      status === ExecutionStatus.WAITING_FOR_INPUT ? ['waitingForInput'] : [];
    const resolvedStateTags = [...iterationPinKinds, ...waitingTags, ...stateTags].filter(
      (kind, index, all): kind is TreeStateTagKind => all.indexOf(kind) === index
    );

    const showErrorPanel = showDangerFill && Boolean(error) && Boolean(onViewFailedStepInput);

    const statusNode = showStatus ? <StatusIcon status={status} /> : null;
    const dangerIconColor = tintDanger ? euiTheme.colors.danger : undefined;

    const durationNode = (() => {
      if (isBranchLabel || isTrigger) return null;
      if (showNotRun) {
        return (
          <EuiText size="xs" color="subdued" data-test-subj="workflowStepTreeDuration">
            {notRunLabel}
          </EuiText>
        );
      }
      if (iterationCount != null && iterationCount > 0) {
        const durationLabel =
          executionTimeMs != null && Number.isFinite(executionTimeMs) && executionTimeMs >= 0
            ? formatDuration(executionTimeMs)
            : undefined;
        return (
          <EuiText size="xs" color="subdued" data-test-subj="workflowStepTreeDuration">
            {durationLabel != null
              ? i18n.translate('workflowsManagement.stepExecutionTreeRow.iterationRangeMeta', {
                  defaultMessage: '{count} iterations · {duration}',
                  values: { count: iterationCount, duration: durationLabel },
                })
              : i18n.translate('workflowsManagement.stepExecutionTreeRow.iterationRangeCountOnly', {
                  defaultMessage: '{count} iterations',
                  values: { count: iterationCount },
                })}
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
      !isBranchLabel && usage && usage.totalTokens > 0 ? (
        <TokenUsageBadge
          usage={usage}
          compact
          callCount={usageCallCount}
          model={usageModel}
          data-test-subj="workflowStepTreeTokenUsage"
        />
      ) : null;

    const attemptsBadge =
      isRetryParent && retryAttemptCount != null ? (
        <EuiBadge color="hollow" iconType="refresh" data-test-subj="workflowStepTreeAttemptsBadge">
          {retryMaxAttempts != null
            ? i18n.translate('workflowsManagement.stepExecutionTreeRow.attemptsOfMaxBadge', {
                defaultMessage: '{used} of {max} attempts',
                values: { used: retryAttemptCount, max: retryMaxAttempts },
              })
            : i18n.translate('workflowsManagement.stepExecutionTreeRow.attemptsBadge', {
                defaultMessage: '{n} attempts',
                values: { n: retryAttemptCount },
              })}
        </EuiBadge>
      ) : null;

    const metaInline = (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="none"
        responsive={false}
        wrap={false}
        css={css`
          flex-shrink: 0;
          min-width: 0;
          gap: ${euiTheme.size[TREE_ROW_GAP_SIZE]};
        `}
        data-test-subj="workflowStepTreeMeta"
      >
        {attemptsBadge && <EuiFlexItem grow={false}>{attemptsBadge}</EuiFlexItem>}
        {tokenNode && <EuiFlexItem grow={false}>{tokenNode}</EuiFlexItem>}
        {durationNode && <EuiFlexItem grow={false}>{durationNode}</EuiFlexItem>}
      </EuiFlexGroup>
    );

    const rowBg = (() => {
      if (showDangerFill) return euiTheme.colors.backgroundBaseDanger;
      if (isTrigger) return euiTheme.colors.backgroundBaseSubdued;
      if (selected) return selectBg;
      return 'transparent';
    })();

    return (
      <div
        data-test-subj={dataTestSubj}
        data-selected={selected ? 'true' : 'false'}
        data-status-placement={statusPlacement}
        data-danger-fill={showDangerFill ? 'true' : 'false'}
        data-danger-selected={showDangerSelectionBorder ? 'true' : 'false'}
        data-arrival-pulse={arrivalPulse ? 'true' : 'false'}
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
                showDangerFill
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
          ${showDangerSelectionBorder ? `outline: 1px solid ${dangerSelectionBorder};` : ''}
          ${arrivalPulse
            ? `
            @keyframes workflowDangerArrivalPulse {
              0%,
              100% {
                box-shadow: 0 0 0 0 ${transparentize(euiTheme.colors.danger, 0)};
              }
              50% {
                box-shadow: 0 0 0 ${euiTheme.size.xs} ${transparentize(
                euiTheme.colors.danger,
                0.35
              )};
              }
            }
            @media (prefers-reduced-motion: no-preference) {
              animation: workflowDangerArrivalPulse 0.6s ease-out 2;
            }
          `
            : ''}
        `}
      >
        <EuiFlexGroup
          alignItems="center"
          gutterSize="none"
          responsive={false}
          wrap={false}
          css={css`
            gap: ${euiTheme.size[TREE_ROW_GAP_SIZE]};
            padding: ${TREE_ROW_PADDING_Y_PX}px ${euiTheme.size[TREE_ROW_PADDING_X_SIZE]};
            min-height: 28px;
          `}
          data-test-subj="workflowStepTreeRowInner"
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
          {reserveChevronSlot ? (
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
                  iconType={isExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
                  size="xs"
                  color="text"
                  aria-label={expandLabel}
                  aria-expanded={isExpanded}
                  data-test-subj="workflowStepTreeChevron"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleExpand?.();
                  }}
                />
              ) : (
                <span aria-hidden="true" />
              )}
            </EuiFlexItem>
          ) : null}
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
            ) : isRetryAttempt ? (
              <EuiIcon
                type="refresh"
                size="m"
                color={tintDanger ? euiTheme.colors.danger : 'subdued'}
                aria-hidden={true}
                data-test-subj="workflowStepTreeRetryAttemptIcon"
              />
            ) : isIterationParent ? (
              <span data-test-subj="workflowStepTreeIterationIcon">
                <StepIcon
                  stepType={stepType}
                  executionStatus={isDangerous ? ExecutionStatus.FAILED : status ?? null}
                  color={dangerIconColor}
                  iconColor={dangerIconColor}
                />
              </span>
            ) : (
              <StepIcon
                stepType={stepType || stepId}
                executionStatus={isTrigger ? null : status ?? null}
                color={dangerIconColor}
                iconColor={dangerIconColor}
              />
            )}
          </EuiFlexItem>

          <EuiFlexItem
            grow={true}
            css={css`
              min-width: 0;
              max-width: 100%;
            `}
          >
            <EuiFlexGroup
              alignItems="center"
              gutterSize="none"
              responsive={false}
              wrap={false}
              css={css`
                /* Annotations use a leading " · "; failed chip adds its own margin. */
                gap: 0;
                min-width: 0;
              `}
            >
              <EuiFlexItem grow={false} css={{ minWidth: 0, maxWidth: '100%' }}>
                <EuiText
                  size="s"
                  css={css`
                    font-weight: ${isExpandable || hasFailedPin ? 500 : 400};
                    color: ${selected
                      ? euiTheme.colors.textPrimary
                      : tintDanger
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
                    {!isRetryAttempt && attemptNumber !== undefined && (
                      <span
                        css={css`
                          color: ${euiTheme.colors.textSubdued};
                          font-variant-numeric: tabular-nums;
                        `}
                      >
                        {`#${attemptNumber} `}
                      </span>
                    )}
                    {stepId}
                  </span>
                </EuiText>
              </EuiFlexItem>
              {resolvedStateTags.length > 0 && (
                <EuiFlexItem grow={false} data-test-subj="workflowStepTreeStateTags">
                  <EuiFlexGroup
                    alignItems="center"
                    gutterSize="none"
                    responsive={false}
                    wrap={false}
                  >
                    {resolvedStateTags.map((kind) => (
                      <EuiFlexItem
                        grow={false}
                        key={kind}
                        css={
                          kind === 'failed'
                            ? css`
                                margin-inline-start: ${euiTheme.size.xs};
                              `
                            : undefined
                        }
                      >
                        <TreeStateTag
                          kind={kind}
                          data-test-subj={`workflowStepTreeIterationTag-${kind}`}
                        />
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>

          {!isBranchLabel && (
            <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
              {metaInline}
            </EuiFlexItem>
          )}

          {statusNode && (
            <EuiFlexItem
              grow={false}
              css={css`
                display: flex;
                justify-content: flex-end;
                align-items: center;
                min-width: ${euiTheme.size.l};
              `}
              data-test-subj="workflowStepTreeStatusSlot"
            >
              {statusNode}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {showErrorPanel && error && onViewFailedStepInput && (
          <FailedStepErrorPanel
            error={error}
            stepType={stepType}
            onViewInput={onViewFailedStepInput}
            diagnoseState={errorPanelDiagnoseState}
            onDiagnose={onDiagnoseFailedStep}
            isDiagnoseLoading={isDiagnoseLoading}
            requiredLicenseTier={errorPanelRequiredLicenseTier}
            licenseManagementHref={errorPanelLicenseManagementHref}
            onOpenLicenseManagement={onOpenLicenseManagement}
            ariaLabel={
              errorPanelAriaLabel ??
              i18n.translate('workflows.executionFlyout.failedStep.regionLabel', {
                defaultMessage: 'Error details for {stepName}',
                values: { stepName: stepId },
              })
            }
            messageOverride={errorPanelMessageOverride}
          />
        )}
      </div>
    );
  }
);

StepExecutionTreeRow.displayName = 'StepExecutionTreeRow';
