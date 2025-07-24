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
  EuiDescriptionList,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { ExecutionStatus, EsWorkflowStepExecution } from '@kbn/workflows';
import { useWorkflowExecution } from '../../../entities/workflows/model/useWorkflowExecution';
import { StatusBadge } from '../../../shared/ui/status_badge';
import { WorkflowVisualEditor } from '../../workflow_visual_editor/ui';
import { useWorkflowDetail } from '../../../entities/workflows/model/useWorkflowDetail';
import { parseWorkflowYamlToJSON } from '../../../../common/lib/yaml-utils';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../../common';
import { WorkflowExecutionLogsTable } from '../../workflow_execution_logs/ui';

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

  const { data: workflow } = useWorkflowDetail(workflowExecution?.workflowId ?? null);

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
      if (workflowExecution.status === ExecutionStatus.RUNNING) {
        refetch();
        return;
      }

      clearInterval(intervalId);
    }, 500); // Refresh every 500ms

    return () => clearInterval(intervalId);
  }, [workflowExecution, refetch]);

  const workflowYamlObject = useMemo(() => {
    if (!workflow) {
      return null;
    }
    return parseWorkflowYamlToJSON(workflow.yaml, WORKFLOW_ZOD_SCHEMA_LOOSE)?.data;
  }, [workflow]);

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
      <EuiSpacer size="s" />
      <div css={{ height: '500px' }}>
        {workflowYamlObject && (
          <WorkflowVisualEditor
            workflow={workflowYamlObject as any}
            stepExecutions={workflowExecution?.stepExecutions}
          />
        )}
      </div>
      <EuiSpacer size="m" />
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
