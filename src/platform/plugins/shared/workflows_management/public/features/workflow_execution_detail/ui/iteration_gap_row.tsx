/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowTokenUsage } from '@kbn/workflows';
import {
  TREE_ROW_CHEVRON_SLOT_PX,
  TREE_ROW_GAP_SIZE,
  TREE_ROW_PADDING_X_SIZE,
  TREE_ROW_PADDING_Y_PX,
} from './step_execution_tree_row';
import { formatDuration } from '../../../shared/lib/format_duration';
import { TokenUsageBadge } from '../../../shared/ui/token_usage_badge/token_usage_badge';

export interface IterationGapRowProps {
  from: number;
  to: number;
  count: number;
  isExpanded: boolean;
  executionTimeMs?: number | null;
  usage?: WorkflowTokenUsage;
  usageCallCount?: number;
  onToggle: () => void;
  'data-test-subj'?: string;
}

/**
 * Link-style gap control that reveals or hides a contiguous unpinned iteration range.
 * Sits inside the foreach indent guide; not a tree node (no chevron, no hover fill).
 */
export const IterationGapRow = React.memo<IterationGapRowProps>(
  ({
    from,
    to,
    count,
    isExpanded,
    executionTimeMs = null,
    usage,
    usageCallCount,
    onToggle,
    'data-test-subj': dataTestSubj = 'workflowStepExecutionTreeIterationGap',
  }) => {
    const { euiTheme } = useEuiTheme();

    const label = isExpanded
      ? i18n.translate('workflows.WorkflowStepExecutionTree.hideIterationGap', {
          defaultMessage: 'Hide iterations #{from}–#{to}',
          values: { from, to },
        })
      : i18n.translate('workflows.WorkflowStepExecutionTree.showIterationGap', {
          defaultMessage: 'Show {count} more iterations',
          values: { count },
        });

    const rangeLabel = i18n.translate('workflows.WorkflowStepExecutionTree.iterationGapRange', {
      defaultMessage: '#{from}–#{to}',
      values: { from, to },
    });

    const durationLabel =
      executionTimeMs != null && Number.isFinite(executionTimeMs) && executionTimeMs >= 0
        ? formatDuration(executionTimeMs)
        : null;

    const activate = () => {
      onToggle();
    };

    return (
      <div
        data-test-subj={dataTestSubj}
        data-gap-from={from}
        data-gap-to={to}
        data-gap-expanded={isExpanded ? 'true' : 'false'}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          activate();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            activate();
          }
        }}
        css={css`
          width: 100%;
          min-width: 0;
          cursor: pointer;
          border-radius: ${euiTheme.border.radius.medium};
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
            data-test-subj="workflowStepTreeGapEllipsisSlot"
          >
            <EuiIcon type="ellipsis" size="s" color="subdued" aria-hidden="true" />
          </EuiFlexItem>

          <EuiFlexItem grow={true} css={{ minWidth: 0 }}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="none"
              responsive={false}
              wrap={false}
              css={css`
                gap: 0;
                min-width: 0;
              `}
            >
              <EuiFlexItem grow={false} css={{ minWidth: 0, maxWidth: '100%' }}>
                <EuiText
                  size="s"
                  css={css`
                    color: ${euiTheme.colors.textPrimary};
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    &:hover {
                      text-decoration: underline;
                    }
                  `}
                  data-test-subj="workflowStepTreeGapLabel"
                >
                  {label}
                </EuiText>
              </EuiFlexItem>
              {/* Range sits beside the action label, same left cluster as · latest on step rows. */}
              {!isExpanded && (
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="xs"
                    color="subdued"
                    data-test-subj="workflowStepTreeGapRange"
                    css={css`
                      flex-shrink: 0;
                      line-height: 1;
                      white-space: pre;
                    `}
                  >
                    {` · ${rangeLabel}`}
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>

          {!isExpanded && (usage?.totalTokens || durationLabel != null) ? (
            <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
              <EuiFlexGroup
                alignItems="center"
                gutterSize="none"
                responsive={false}
                wrap={false}
                css={css`
                  gap: ${euiTheme.size[TREE_ROW_GAP_SIZE]};
                  flex-shrink: 0;
                `}
                data-test-subj="workflowStepTreeGapMeta"
              >
                {usage && usage.totalTokens > 0 && (
                  <EuiFlexItem grow={false}>
                    <TokenUsageBadge
                      usage={usage}
                      compact
                      callCount={usageCallCount}
                      data-test-subj="workflowStepTreeGapTokenUsage"
                    />
                  </EuiFlexItem>
                )}
                {durationLabel != null && (
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued" data-test-subj="workflowStepTreeGapDuration">
                      {durationLabel}
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </div>
    );
  }
);

IterationGapRow.displayName = 'IterationGapRow';
