/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiBasicTable,
  EuiBasicTableColumn,
} from '@elastic/eui';
import { ExecutionStatus, WorkflowExecutionModel } from '@kbn/workflows';
interface WorkflowExecutionProps {
  workflowExecutionId: string;
}

export function useWorkflowExecution(workflowExecutionId: string | null) {
  const { http } = useKibana().services;

  const queryResult = useQuery<WorkflowExecutionModel>({
    queryKey: ['stepExecutions', workflowExecutionId],
    queryFn: () => http!.get(`/api/workflowExecution/${workflowExecutionId}`),
    enabled: workflowExecutionId !== null,
  });

  const queryClient = useQueryClient();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['stepExecutions', workflowExecutionId] });
  };

  return {
    ...queryResult,
    refresh,
  };
}

export const WorkflowExecution: React.FC<WorkflowExecutionProps> = ({ workflowExecutionId }) => {
  const {
    data: workflowExecution,
    isLoading,
    error,
    refresh,
  } = useWorkflowExecution(workflowExecutionId);

  const columns = useMemo<Array<EuiBasicTableColumn<any>>>(
    () => [
      {
        field: 'stepId',
        name: 'Step ID',
        dataType: 'string',
        render: (value: string, item) => <EuiText>{value}</EuiText>,
      },
      {
        field: 'workflowId',
        name: 'Workflow ID',
        dataType: 'string',
        render: (value: string, item) => <EuiText>{value}</EuiText>,
      },
      {
        field: 'status',
        name: 'Status',
        dataType: 'string',
        render: (value: string, item) => <EuiText>{value}</EuiText>,
      },
      {
        field: 'executionTimeMs',
        name: 'Execution Time (ms)',
        dataType: 'string',
        render: (value: string, item) => <EuiText>{value}</EuiText>,
      },
    ],
    []
  );

  useEffect(() => {
    if (!workflowExecution) {
      return;
    }

    const intervalId = setInterval(() => {
      if (workflowExecution.status === ExecutionStatus.RUNNING) {
        refresh();
        return;
      }

      clearInterval(intervalId);
    }, 500); // Refresh every 5 seconds

    return () => clearInterval(intervalId);
  }, [workflowExecution, refresh]);

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
    return <EuiText>Error loading workflows</EuiText>;
  }

  return (
    <EuiBasicTable
      columns={columns}
      items={workflowExecution?.stepExecutions ?? []}
      responsiveBreakpoint={false}
    />
  );
};
