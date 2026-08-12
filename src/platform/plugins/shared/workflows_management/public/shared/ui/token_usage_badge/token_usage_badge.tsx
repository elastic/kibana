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
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowTokenUsage } from '@kbn/workflows';

interface TokenUsageBadgeProps {
  usage?: WorkflowTokenUsage;
  /**
   * When true, render only the compact total (e.g. `25K`) without the
   * " tokens" suffix. Use in tight layouts like the step execution tree.
   */
  compact?: boolean;
  /** When > 1, popover shows "{n} model calls" instead of model footer. */
  callCount?: number;
  model?: string;
  connectorName?: string;
  'data-test-subj'?: string;
}

const compactNumberFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const fullNumberFormatter = new Intl.NumberFormat();

const percentOf = (part: number, total: number): string => {
  if (total <= 0) return '0%';
  return `${Math.round((part / total) * 100)}%`;
};

/**
 * Compact badge showing total LLM token usage. Hover/focus opens a popover
 * with input/output breakdown and an optional model · connector footer.
 * Renders `null` when no usage is reported.
 */
export const TokenUsageBadge = React.memo<TokenUsageBadgeProps>(
  ({
    usage,
    compact = false,
    callCount,
    model,
    connectorName,
    'data-test-subj': dataTestSubj = 'workflowTokenUsageBadge',
  }) => {
    const { euiTheme } = useEuiTheme();
    const [isOpen, setIsOpen] = useState(false);

    if (!usage) {
      return null;
    }

    const total = compactNumberFormatter.format(usage.totalTokens);
    const label = compact
      ? total
      : i18n.translate('workflowsManagement.tokenUsage.totalBadge', {
          defaultMessage: '{total} tokens',
          values: { total },
        });

    const hasSplit = usage.inputTokens > 0 || usage.outputTokens > 0;
    const ariaLabel = i18n.translate('workflowsManagement.tokenUsage.ariaLabel', {
      defaultMessage: 'AI token usage: {total} total',
      values: { total: fullNumberFormatter.format(usage.totalTokens) },
    });

    const inputPct = percentOf(usage.inputTokens, usage.totalTokens);
    const outputPct = percentOf(usage.outputTokens, usage.totalTokens);
    const footerParts = [model, connectorName].filter(Boolean);
    const showCalls = callCount != null && callCount > 1;

    return (
      <EuiPopover
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        ownFocus={false}
        anchorPosition="downCenter"
        panelPaddingSize="s"
        button={
          <EuiBadge
            color="hollow"
            iconType="sparkles"
            title=""
            tabIndex={0}
            aria-label={ariaLabel}
            data-test-subj={dataTestSubj}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
            css={{ cursor: 'default' }}
          >
            {label}
          </EuiBadge>
        }
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div css={{ minWidth: 180 }} data-test-subj={`${dataTestSubj}-popover`}>
          {hasSplit && (
            <>
              <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    {i18n.translate('workflowsManagement.tokenUsage.inputRow', {
                      defaultMessage: 'Input tokens',
                    })}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    {fullNumberFormatter.format(usage.inputTokens)} ({inputPct})
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    {i18n.translate('workflowsManagement.tokenUsage.outputRow', {
                      defaultMessage: 'Output tokens',
                    })}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    {fullNumberFormatter.format(usage.outputTokens)} ({outputPct})
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <strong>
                  {i18n.translate('workflowsManagement.tokenUsage.totalRow', {
                    defaultMessage: 'Total',
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <strong>{fullNumberFormatter.format(usage.totalTokens)}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          {hasSplit && usage.totalTokens > 0 && (
            <div
              aria-hidden="true"
              css={{
                display: 'flex',
                height: 4,
                borderRadius: 2,
                overflow: 'hidden',
                marginTop: euiTheme.size.xs,
                background: euiTheme.colors.backgroundBaseSubdued,
              }}
            >
              <div
                css={{
                  width: inputPct,
                  background: euiTheme.colors.backgroundFilledText,
                }}
              />
              <div
                css={{
                  width: outputPct,
                  background: euiTheme.colors.borderBaseSubdued,
                }}
              />
            </div>
          )}
          {showCalls ? (
            <EuiText size="xs" color="subdued" css={{ marginTop: euiTheme.size.xs }}>
              {i18n.translate('workflowsManagement.tokenUsage.modelCalls', {
                defaultMessage: '{count} model calls',
                values: { count: callCount },
              })}
            </EuiText>
          ) : (
            footerParts.length > 0 && (
              <EuiText
                size="xs"
                color="subdued"
                css={{
                  marginTop: euiTheme.size.xs,
                  fontFamily: euiTheme.font.familyCode,
                }}
              >
                {footerParts.join(' · ')}
              </EuiText>
            )
          )}
        </div>
      </EuiPopover>
    );
  }
);

TokenUsageBadge.displayName = 'TokenUsageBadge';
