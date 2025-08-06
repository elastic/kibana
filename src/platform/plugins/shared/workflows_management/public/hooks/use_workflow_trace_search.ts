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
  workflowExecution: any; // The workflow execution object with traceId
}): WorkflowTraceSearchResult {
  const [result, setResult] = useState<WorkflowTraceSearchResult>({
    traceId: null,
    entryTransactionId: null,
    loading: false,
    error: null,
  });

  const { services } = useKibana();

  useEffect(() => {
    if (!workflowExecution?.traceId) {
      console.log('❌ No trace ID found in workflow execution');
      setResult({
        traceId: null,
        entryTransactionId: null,
        loading: false,
        error: new Error('No trace ID found for this workflow execution'),
      });
      return;
    }

    console.log('🔍 Workflow execution traceId:', workflowExecution.traceId);
    setResult(prev => ({ ...prev, loading: true, error: null }));

    // Find the root transaction for this trace
    const fetchRootTransaction = async () => {
      try {
        console.log('🔍 Fetching root transaction for trace:', workflowExecution.traceId);
        
        // Calculate time range for the search
        const startedAt = new Date(workflowExecution.startedAt);
        const finishedAt = workflowExecution.finishedAt 
          ? new Date(workflowExecution.finishedAt) 
          : new Date();

        const response = await services.http?.get(`/internal/apm/traces/${workflowExecution.traceId}/root_transaction`, {
          query: {
            start: startedAt.toISOString(),
            end: finishedAt.toISOString(),
          },
        }) as APMRootTransactionResponse;

        if (response?.transaction?.id) {
          console.log('🎯 Found root transaction ID:', response.transaction.id);
          setResult({
            traceId: workflowExecution.traceId,
            entryTransactionId: response.transaction.id,
            loading: false,
            error: null,
          });
        } else {
          console.log('⚠️ No root transaction found, using trace ID only');
          setResult({
            traceId: workflowExecution.traceId,
            entryTransactionId: workflowExecution.traceId, // Fallback to trace ID
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('❌ Error fetching root transaction:', error);
        // Fallback: use the stored trace ID without entry transaction
        setResult({
          traceId: workflowExecution.traceId,
          entryTransactionId: workflowExecution.traceId, // Fallback to trace ID
          loading: false,
          error: null, // Don't treat this as an error since we have the trace ID
        });
      }
    };

    fetchRootTransaction();
  }, [workflowExecution, services.http]);

  return result;
} 