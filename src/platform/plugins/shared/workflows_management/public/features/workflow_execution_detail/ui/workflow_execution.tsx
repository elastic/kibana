/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  EuiBadge,
} from '@elastic/eui';

import type { EsWorkflowStepExecution, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../../common/schema';
import { useWorkflowExecution } from '../../../entities/workflows/model/useWorkflowExecution';
import { useWorkflowTraceSearch } from '../../../hooks/use_workflow_trace_search';
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
        ![
          ExecutionStatus.COMPLETED,
          ExecutionStatus.FAILED,
          ExecutionStatus.CANCELLED,
          ExecutionStatus.SKIPPED,
        ].includes(workflowExecution.status)
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
    const result = parseWorkflowYamlToJSON(workflowYaml, WORKFLOW_ZOD_SCHEMA_LOOSE);
    if (result.error) {
      return null;
    }
    return result.data;
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

    // Expand time range to include parent transaction (task manager, alerting, etc.)
    // For alerting-triggered workflows, the parent trace can start much earlier
    // Use a generous time range to ensure we capture the full trace
    const expandedStartTime = new Date(startedAt.getTime() - 30000); // 30 seconds before
    const expandedEndTime = new Date(finishedAt.getTime() + 30000); // 30 seconds after

    // Debug logging for trace embeddable (development only)
    // eslint-disable-next-line no-console
    console.debug('Using stored trace ID for embeddable:', foundTraceId);
    // eslint-disable-next-line no-console
    console.debug('Time range expanded for parent trace:', {
      originalStart: startedAt.toISOString(),
      expandedStart: expandedStartTime.toISOString(),
      originalEnd: finishedAt.toISOString(),
      expandedEnd: expandedEndTime.toISOString(),
    });

    return {
      traceId: foundTraceId,
      rangeFrom: expandedStartTime.toISOString(),
      rangeTo: expandedEndTime.toISOString(),
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
              workflow={workflowYamlObject as WorkflowYaml}
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

      <EuiSpacer size="s" />
      <WorkflowExecutionLogsTable executionId={workflowExecutionId} />

      <EuiSpacer size="l" />

      {/* APM Trace Waterfall Embeddable with Search - only show if APM is available */}
      {workflowExecution?.startedAt && (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>Execution trace</h3>
              </EuiTitle>
            </EuiFlexItem>
            {traceId && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{traceId}</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
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
              {/* Debug logging for embeddable parameters */}
              {(() => {
                // eslint-disable-next-line no-console
                console.log('🔍 Embeddable parameters:', {
                  traceId,
                  rangeFrom,
                  rangeTo,
                  entryTransactionId,
                  workflowExecutionId,
                  hasApmTrace,
                });
                return null;
              })()}
              <div
                style={{
                  minHeight: '300px', // Minimum height but allows growth
                  maxHeight: '800px', // Maximum height to prevent excessive growth
                  border: '1px solid #d3dae6',
                  borderRadius: '6px',
                  overflow: 'auto', // Allow scrolling if content exceeds max height
                  backgroundColor: '#fafbfd',
                  marginBottom: '24px',
                  direction: 'ltr', // Force left-to-right layout
                }}
              >
                <EmbeddableRenderer
                  type="APM_TRACE_WATERFALL_EMBEDDABLE"
                  maybeId={`workflow-trace-${workflowExecutionId}`}
                  getParentApi={getParentApi}
                  hidePanelChrome={true}
                />
              </div>
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
    </div>
  );
};
