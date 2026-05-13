/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiIcon, EuiText, transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import type { ExecutionStatus, WorkflowStepExecutionDto } from '@kbn/workflows';
import { isDangerousStatus } from '@kbn/workflows';
import { formatDuration } from '../../../shared/lib/format_duration';
import { getExecutionStatusColors, getExecutionStatusIcon } from '../../../shared/ui/status_badge';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';

export interface StepExecutionRowProps {
  stepExecution: WorkflowStepExecutionDto | undefined;
  stepId: string;
  stepType: string;
  depth: number;
  isExpanded: boolean;
  isExpandable: boolean;
  onToggle: () => void;
  expandedContent?: React.ReactNode;
  /** Number of direct child rows nested under this row (shown as a count badge). */
  childCount?: number;
  /**
   * Configured `retry.max-attempts` for this step's YAML definition (if any).
   * Surfaced as a small red retry badge after the name slot only when the
   * step is in a dangerous (failed/timed-out/cancelled) state — see Figma
   * https://www.figma.com/design/bVapoDOKB46hm0pSQXp9nA/?node-id=10735-23813.
   */
  maxAttempts?: number;
  /** 1-based run number shown before the step name (foreach iteration or retry attempt). */
  runNumber?: number;
}

const ROW_PADDING_X = 16;
const INDENT_PX = 32;

export const StepExecutionRow = React.memo<StepExecutionRowProps>(
  ({
    stepExecution,
    stepId,
    stepType,
    depth,
    isExpanded,
    isExpandable,
    onToggle,
    expandedContent,
    childCount,
    maxAttempts,
    runNumber,
  }) => {
    const styles = useMemoCss(componentStyles);
    const { euiTheme } = useEuiTheme();
    const status = stepExecution?.status as ExecutionStatus | undefined;
    const isDangerous = status ? isDangerousStatus(status) : false;
    const statusColors = status ? getExecutionStatusColors(euiTheme, status) : null;
    const indentPx = depth * INDENT_PX;

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isExpandable) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggle();
      }
    };

    return (
      <div
        css={[
          styles.rowWrapper,
          isExpanded && styles.rowWrapperExpanded,
          isDangerous && styles.rowWrapperDangerous,
        ]}
        data-test-subj="workflowExecutionStepRow"
        data-step-id={stepId}
      >
        {/* Vertical guides for nested rows: one thin line per ancestor depth, aligned with
            that ancestor's icon column. Rendered on the wrapper so they extend through
            the expanded body without breaking. */}
        {Array.from({ length: depth }).map((_, i) => (
          <div
            key={i}
            css={styles.rowGuide}
            style={{ left: ROW_PADDING_X + i * INDENT_PX + INDENT_PX / 2 }}
            aria-hidden
          />
        ))}
        <div
          role={isExpandable ? 'button' : undefined}
          tabIndex={isExpandable ? 0 : -1}
          onClick={isExpandable ? onToggle : undefined}
          onKeyDown={handleKeyDown}
          css={[styles.row, !isExpandable && styles.rowDisabled]}
          aria-expanded={isExpandable ? isExpanded : undefined}
        >
          <div css={styles.indentSpacer} style={{ width: indentPx }} aria-hidden />

          {/* On failure, replace the step type icon with the error icon entirely so
              the row has one strong status signal instead of competing icons. */}
          <div css={styles.typeIconSlot}>
            {status && isDangerousStatus(status) ? (
              getExecutionStatusIcon(euiTheme, status)
            ) : (
              <StepIcon stepType={stepType} executionStatus={status ?? null} />
            )}
          </div>

          <div css={styles.nameSlot}>
            {runNumber != null && (
              <EuiText size="s" css={styles.runNumber} aria-label={`run ${runNumber}`}>
                #{runNumber}
              </EuiText>
            )}
            <EuiText
              size="s"
              data-test-subj="workflowStepName"
              css={[
                styles.stepName,
                isDangerous &&
                  css({
                    color: statusColors?.color ?? euiTheme.colors.danger,
                  }),
              ]}
            >
              {stepId}
            </EuiText>
          </div>

          {/* Retry-on-failure badge: configured max-attempts from the YAML
              (either `step.retry` or `step['on-failure'].retry`). Always
              shown when configured — the badge represents the retry policy,
              not the current execution state. See Figma node 10735-23813. */}
          {maxAttempts != null ? (
            <div
              css={styles.retryBadge}
              data-test-subj="workflowStepRetryBadge"
              aria-label={i18n.translate('workflowsManagement.stepExecutionRow.retryBadgeAria', {
                defaultMessage: '{count, plural, one {# retry} other {# retries}} on failure',
                values: { count: maxAttempts },
              })}
            >
              <EuiIcon type="refresh" size="s" aria-hidden />
              <span>{maxAttempts}</span>
            </div>
          ) : null}

          {/* Right-side meta: child count and/or duration. Both can be present
              simultaneously for container steps that themselves took time to run. */}
          {(childCount != null && childCount > 0) || stepExecution?.executionTimeMs != null ? (
            <div css={styles.metaSlot}>
              {childCount != null && childCount > 0 ? (
                <span>
                  {i18n.translate('workflowsManagement.stepExecutionRow.childCount', {
                    defaultMessage: '{count, plural, one {# step} other {# steps}}',
                    values: { count: childCount },
                  })}
                </span>
              ) : null}
              {childCount != null && childCount > 0 && stepExecution?.executionTimeMs != null ? (
                <span css={styles.metaSeparator} aria-hidden>
                  {'·'}
                </span>
              ) : null}
              {stepExecution?.executionTimeMs != null ? (
                <span>{formatDuration(stepExecution.executionTimeMs)}</span>
              ) : null}
            </div>
          ) : null}

          <div css={styles.chevronSlot}>
            {isExpandable ? (
              <EuiIcon
                type="arrowDown"
                size="s"
                color="subdued"
                aria-hidden
                css={[styles.chevron, isExpanded && styles.chevronExpanded]}
              />
            ) : null}
          </div>
        </div>

        {/* Animated collapsible region: a CSS-grid track interpolates between 0fr and 1fr,
            which lets us transition smoothly between collapsed (0px) and the inner content
            height without measuring it manually. We only render this when there's actual
            content to show; container rows with no body would otherwise leave empty
            padded space below the row. */}
        {isExpandable && expandedContent ? (
          <div
            css={[styles.collapsible, isExpanded && styles.collapsibleOpen]}
            aria-hidden={!isExpanded}
          >
            <div css={[styles.collapsibleInner, isExpanded && styles.collapsibleInnerOpen]}>
              <div
                css={styles.expandedArea}
                style={{ paddingLeft: indentPx + ROW_PADDING_X + 8 /* flex gap */ }}
                data-test-subj="workflowStepExpandedContent"
              >
                {expandedContent}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
);
StepExecutionRow.displayName = 'StepExecutionRow';

// Shared motion vocabulary: one easing curve, three durations.
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
const DURATION = {
  fast: '160ms', // colors, hover backgrounds
  medium: '200ms', // transforms (chevron rotation), opacity
  slow: '240ms', // layout (height/expand)
} as const;
const ROW_TRANSITION = `background-color ${DURATION.fast} ${EASE}`;

const componentStyles = {
  // Single subtle horizontal separator between rows. We collapse it on the last row
  // via CSS so the bottom border doesn't double-up next to the panel border.
  rowWrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
      '&:last-of-type': {
        borderBottom: 'none',
      },
    }),
  // Expanded state: same neutral background as hover (no blue tint). The left accent
  // bar set by `rowExpanded` is the only colour cue separating it from a hover.
  rowWrapperExpanded: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
    }),
  rowWrapperDangerous: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: transparentize(euiTheme.colors.backgroundBaseDanger, 0.35),
    }),
  row: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: euiTheme.size.s,
      paddingLeft: ROW_PADDING_X,
      paddingRight: ROW_PADDING_X,
      minHeight: 48,
      cursor: 'pointer',
      userSelect: 'none',
      transition: ROW_TRANSITION,
      '&:hover': {
        backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
      },
      '&:focus-visible': {
        outline: 'none',
        backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
      },
    }),
  rowDisabled: () =>
    css({
      cursor: 'default',
      '&:hover': {
        backgroundColor: 'transparent',
      },
    }),
  // Vertical guide for nested rows: a subtle line aligned with the parent's icon
  // column, hinting at hierarchy without being noisy. Rendered above row/body
  // backgrounds via z-index so the guide is unbroken even when a row is hovered
  // or expanded (which paint a background colour).
  rowGuide: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 1,
      backgroundColor: euiTheme.colors.borderBaseSubdued,
      pointerEvents: 'none',
      zIndex: 1,
    }),
  indentSpacer: () =>
    css({
      flexShrink: 0,
    }),
  typeIconSlot: () =>
    css({
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
      width: 16,
    }),
  nameSlot: () =>
    css({
      flex: 1,
      minWidth: 0,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    }),
  stepName: ({ euiTheme }: UseEuiTheme) =>
    css({
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      color: euiTheme.colors.textParagraph,
      fontWeight: euiTheme.font.weight.regular,
    }),
  runNumber: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexShrink: 0,
      color: euiTheme.colors.textDisabled,
      fontWeight: euiTheme.font.weight.regular,
      fontSize: '11px',
    }),
  metaSlot: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'inline-flex',
      alignItems: 'center',
      gap: euiTheme.size.xs,
      flexShrink: 0,
      paddingLeft: euiTheme.size.s,
      color: euiTheme.colors.textSubdued,
      fontSize: '12px',
      fontVariantNumeric: 'tabular-nums',
    }),
  retryBadge: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'inline-flex',
      alignItems: 'center',
      gap: euiTheme.size.xs,
      flexShrink: 0,
      paddingLeft: euiTheme.size.s,
      paddingRight: euiTheme.size.s,
      paddingTop: 2,
      paddingBottom: 2,
      borderRadius: 999,
      backgroundColor: transparentize(euiTheme.colors.backgroundBaseDanger, 0.55),
      border: `1px solid ${transparentize(euiTheme.colors.danger, 0.7)}`,
      color: euiTheme.colors.danger,
      fontSize: '12px',
      fontWeight: euiTheme.font.weight.regular,
      lineHeight: 1,
      fontVariantNumeric: 'tabular-nums',
    }),
  metaSeparator: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textDisabled,
    }),
  chevronSlot: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      width: 24,
      height: 24,
      borderRadius: '50%',
      transition: `background-color ${DURATION.fast} ${EASE}`,
      color: euiTheme.colors.textSubdued,
      // Per-row hover already lights the background; brighten chevron container
      // when the parent row is hovered so the affordance is unambiguous.
      '[role="button"]:hover &': {
        backgroundColor: euiTheme.colors.backgroundBaseFormsControlDisabled,
        color: euiTheme.colors.textParagraph,
      },
    }),
  chevron: () =>
    css({
      transition: `transform ${DURATION.medium} ${EASE}`,
      transformOrigin: 'center',
    }),
  chevronExpanded: () =>
    css({
      transform: 'rotate(180deg)',
    }),
  // Animated collapsible: grid track interpolates 0fr ↔ 1fr to animate height
  // without measuring it manually. Inner opacity fades in/out alongside so the
  // content doesn't pop in at full intensity into a partially-revealed area.
  collapsible: () =>
    css({
      display: 'grid',
      gridTemplateRows: '0fr',
      transition: `grid-template-rows ${DURATION.slow} ${EASE}`,
    }),
  collapsibleOpen: () =>
    css({
      gridTemplateRows: '1fr',
    }),
  collapsibleInner: () =>
    css({
      overflow: 'hidden',
      opacity: 0,
      transition: `opacity ${DURATION.medium} ${EASE}`,
    }),
  collapsibleInnerOpen: () =>
    css({
      opacity: 1,
    }),
  expandedArea: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingTop: euiTheme.size.s,
      paddingBottom: euiTheme.size.m,
      paddingRight: ROW_PADDING_X,
    }),
};
