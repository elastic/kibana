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
  EuiEmptyPrompt,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import type { FC } from 'react';
import { ExecutionTrackerFlyoutRow } from './execution_tracker_flyout_row';
import {
  DISMISS_ALL_COMPLETED_LABEL,
  EXECUTION_TRACKER_TITLE,
  NO_ACTIVE_EXECUTIONS_LABEL,
} from './translations';
import { useExecutionTracker } from '../model/execution_tracker_context';

export const ExecutionTrackerFlyout: FC = () => {
  const {
    executions,
    dismissExecution,
    dismissAllCompleted,
    setFlyoutOpen,
    counts,
    renderOutputContent,
  } = useExecutionTracker();

  const closeFlyout = useCallback(() => {
    setFlyoutOpen(false);
  }, [setFlyoutOpen]);

  const sortedExecutions = useMemo(
    () => [...executions].sort((a, b) => b.addedAt - a.addedAt),
    [executions]
  );

  const hasTerminal = counts.completed > 0 || counts.failed > 0;

  return (
    <EuiFlyout onClose={closeFlyout} size="s" ownFocus={false}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{EXECUTION_TRACKER_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {sortedExecutions.length === 0 ? (
          <EuiEmptyPrompt
            iconType="checkInCircleFilled"
            title={<h3>{NO_ACTIVE_EXECUTIONS_LABEL}</h3>}
            titleSize="xs"
          />
        ) : (
          sortedExecutions.map((execution, index) => (
            <ExecutionTrackerFlyoutRow
              key={execution.id}
              execution={execution}
              onDismiss={dismissExecution}
              isLast={index === sortedExecutions.length - 1}
              renderOutputContent={renderOutputContent}
            />
          ))
        )}
      </EuiFlyoutBody>

      {hasTerminal && (
        <EuiFlyoutFooter>
          <EuiButton size="s" onClick={dismissAllCompleted}>
            {DISMISS_ALL_COMPLETED_LABEL}
          </EuiButton>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
};
