/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowTokenUsage } from '@kbn/workflows';
import { TokenUsageBreakdown } from './token_usage_breakdown';

interface TokenUsageBadgeProps {
  usage?: WorkflowTokenUsage;
  /**
   * When true, render only the compact total (e.g. `25K`) without the
   * " tokens" suffix. Use in tight layouts like the step execution tree.
   */
  compact?: boolean;
  /** When > 1, breakdown footer shows "{n} model calls" instead of model line. */
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

/**
 * Compact badge showing total LLM token usage. Hover/focus opens a popover
 * with the shared TokenUsageBreakdown. Renders `null` when no usage is reported.
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
    const [isOpen, setIsOpen] = useState(false);

    if (!usage || usage.totalTokens <= 0) {
      return null;
    }

    const total = compactNumberFormatter.format(usage.totalTokens);
    const label = compact
      ? total
      : i18n.translate('workflowsManagement.tokenUsage.totalBadge', {
          defaultMessage: '{total} tokens',
          values: { total },
        });

    const ariaLabel = i18n.translate('workflowsManagement.tokenUsage.ariaLabel', {
      defaultMessage: 'AI token usage: {total} total',
      values: { total: fullNumberFormatter.format(usage.totalTokens) },
    });

    return (
      <EuiPopover
        aria-label={ariaLabel}
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
        <div data-test-subj={`${dataTestSubj}-popover`}>
          <TokenUsageBreakdown
            usage={usage}
            callCount={callCount}
            model={model}
            connectorName={connectorName}
            data-test-subj="workflowTokenUsageBreakdown"
          />
        </div>
      </EuiPopover>
    );
  }
);

TokenUsageBadge.displayName = 'TokenUsageBadge';
