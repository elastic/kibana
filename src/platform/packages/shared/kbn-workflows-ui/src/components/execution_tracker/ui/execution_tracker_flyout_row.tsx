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
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import type { FC } from 'react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import {
  DISMISS_LABEL,
  OUTPUT_LABEL,
  UNKNOWN_WORKFLOW_LABEL,
  VIEW_EXECUTION_LABEL,
} from './translations';
import type { RenderOutputContent, TrackedExecution } from '../types';

interface ExecutionTrackerFlyoutRowProps {
  execution: TrackedExecution;
  onDismiss: (id: string) => void;
  isLast: boolean;
  renderOutputContent?: RenderOutputContent;
}

const statusToColor = (status: ExecutionStatus): string => {
  switch (status) {
    case ExecutionStatus.COMPLETED:
      return 'success';
    case ExecutionStatus.FAILED:
    case ExecutionStatus.TIMED_OUT:
    case ExecutionStatus.CANCELLED:
      return 'danger';
    default:
      return 'primary';
  }
};

const statusToLabel = (status: ExecutionStatus): string => {
  switch (status) {
    case ExecutionStatus.COMPLETED:
      return 'Completed';
    case ExecutionStatus.FAILED:
      return 'Failed';
    case ExecutionStatus.TIMED_OUT:
      return 'Timed out';
    case ExecutionStatus.CANCELLED:
      return 'Cancelled';
    case ExecutionStatus.RUNNING:
      return 'Running';
    case ExecutionStatus.PENDING:
      return 'Pending';
    case ExecutionStatus.WAITING:
    case ExecutionStatus.WAITING_FOR_INPUT:
      return 'Waiting';
    default:
      return status;
  }
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const ExecutionTrackerFlyoutRow: FC<ExecutionTrackerFlyoutRowProps> = ({
  execution,
  onDismiss,
  isLast,
  renderOutputContent,
}) => {
  const { application } = useKibana<{ application: ApplicationStart }>().services;
  const isTerminal = isTerminalStatus(execution.status);
  const color = statusToColor(execution.status);

  const handleDismiss = useCallback(() => {
    onDismiss(execution.id);
  }, [onDismiss, execution.id]);

  const timeLabel = useMemo(() => formatTime(execution.addedAt), [execution.addedAt]);

  const executionHref = useMemo(() => {
    if (!execution.workflowId) return undefined;
    return application?.getUrlForApp('workflows', {
      path: `/${execution.workflowId}?tab=executions&executionId=${execution.id}`,
    });
  }, [application, execution.workflowId, execution.id]);

  const inputDescriptionList = useMemo(() => {
    if (!execution.inputSummary || execution.inputSummary.length === 0) return null;
    return execution.inputSummary.map((entry) => ({
      title: entry.label,
      description: entry.value,
    }));
  }, [execution.inputSummary]);

  const outputDescriptionList = useMemo(() => {
    if (!execution.output || Object.keys(execution.output).length === 0) return null;
    return Object.entries(execution.output).map(([key, value]) => ({
      title: key,
      description: typeof value === 'string' ? value : JSON.stringify(value),
    }));
  }, [execution.output]);

  return (
    <>
      <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          {!isTerminal ? <EuiLoadingSpinner size="m" /> : <EuiHealth color={color} />}
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
            justifyContent="spaceBetween"
          >
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{execution.workflowName ?? UNKNOWN_WORKFLOW_LABEL}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color={color}>
                {statusToLabel(execution.status)}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiText size="xs" color="subdued">
            {timeLabel}
          </EuiText>

          {inputDescriptionList && (
            <EuiText size="xs" color="subdued">
              {inputDescriptionList.map((item) => `${item.title}: ${item.description}`).join(', ')}
            </EuiText>
          )}

          {renderOutputContent?.(execution) ??
            (outputDescriptionList ? (
              <>
                <EuiSpacer size="s" />
                <EuiText size="xs" color="subdued">
                  <strong>{OUTPUT_LABEL}</strong>
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiDescriptionList
                  type="column"
                  compressed
                  listItems={outputDescriptionList}
                  columnWidths={[1, 2]}
                />
              </>
            ) : null)}

          {execution.error && (
            <>
              <EuiSpacer size="xs" />
              <EuiText size="xs" color="danger">
                {execution.error}
              </EuiText>
            </>
          )}

          {executionHref && (
            <>
              <EuiSpacer size="xs" />
              <EuiLink href={executionHref} target="_blank" external={false}>
                <EuiText size="xs">{VIEW_EXECUTION_LABEL}</EuiText>
              </EuiLink>
            </>
          )}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiToolTip content={DISMISS_LABEL}>
            <EuiButtonIcon
              iconType="cross"
              aria-label={DISMISS_LABEL}
              color="text"
              size="xs"
              onClick={handleDismiss}
              disabled={!isTerminal}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      {!isLast && <EuiHorizontalRule margin="s" />}
    </>
  );
};
