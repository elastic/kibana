/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

interface WorkflowTraceSearchResult {
  traceId: string | null;
  entryTransactionId: string | null;
  loading: boolean;
  error: Error | null;
  isTraceComplete: boolean;
  expectedSpanCount: number | null;
  actualSpanCount: number | null;
}

// APM API response structure for root transaction
interface APMRootTransactionResponse {
  transaction?: {
    id: string;
    name?: string;
    type?: string;
  };
}

export function useWorkflowTraceSearch({
  workflowExecution,
}: {
  workflowExecution: any | null; // eslint-disable-line @typescript-eslint/no-explicit-any -- The workflow execution object with traceId, or null to disable
}): WorkflowTraceSearchResult {
  const [result, setResult] = useState<WorkflowTraceSearchResult>({
    traceId: null,
    entryTransactionId: null,
    loading: false,
    error: null,
    isTraceComplete: false,
    expectedSpanCount: null,
    actualSpanCount: null,
  });

  const { services } = useKibana();

  useEffect(() => {
    // Return early if workflowExecution is null (APM disabled) or has no traceId
    if (!workflowExecution?.traceId) {
      setResult({
        traceId: null,
        entryTransactionId: null,
        loading: false,
        error:
          workflowExecution === null
            ? null
            : new Error('No trace ID found for this workflow execution'),
        isTraceComplete: false,
        expectedSpanCount: null,
        actualSpanCount: null,
      });
      return;
    }

    // Check if we already have the entry transaction ID stored
    if (workflowExecution.entryTransactionId) {
      setResult({
        traceId: workflowExecution.traceId,
        entryTransactionId: workflowExecution.entryTransactionId,
        loading: false,
        error: null,
        isTraceComplete: true, // Assume complete if we have stored data
        expectedSpanCount: null,
        actualSpanCount: null,
      });
      return;
    }

    setResult((prev) => ({ ...prev, loading: true, error: null }));

    // Find the root transaction for this trace
    const fetchRootTransaction = async () => {
      try {
        // Calculate time range for the search (expanded to include parent transaction)
        const startedAt = new Date(workflowExecution.startedAt);
        const finishedAt = workflowExecution.finishedAt
          ? new Date(workflowExecution.finishedAt)
          : new Date();

        const expandedStartTime = new Date(startedAt.getTime() - 30000); // 30 seconds before
        const expandedEndTime = new Date(finishedAt.getTime() + 30000); // 30 seconds after

        const response = (await services.http?.get(
          `/internal/apm/traces/${workflowExecution.traceId}/root_transaction`,
          {
            query: {
              start: expandedStartTime.toISOString(),
              end: expandedEndTime.toISOString(),
            },
          }
        )) as APMRootTransactionResponse;

        if (response?.transaction?.id) {
          setResult({
            traceId: workflowExecution.traceId,
            entryTransactionId: response.transaction.id,
            loading: false,
            error: null,
            isTraceComplete: true,
            expectedSpanCount: null,
            actualSpanCount: null,
          });
        } else {
          setResult({
            traceId: workflowExecution.traceId,
            entryTransactionId: workflowExecution.traceId, // Fallback to trace ID
            loading: false,
            error: null,
            isTraceComplete: true,
            expectedSpanCount: null,
            actualSpanCount: null,
          });
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching root transaction:', error);
        // Fallback: use the stored trace ID without entry transaction
        setResult({
          traceId: workflowExecution.traceId,
          entryTransactionId: workflowExecution.traceId, // Fallback to trace ID
          loading: false,
          error: null, // Don't treat this as an error since we have the trace ID
          isTraceComplete: true,
          expectedSpanCount: null,
          actualSpanCount: null,
        });
      }
    };

    fetchRootTransaction();
  }, [workflowExecution, services.http]);

  return result;
}
