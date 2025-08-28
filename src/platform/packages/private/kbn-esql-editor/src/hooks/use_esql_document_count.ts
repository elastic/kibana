/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useState, useEffect } from 'react';
import { firstValueFrom } from 'rxjs';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

export interface DocumentCountState {
  count: number | null;
  loading: boolean;
  error: string | null;
  calculationTime: number | null;
  estimatedDuration: number | null; // seconds
}

/**
 * Creates a count query from an ES|QL query by appending STATS count = COUNT(*)
 * This removes any LIMIT clause and adds the count aggregation
 */
function createCountQuery(esqlQuery: string): string {
  if (!esqlQuery.trim()) {
    return '';
  }

  // Remove comments and normalize whitespace
  const cleanQuery = esqlQuery.replace(/--.*$/gm, '').trim();
  
  // Split by pipes to process each command
  const commands = cleanQuery.split('|').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
  
  // Remove LIMIT commands and add count aggregation
  const filteredCommands = commands.filter(cmd => !cmd.toUpperCase().startsWith('LIMIT'));
  
  // Add the count aggregation
  const countCommands = [...filteredCommands, 'STATS count = COUNT(*)'];
  
  return countCommands.join(' | ');
}

/**
 * Estimates execution duration for an ES|QL query based on document count and query complexity
 */
function estimateDuration(documentCount: number, esqlQuery: string): number {
  if (documentCount === 0) {
    return 0;
  }

  // Base duration calculation
  const baseDurationSeconds = Math.max(0.5, documentCount / 500000); // Duration per 500k docs

  // Query complexity multiplier
  let complexityMultiplier = 1.0;
  
  // Check for expensive operations
  const query = esqlQuery.toLowerCase();
  
  // Aggregations use more time
  if (query.includes('stats') || query.includes('agg')) {
    complexityMultiplier += 0.8;
  }
  
  // JOINs are very time intensive
  if (query.includes('join')) {
    complexityMultiplier += 2.5;
  }
  
  // WHERE clauses with complex conditions
  if (query.includes('where') && (query.includes('regex') || query.includes('like'))) {
    complexityMultiplier += 0.5;
  }
  
  // SORT operations use more time
  if (query.includes('sort')) {
    complexityMultiplier += 0.4;
  }
  
  // LIMIT reduces execution time
  const limitMatch = query.match(/limit\s+(\d+)/);
  if (limitMatch) {
    const limit = parseInt(limitMatch[1], 10);
    if (limit < documentCount) {
      const limitRatio = Math.min(1.0, limit / documentCount);
      complexityMultiplier *= limitRatio;
    }
  }
  
  // Calculate final duration estimate
  return Math.round(baseDurationSeconds * complexityMultiplier * 100) / 100;
}

export function useEsqlDocumentCount(esqlQuery: string): DocumentCountState & { triggerCount: () => void } {
  const { services } = useKibana<{ data: DataPublicPluginStart }>();
  const [state, setState] = useState<DocumentCountState>({
    count: null,
    loading: false,
    error: null,
    calculationTime: null,
    estimatedDuration: null,
  });

  const fetchDocumentCount = useCallback(async () => {
    if (!esqlQuery.trim()) {
      setState(prev => ({ 
        ...prev, 
        count: null, 
        loading: false, 
        error: null,
        estimatedDuration: null,
      }));
      return;
    }

    const startTime = performance.now();
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const countQuery = createCountQuery(esqlQuery);
      
      if (!countQuery) {
        setState({ 
          count: null, 
          loading: false, 
          error: null, 
          calculationTime: null,
          estimatedDuration: null,
        });
        return;
      }

      console.log('useEsqlDocumentCount: Executing count query:', countQuery);

      const searchRequest = {
        params: {
          query: countQuery,
        },
      };

      // Use the ES|QL search API
      const response = await firstValueFrom(
        services.data.search.search(searchRequest, {
          strategy: 'esql',
          abortSignal: new AbortController().signal,
        })
      );

      // Extract count from ES|QL response
      const esqlResponse = response as any;
      const count = esqlResponse.rawResponse?.values?.[0]?.[0] || 0;
      
      const endTime = performance.now();
      const calculationTime = Math.round(endTime - startTime);
      
      // Estimate duration
      const estimatedDuration = estimateDuration(count, esqlQuery);
      
      setState({
        count,
        loading: false,
        error: null,
        calculationTime,
        estimatedDuration,
      });
    } catch (error) {
      setState({
        count: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch document count',
        calculationTime: null,
        estimatedDuration: null,
      });
    }
  }, [esqlQuery, services.data.search]);

  const triggerCount = useCallback(() => {
    fetchDocumentCount();
  }, [fetchDocumentCount]);

  // Automatic triggering with 500ms debounce when query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (esqlQuery.trim()) {
        fetchDocumentCount();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [esqlQuery, fetchDocumentCount]);

  return {
    ...state,
    triggerCount,
  };
}
