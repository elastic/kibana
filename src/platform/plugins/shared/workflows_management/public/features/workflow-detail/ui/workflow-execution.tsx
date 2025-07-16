/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiToolTip,
} from '@elastic/eui';
import { ExecutionStatus, EsWorkflowStepExecution } from '@kbn/workflows';
import { useWorkflowExecution } from '../../../entities/workflows/model/useWorkflowExecution';
import { StatusBadge } from '../../../shared/ui/status_badge';

interface WorkflowExecutionProps {
  workflowExecutionId: string;
  fields?: Array<keyof EsWorkflowStepExecution>;
}

export const WorkflowExecution: React.FC<WorkflowExecutionProps> = ({
  workflowExecutionId,
  fields = ['stepId', 'workflowId', 'status', 'executionTimeMs'],
}) => {
  const {
    data: workflowExecution,
    isLoading,
    error,
    refetch,
  } = useWorkflowExecution(workflowExecutionId);

  const columns = useMemo<Array<EuiBasicTableColumn<EsWorkflowStepExecution>>>(
    () =>
      [
        {
          field: 'stepId',
          name: 'Step ID',
        },
        {
          field: 'workflowId',
          name: 'Workflow ID',
        },
        {
          field: 'status',
          name: 'Status',
          render: (value: ExecutionStatus, item: WorkflowStepExecution) => {
            if (value === ExecutionStatus.FAILED) {
              return (
                <EuiToolTip content={item.error}>
                  <StatusBadge status={value} />
                </EuiToolTip>
              );
            }

            return <StatusBadge status={value} />;
          },
        },
        {
          field: 'executionTimeMs',
          name: 'Execution Time (ms)',
        },
        {
          field: 'error',
          name: 'Error',
        },
      ].filter((field) => fields.includes(field.field as keyof EsWorkflowStepExecution)),
    [fields]
  );

  useEffect(() => {
    if (!workflowExecution) {
      return;
    }

    const intervalId = setInterval(() => {
      if (workflowExecution.status === ExecutionStatus.RUNNING) {
        refetch();
        return;
      }

      clearInterval(intervalId);
    }, 500); // Refresh every 500ms

    return () => clearInterval(intervalId);
  }, [workflowExecution, refetch]);

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent={'center'} alignItems={'center'}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>Loading workflows...</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error) {
    return <EuiText>Error loading workflow execution</EuiText>;
  }

  return (
    <div>
      <EuiText>
        <h3>Workflow Execution Details</h3>
        {workflowExecution?.status && (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <strong>Status:</strong>
            <StatusBadge status={workflowExecution?.status} />
          </EuiFlexGroup>
        )}
        {workflowExecution?.startedAt && (
          <div>
            <strong>Started At:</strong>
            {workflowExecution?.startedAt?.toLocaleString()}
          </div>
        )}
        {workflowExecution?.finishedAt && (
          <div>
            <strong>Finished At:</strong> {workflowExecution?.finishedAt?.toLocaleString()}
          </div>
        )}
        {workflowExecution?.duration !== undefined && (
          <div>
            <strong>Duration:</strong> {workflowExecution?.duration} ms
          </div>
        )}
      </EuiText>
      <EuiBasicTable
        columns={columns}
        items={workflowExecution?.stepExecutions ?? []}
        responsiveBreakpoint={false}
      />
    </div>
  );
};
