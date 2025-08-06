/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useCallback } from 'react';
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
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { useWorkflowExecution } from '../../../entities/workflows/model/useWorkflowExecution';
import { useWorkflowTraceSearch } from '../../../hooks/use_workflow_trace_search';
import { StatusBadge } from '../../../shared/ui/status_badge';
import { WorkflowVisualEditor } from '../../workflow_visual_editor/ui';
import { parseWorkflowYamlToJSON } from '../../../../common/lib/yaml-utils';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../../common/schema';
import { WorkflowExecutionLogsTable } from '../../workflow_execution_logs/ui';

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
      if (workflowExecution.status === ExecutionStatus.RUNNING) {
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

  // Search for actual APM traces using stored trace ID
  const {
    traceId: foundTraceId,
    entryTransactionId: foundEntryTransactionId,
    loading: traceSearchLoading,
    error: traceSearchError,
  } = useWorkflowTraceSearch({
    workflowExecution,
  });

  // APM Trace Waterfall properties - NOW USES STORED TRACE ID
  const { traceId, rangeFrom, rangeTo, entryTransactionId, hasApmTrace } = useMemo(() => {
    if (!workflowExecution?.startedAt || !foundTraceId) {
      return {
        traceId: null,
        rangeFrom: null,
        rangeTo: null,
        entryTransactionId: null,
        hasApmTrace: false,
      };
    }

    const startedAt = new Date(workflowExecution.startedAt);
    const finishedAt = workflowExecution.finishedAt
      ? new Date(workflowExecution.finishedAt)
      : new Date();

    // eslint-disable-next-line no-console
    console.log('🎯 Using STORED trace ID for embeddable:', foundTraceId);

    return {
      traceId: foundTraceId, // 🔥 KEY CHANGE: Use the stored trace ID from workflow execution
      rangeFrom: startedAt.toISOString(),
      rangeTo: finishedAt.toISOString(),
      serviceName: 'workflow-engine',
      entryTransactionId:
        foundEntryTransactionId ||
        workflowExecution.stepExecutions?.[0]?.id ||
        workflowExecution.id,
      hasApmTrace: true,
    };
  }, [workflowExecution, foundTraceId, foundEntryTransactionId]);

  // Create stable parent API for embeddable - following unified_doc_viewer pattern
  const getParentApi = useCallback(
    () => ({
      getSerializedStateForChild: () => ({
        rawState: {
          traceId,
          rangeFrom,
          rangeTo,
          serviceName: 'workflow-engine',
          entryTransactionId,
        },
      }),
    }),
    [traceId, rangeFrom, rangeTo, entryTransactionId]
  );

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

      {/* APM Trace Waterfall Embeddable with Search */}
      {workflowExecution?.startedAt && (
        <>
          <EuiTitle size="xs">
            <h3>Execution Trace</h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          {/* Show loading state while searching for traces */}
          {traceSearchLoading && (
            <>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="m" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    Searching for execution traces...
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="l" />
            </>
          )}

          {/* Show error if trace search failed */}
          {traceSearchError && !traceSearchLoading && (
            <>
              <EuiText size="s" color="danger">
                Unable to find APM traces for this execution: {traceSearchError.message}
              </EuiText>
              <EuiSpacer size="l" />
            </>
          )}

          {/* Show embeddable when trace is found */}
          {hasApmTrace && !traceSearchLoading && traceId && (
            <>
              <EuiText size="s" color="success">
                Found trace: {traceId}
              </EuiText>
              <EuiSpacer size="s" />
              <div style={{ height: '400px' }}>
                <EmbeddableRenderer
                  type="APM_TRACE_WATERFALL_EMBEDDABLE"
                  maybeId={`workflow-trace-${workflowExecutionId}`}
                  getParentApi={getParentApi}
                  hidePanelChrome={true}
                />
              </div>
              <EuiSpacer size="l" />
            </>
          )}

          {/* Show message when no traces found but search completed */}
          {!hasApmTrace && !traceSearchLoading && !traceSearchError && (
            <>
              <EuiText size="s" color="subdued">
                No APM traces found for this workflow execution.
              </EuiText>
              <EuiSpacer size="l" />
            </>
          )}
        </>
      )}

      <WorkflowExecutionLogsTable executionId={workflowExecutionId} />
    </div>
  );
};
