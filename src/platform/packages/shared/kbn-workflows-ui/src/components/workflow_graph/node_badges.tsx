/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiIcon, EuiLoadingSpinner, EuiToolTip, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { NodeConfigWarningReason } from './workflow_graph_actions_context';

/**
 * Compact warning-family badge for retry / continue-on-failure posture.
 *
 * Color is warning/yellow only — never danger/red. Retry and continue-on-failure
 * are *configured behaviour, not a failure state*; red is reserved for error
 * paths and run failures, and using it here would make correctly-configured
 * steps look broken on an idle canvas.
 *
 * Always visible at rest (not tied to node hover) — posture should read
 * without requiring interaction.
 */
export function NodeFailureBadge({
  maxAttempts,
  delay,
  continuesOnFailure,
}: {
  maxAttempts: number | undefined;
  delay: string | undefined;
  continuesOnFailure: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  if (maxAttempts == null && !continuesOnFailure) return null;

  let tooltip: string;
  if (maxAttempts != null && continuesOnFailure) {
    tooltip = i18n.translate('workflowsUi.graphNode.failureBadge.retryAndContinueTooltip', {
      defaultMessage:
        'Retries {count}× ({delay} delay), then the workflow continues if it still fails',
      values: { count: maxAttempts, delay: delay ?? '5s' },
    });
  } else if (maxAttempts != null) {
    tooltip = i18n.translate('workflowsUi.graphNode.failureBadge.retryTooltip', {
      defaultMessage: 'Retries {count}× ({delay} delay), then the workflow stops if it still fails',
      values: { count: maxAttempts, delay: delay ?? '5s' },
    });
  } else {
    tooltip = i18n.translate('workflowsUi.graphNode.failureBadge.continueTooltip', {
      defaultMessage: 'The workflow continues if this step fails',
    });
  }

  const isContinueOnly = maxAttempts == null && continuesOnFailure;

  return (
    <EuiToolTip content={tooltip}>
      <EuiBadge
        color="warning"
        // Continue-only: put the icon in children (not iconType) so we keep the
        // default badge padding / text inset — iconOnly uses tighter xs padding
        // and reads as a cramped square next to retry pills.
        iconType={isContinueOnly ? undefined : 'refresh'}
        tabIndex={0}
        aria-label={tooltip}
        data-test-subj="workflowGraphNodeFailureBadge"
        css={{
          flex: '0 0 auto',
          cursor: 'default',
          '&:focus-visible': { outline: `2px solid ${euiTheme.colors.primary}` },
        }}
      >
        {isContinueOnly ? (
          <EuiIcon type="sortRight" size="s" aria-hidden />
        ) : (
          <>
            {maxAttempts != null ? (
              <span data-test-subj="workflowGraphNodeFailureBadgeAttempts">{maxAttempts}</span>
            ) : null}
            {maxAttempts != null && continuesOnFailure ? (
              <>
                <span
                  aria-hidden
                  css={{
                    display: 'inline-block',
                    width: 1,
                    height: 10,
                    background: euiTheme.colors.borderBaseWarning,
                    marginInline: 4,
                    verticalAlign: 'middle',
                  }}
                />
                <EuiIcon
                  type="sortRight"
                  size="s"
                  aria-label={i18n.translate('workflowsUi.graphNode.failureBadge.continueGlyph', {
                    defaultMessage: 'Continue on failure',
                  })}
                />
              </>
            ) : null}
          </>
        )}
      </EuiBadge>
    </EuiToolTip>
  );
}

export function NodeStatusIcon({
  isRunning,
  isSuccess,
  successColor,
  failColor,
}: {
  isRunning: boolean;
  isSuccess: boolean;
  successColor: string;
  failColor: string;
}) {
  return (
    <div
      css={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 16,
        height: 16,
        flex: '0 0 auto',
      }}
      aria-label={
        isRunning
          ? i18n.translate('workflowsUi.graphNode.statusRunning', { defaultMessage: 'Running' })
          : isSuccess
          ? i18n.translate('workflowsUi.graphNode.statusSuccess', {
              defaultMessage: 'Completed successfully',
            })
          : i18n.translate('workflowsUi.graphNode.statusFailed', { defaultMessage: 'Failed' })
      }
    >
      {isRunning ? (
        <EuiLoadingSpinner size="m" />
      ) : isSuccess ? (
        <EuiIcon type="checkCircleFill" color={successColor} size="m" aria-hidden={true} />
      ) : (
        <EuiIcon type="errorFill" color={failColor} size="m" aria-hidden={true} />
      )}
    </div>
  );
}

function nodeConfigWarningMessage(reason: NodeConfigWarningReason): string {
  switch (reason) {
    case 'misconfigured':
      return i18n.translate('workflowsUi.graphNode.misconfiguredTooltip', {
        defaultMessage: 'Misconfigured — some fields have invalid values',
      });
    case 'both':
      return i18n.translate('workflowsUi.graphNode.incompleteAndMisconfiguredTooltip', {
        defaultMessage: 'Incomplete — required fields are missing or invalid',
      });
    case 'incomplete':
    default:
      return i18n.translate('workflowsUi.graphNode.incompleteTooltip', {
        defaultMessage: 'Incomplete — required fields are missing',
      });
  }
}

export function NodeConfigWarningIndicator({
  reason,
}: {
  readonly reason: NodeConfigWarningReason;
}) {
  const { euiTheme } = useEuiTheme();
  const message = nodeConfigWarningMessage(reason);
  return (
    <EuiToolTip
      content={message}
      position="top"
      display="inlineBlock"
      disableScreenReaderOutput
      // Position the tooltip *anchor* on the corner — not an absolutely
      // positioned child inside a collapsed in-flow wrapper (that left the
      // tooltip caret floating over the label / play controls).
      anchorProps={{
        css: {
          position: 'absolute',
          top: 0,
          right: 0,
          zIndex: 2,
          lineHeight: 0,
          transform: 'translate(50%, -50%)',
        },
      }}
    >
      <span
        tabIndex={0}
        role="img"
        aria-label={message}
        data-test-subj="workflowGraphNodeIncomplete"
        css={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 0,
          '&:focus-visible': { outline: `2px solid ${euiTheme.colors.primary}` },
        }}
      >
        <EuiIcon type="warningFill" size="m" color={euiTheme.colors.textWarning} aria-hidden />
      </span>
    </EuiToolTip>
  );
}
