/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBasicTable,
  EuiText,
  EuiLoadingSpinner,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  Criteria,
} from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedRelative } from '@kbn/i18n-react';
import { ExecutionStatus, WorkflowExecutionModel } from '@kbn/workflows';
import { useWorkflowExecutions } from '../../../entities/workflows/model/useWorkflowExecutions';
import { WorkflowExecution } from '../../workflow-detail/ui/workflow-execution';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

export function WorkflowExecutionList({ workflowId }: { workflowId: string }) {
  const {
    data: workflowExecutions,
    isLoading: isLoadingWorkflowExecutions,
    error,
  } = useWorkflowExecutions(workflowId);

  const [selectedWorkflowExecutionId, setSelectedWorkflowExecutionId] = useState<string | null>(
    null
  );

  const handleViewWorkflowExecution = (item: WorkflowExecutionModel) => {
    setSelectedWorkflowExecutionId(item.id);
  };

  const columns: Array<EuiBasicTableColumn<WorkflowExecutionModel>> = [
    {
      field: 'id',
      name: 'ID',
    },
    {
      field: 'status',
      name: 'Status',
      render: (value: ExecutionStatus) => <StatusBadge status={value} />,
    },
    {
      field: 'startedAt',
      name: 'Started At',
      render: (value: Date) => (
        <EuiToolTip content={value.toLocaleString()}>
          <span>
            <FormattedRelative value={value} />
          </span>
        </EuiToolTip>
      ),
    },
    {
      field: 'duration',
      name: 'Duration',
      render: (value: number) =>
        value ? (
          <EuiText size="s" color="subdued">
            {value} ms
          </EuiText>
        ) : null,
    },
    // {
    //   name: 'Actions',
    //   actions: [
    //     {
    //       type: 'button',
    //       name: 'View',
    //       description: 'View',
    //       onClick: (item) => handleViewWorkflowExecution(item),
    //     },
    //   ],
    // },
  ];

  if (isLoadingWorkflowExecutions) {
    return <EuiLoadingSpinner />;
  }

  if (error) {
    return <EuiText>Error loading workflow executions</EuiText>;
  }

  return (
    <EuiFlexGroup css={{ height: '100%' }}>
      <EuiFlexItem>
        <EuiBasicTable
          columns={columns}
          items={workflowExecutions?.results ?? []}
          responsiveBreakpoint={false}
          rowProps={(item) => ({
            onClick: () => handleViewWorkflowExecution(item),
            className: item.id === selectedWorkflowExecutionId ? 'euiTableRow--marked' : undefined,
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {selectedWorkflowExecutionId ? (
          <WorkflowExecution
            workflowExecutionId={selectedWorkflowExecutionId}
            fields={['stepId', 'status', 'executionTimeMs']}
          />
        ) : (
          <EuiFlexGroup
            justifyContent="center"
            alignItems="center"
            direction="column"
            css={{ height: '100%' }}
          >
            <EuiFlexItem>
              <EuiText>Select an execution to view</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
