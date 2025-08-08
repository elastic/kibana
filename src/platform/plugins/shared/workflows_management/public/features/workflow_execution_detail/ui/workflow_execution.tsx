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
  EuiBasicTableColumn,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { EsWorkflowStepExecution, ExecutionStatus } from '@kbn/workflows';
import React, { useEffect, useMemo } from 'react';
import { parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../../common/schema';
import { useWorkflowExecution } from '../../../entities/workflows/model/useWorkflowExecution';
import { StatusBadge } from '../../../shared/ui/status_badge';
import { WorkflowExecutionLogsTable } from '../../workflow_execution_logs/ui';
import { WorkflowVisualEditor } from '../../workflow_visual_editor/ui';

export interface WorkflowExecutionProps {
  workflowExecutionId: string;
  workflowYaml: string;
  fields?: Array<keyof EsWorkflowStepExecution>;
}

export const WorkflowExecution: React.FC<WorkflowExecutionProps> = ({
  workflowExecutionId,
  workflowYaml,
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
          render: (value: ExecutionStatus, item: EsWorkflowStepExecution) => {
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
      if (
        workflowExecution.status === ExecutionStatus.RUNNING ||
        workflowExecution.status === ExecutionStatus.PENDING
      ) {
        refetch();
        return;
      }

      clearInterval(intervalId);
    }, 500); // Refresh every 500ms

    return () => clearInterval(intervalId);
  }, [workflowExecution, refetch]);

  const workflowYamlObject = useMemo(() => {
    if (!workflowYaml) {
      return null;
    }
    return parseWorkflowYamlToJSON(workflowYaml, WORKFLOW_ZOD_SCHEMA_LOOSE)?.data;
  }, [workflowYaml]);

  const executionProps = useMemo(() => {
    return [
      {
        title: 'Status',
        description: <StatusBadge status={workflowExecution?.status} />,
      },
      {
        title: 'Started At',
        description: workflowExecution?.startedAt?.toLocaleString() ?? 'N/A',
      },
      {
        title: 'Finished At',
        description: workflowExecution?.finishedAt?.toLocaleString() ?? 'N/A',
      },
      {
        title: 'Duration',
        description: `${workflowExecution?.duration} ms`,
      },
    ];
  }, [workflowExecution]);

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
      <EuiTitle size="xs">
        <h3>Workflow Execution Details</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDescriptionList type="column" listItems={executionProps} compressed />
      {workflowYamlObject && (
        <>
          <EuiSpacer size="s" />
          <div css={{ height: '500px' }}>
            <WorkflowVisualEditor
              workflow={workflowYamlObject as any}
              stepExecutions={workflowExecution?.stepExecutions}
            />
          </div>
          <EuiSpacer size="m" />
        </>
      )}
      <EuiTitle size="xs">
        <h3>Step Executions</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiBasicTable
        columns={columns}
        items={workflowExecution?.stepExecutions ?? []}
        responsiveBreakpoint={false}
      />
      <EuiSpacer size="l" />
      <WorkflowExecutionLogsTable executionId={workflowExecutionId} />
    </div>
  );
};
