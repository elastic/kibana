/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { SerializedError } from '@kbn/workflows';

interface FailedStepErrorPanelProps {
  error: SerializedError | string;
  stepType?: string;
  onViewInput: () => void;
  defaultExpanded?: boolean;
}

export const FailedStepErrorPanel = React.memo<FailedStepErrorPanelProps>(
  ({ error, stepType, onViewInput, defaultExpanded = true }) => {
    const { euiTheme } = useEuiTheme();
    const [isOpen, setIsOpen] = useState(defaultExpanded);

    const message = typeof error === 'string' ? error : error.message;
    const copyText =
      typeof error === 'string' ? error : JSON.stringify(error, null, 2);

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
        css={{
          marginTop: euiTheme.size.xs,
          padding: euiTheme.size.s,
          borderTop: `1px solid ${euiTheme.colors.borderBaseDanger}`,
        }}
        data-test-subj="workflowFailedStepErrorPanel"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType={isOpen ? 'arrowDown' : 'arrowRight'}
              size="xs"
              color="danger"
              aria-label={i18n.translate('workflows.executionFlyout.failedStep.toggle', {
                defaultMessage: 'Why this step failed',
              })}
              onClick={() => setIsOpen((v) => !v)}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="danger" css={{ fontWeight: 600 }}>
              {i18n.translate('workflows.executionFlyout.failedStep.heading', {
                defaultMessage: 'Why this step failed',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        {isOpen && (
          <>
            <EuiText size="xs" color="danger" css={{ marginTop: euiTheme.size.xs }}>
              <p>{message}</p>
            </EuiText>
            <EuiFlexGroup gutterSize="s" responsive={false} css={{ marginTop: euiTheme.size.s }}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty size="xs" color="danger" onClick={onViewInput}>
                  {viewInputLabel}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={copyText}>
                  {(copy) => (
                    <EuiButtonEmpty size="xs" color="danger" onClick={copy}>
                      {i18n.translate('workflows.executionFlyout.failedStep.copyError', {
                        defaultMessage: 'Copy error',
                      })}
                    </EuiButtonEmpty>
                  )}
                </EuiCopy>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </div>
    );
  }
);

FailedStepErrorPanel.displayName = 'FailedStepErrorPanel';
