/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ExecutionStatus, WorkflowDetailDto } from '@kbn/workflows';
import { useWorkflowExecutions } from '../../../entities/workflows/model/useWorkflowExecutions';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { WorkflowExecutionList as WorkflowExecutionListComponent } from './workflow_execution_list';

// Add a type for the table items that matches the fields used in the table
interface WorkflowExecutionTableItem {
  id: string;
  status: ExecutionStatus;
  triggeredBy?: string;
  startedAt: Date;
  duration?: number;
}

export function WorkflowExecutionList({ workflow }: { workflow: WorkflowDetailDto }) {
  const {
    data: workflowExecutions,
    isLoading: isLoadingWorkflowExecutions,
    error,
  } = useWorkflowExecutions(workflow.id);

  const { selectedExecutionId, setSelectedExecution } = useWorkflowUrlState();

  const handleViewWorkflowExecution = (executionId: string) => {
    setSelectedExecution(executionId);
  };

  // const columns: Array<EuiBasicTableColumn<WorkflowExecutionTableItem>> = [
  //   {
  //     field: 'id',
  //     name: 'ID',
  //   },
  //   {
  //     field: 'status',
  //     name: 'Status',
  //     render: (value: ExecutionStatus) => <StatusBadge status={value} />,
  //   },
  //   {
  //     field: 'triggeredBy',
  //     name: 'Triggered by',
  //     render: (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : ''),
  //   },
  //   {
  //     field: 'startedAt',
  //     name: 'Started At',
  //     render: (value: Date) => (
  //       <EuiToolTip content={value.toLocaleString()}>
  //         <span>
  //           <FormattedRelative value={value} />
  //         </span>
  //       </EuiToolTip>
  //     ),
  //   },
  //   {
  //     field: 'duration',
  //     name: 'Duration',
  //     render: (value: number) =>
  //       value ? (
  //         <EuiText size="s" color="subdued">
  //           {value} ms
  //         </EuiText>
  //       ) : null,
  //   },
  //   // {
  //   //   name: 'Actions',
  //   //   actions: [
  //   //     {
  //   //       type: 'button',
  //   //       name: 'View',
  //   //       description: 'View',
  //   //       onClick: (item) => handleViewWorkflowExecution(item),
  //   //     },
  //   //   ],
  //   // },
  // ];

  // Map API results to table items, converting startedAt to Date
  const tableItems: WorkflowExecutionTableItem[] = (workflowExecutions?.results ?? []).map(
    (exec: any) => ({
      id: exec.id,
      status: exec.status,
      triggeredBy: exec.triggeredBy,
      startedAt: exec.startedAt ? new Date(exec.startedAt) : new Date(),
      duration: exec.duration,
    })
  );

  return (
    <WorkflowExecutionListComponent
      executions={workflowExecutions ?? null}
      onExecutionClick={handleViewWorkflowExecution}
      selectedId={selectedExecutionId ?? null}
      isLoading={isLoadingWorkflowExecutions}
      error={error as Error | null}
    />
  );

  // return (
  //   <EuiFlexGroup css={{ height: '100%' }}>
  //     <EuiFlexItem>
  //       <EuiBasicTable
  //         columns={columns}
  //         items={tableItems}
  //         responsiveBreakpoint={true}
  //         // responsiveBreakpoint={false}
  //         rowProps={(item) => ({
  //           onClick: () => handleViewWorkflowExecution(item),
  //           className: item.id === selectedExecutionId ? 'euiTableRow--marked' : undefined,
  //         })}
  //       />
  //     </EuiFlexItem>
  //     {/* <EuiFlexItem>
  //       {selectedExecutionId ? (
  //         <WorkflowExecution
  //           workflowExecutionId={selectedExecutionId}
  //           workflowYaml={workflow.yaml}
  //           fields={['stepId', 'status', 'executionTimeMs']}
  //         />
  //       ) : (
  //         <EuiFlexGroup
  //           justifyContent="center"
  //           alignItems="center"
  //           direction="column"
  //           css={{ height: '100%' }}
  //         >
  //           <EuiFlexItem>
  //             <EuiText>Select an execution to view</EuiText>
  //           </EuiFlexItem>
  //         </EuiFlexGroup>
  //       )}
  //     </EuiFlexItem> */}
  //   </EuiFlexGroup>
  // );
}
