/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiBadge,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiIcon,
  formatDate,
} from '@elastic/eui';
import {
  useWorkflowExecutionLogs,
  type WorkflowExecutionLogEntry,
} from '../../../entities/workflows/api/use_workflow_execution_logs';

interface WorkflowExecutionLogsTableProps {
  executionId: string;
}

export const WorkflowExecutionLogsTable: React.FC<WorkflowExecutionLogsTableProps> = ({
  executionId,
}) => {
  const {
    data: logsData,
    isLoading,
    error,
    refetch,
  } = useWorkflowExecutionLogs({
    executionId,
    limit: 100, // Get more logs without pagination
    offset: 0,
    enabled: true,
  });

  const columns: Array<EuiBasicTableColumn<WorkflowExecutionLogEntry>> = useMemo(
    () => [
      {
        field: 'timestamp',
        name: 'Timestamp',
        width: '20%',
        render: (timestamp: string | undefined) => {
          if (!timestamp) return 'N/A';
          const date = new Date(timestamp);
          const formatted = formatDate(date, 'longDateTime');
          const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
          return `${formatted}.${milliseconds}`;
        },
      },
      {
        field: 'level',
        name: 'Level',
        width: '10%',
        render: (level: WorkflowExecutionLogEntry['level']) => {
          const colorMap = {
            info: 'primary',
            debug: 'default',
            warn: 'warning',
            error: 'danger',
          } as const;

          if (!level) {
            return <EuiBadge color="default">UNKNOWN</EuiBadge>;
          }

          return <EuiBadge color={colorMap[level]}>{level.toUpperCase()}</EuiBadge>;
        },
      },
      {
        field: 'stepName',
        name: 'Step',
        width: '15%',
        render: (stepName: string | undefined, log: WorkflowExecutionLogEntry) => {
          const displayName = stepName || log.stepId || 'Workflow';
          const icon = stepName || log.stepId ? 'node' : 'workflow';

          return (
            <EuiBadge color="hollow">
              <EuiIcon type={icon} size="s" /> {displayName}
            </EuiBadge>
          );
        },
      },
      {
        field: 'connectorType',
        name: 'Connector Type',
        width: '15%',
        render: (connectorType: string | undefined) => connectorType || 'N/A',
      },
      {
        field: 'message',
        name: 'Message',
        width: '40%',
        render: (message: string | undefined) => message || 'N/A',
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '200px' }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        title={<h3>Error loading execution logs</h3>}
        body={<p>Failed to load workflow execution logs. Please try again.</p>}
        actions={[<button onClick={() => refetch()}>Retry</button>]}
      />
    );
  }

  if (!logsData?.logs || logsData.logs.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="documents"
        title={<h3>No logs available</h3>}
        body={<p>No logs have been generated for this workflow execution yet.</p>}
      />
    );
  }

  return (
    <div>
      <EuiTitle size="xs">
        <h3>Execution Logs</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiBasicTable columns={columns} items={logsData.logs} responsiveBreakpoint={false} />
    </div>
  );
};
