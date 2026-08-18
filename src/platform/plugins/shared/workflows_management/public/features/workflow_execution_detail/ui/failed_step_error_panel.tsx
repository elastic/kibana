/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { SerializedError } from '@kbn/workflows';

interface FailedStepErrorPanelProps {
  error: SerializedError | string;
  stepType?: string;
  onViewInput: () => void;
  /** Accessible name for the error region (visually hidden). */
  ariaLabel: string;
  /**
   * When set, replaces the raw error body (e.g. retry exhaustion lead-in that
   * already includes the last error message).
   */
  messageOverride?: string;
}

/**
 * Inline error details under a failed row. Message-first; no visible heading.
 */
export const FailedStepErrorPanel = React.memo<FailedStepErrorPanelProps>(
  ({ error, stepType, onViewInput, ariaLabel, messageOverride }) => {
    const { euiTheme } = useEuiTheme();

    const message = messageOverride ?? (typeof error === 'string' ? error : error.message);
    const copyText = typeof error === 'string' ? error : JSON.stringify(error, null, 2);

    const isHttpStep = stepType?.startsWith('http') ?? false;
    const viewInputLabel = isHttpStep
      ? i18n.translate('workflows.executionFlyout.failedStep.viewRequest', {
          defaultMessage: 'View request',
        })
      : i18n.translate('workflows.executionFlyout.failedStep.viewInput', {
          defaultMessage: 'View input',
        });

    return (
      <div
        role="region"
        aria-label={ariaLabel}
        data-test-subj="workflowFailedStepErrorPanel"
        css={{
          marginTop: euiTheme.size.xs,
          padding: euiTheme.size.s,
          borderTop: `1px solid ${euiTheme.colors.borderBaseDanger}`,
        }}
      >
        {/* Capture bubbling row clicks without making the region itself a click target. */}
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <EuiText size="xs" color="danger" data-test-subj="workflowFailedStepErrorMessage">
            <p>{message}</p>
          </EuiText>
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            responsive={false}
            css={{ marginTop: euiTheme.size.s }}
          >
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color="danger"
                fill={false}
                onClick={onViewInput}
                data-test-subj="workflowFailedStepViewInput"
              >
                {viewInputLabel}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={copyText}>
                {(copy) => (
                  <EuiButtonEmpty
                    size="s"
                    color="danger"
                    onClick={copy}
                    data-test-subj="workflowFailedStepCopyError"
                  >
                    {i18n.translate('workflows.executionFlyout.failedStep.copyError', {
                      defaultMessage: 'Copy error',
                    })}
                  </EuiButtonEmpty>
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    );
  }
);

FailedStepErrorPanel.displayName = 'FailedStepErrorPanel';
