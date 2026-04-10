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
import React, { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { FC } from 'react';
import { ExecutionTrackerFlyoutRow } from './execution_tracker_flyout_row';
import {
  DISMISS_ALL_COMPLETED_LABEL,
  EXECUTION_TRACKER_TITLE,
  NO_ACTIVE_EXECUTIONS_LABEL,
} from './translations';
import type { ExecutionTrackerService } from '../execution_tracker_service';

interface ExecutionTrackerFlyoutProps {
  service: ExecutionTrackerService;
}

export const ExecutionTrackerFlyout: FC<ExecutionTrackerFlyoutProps> = ({ service }) => {
  const subscribe = useCallback(
    (cb: () => void) => {
      const sub = service.state$.subscribe(cb);
      return () => sub.unsubscribe();
    },
    [service]
  );
  const getSnapshot = useCallback(() => service.state$.getValue(), [service]);
  const state = useSyncExternalStore(subscribe, getSnapshot);

  const { executions, counts } = state;
  const renderOutputContent = service.getRenderOutputContent();

  const closeFlyout = useCallback(() => {
    service.setFlyoutOpen(false);
  }, [service]);

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
              onDismiss={service.dismissExecution}
              isLast={index === sortedExecutions.length - 1}
              renderOutputContent={renderOutputContent}
              application={service.application}
            />
          ))
        )}
      </EuiFlyoutBody>

      {hasTerminal && (
        <EuiFlyoutFooter>
          <EuiButton size="s" onClick={service.dismissAllCompleted}>
            {DISMISS_ALL_COMPLETED_LABEL}
          </EuiButton>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
};
