/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { lastValueFrom } from 'rxjs';

import type { Query, Filter, TimeRange } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useAppStateSelector } from '../../state_management/discover_app_state_container';
import { useCurrentDataView } from '../../state_management/redux';

interface MainPageObservabilityProbeResult {
  hasObservabilityData: boolean;
  isLoading: boolean;
  error?: Error;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const createCacheKey = (
  dataViewId: string,
  query: Query,
  filters: Filter[],
  timeRange: TimeRange
): string => {
  const queryString = typeof query === 'string' ? query : JSON.stringify(query);
  const filtersString = JSON.stringify(filters);
  const timeRangeString = JSON.stringify(timeRange);

  return `${dataViewId}:${queryString}:${filtersString}:${timeRangeString}`;
};

const isTracesDataStream = (index: string): boolean => {
  return /^(\.ds-)?traces-/.test(index);
};

const isLogsDataStream = (index: string): boolean => {
  return /^(\.ds-)?logs-/.test(index);
};



const validateObservabilityHit = (hit: Record<string, any>): boolean => {
  console.log('🔍 [Observability Hit Validation] Validating hit:', {
    processorEvent: hit.fields?.['processor.event']?.[0],
    timestamp: hit.fields?.['@timestamp'],
    _index: hit._index
  });
  
  // Check if the hit has the required basic fields
  const processorEvent = hit.fields?.['processor.event']?.[0];
  const timestamp = hit.fields?.['@timestamp'];
  
  // Check if it's a valid observability event type
  const isValidEvent = processorEvent === 'span' || processorEvent === 'transaction' || processorEvent === 'error' || processorEvent === 'log';
  
  if (!isValidEvent || !timestamp) {
    console.log('🔍 [Observability Hit Validation] Failed basic checks:', {
      isValidEvent,
      hasTimestamp: !!timestamp
    });
    return false;
  }

  // For span events, check span-specific fields
  if (processorEvent === 'span') {
    const spanId = hit.fields?.['span.id'];
    const spanDurationUs = hit.fields?.['span.duration.us'];
    
    if (!spanId || !spanDurationUs) {
      console.log('🔍 [Observability Hit Validation] Span missing required fields');
      return false;
    }

    // Check if span.duration.us is numeric
    const durationUs = spanDurationUs[0];
    const isNumeric = typeof durationUs === 'number';

    if (!isNumeric) {
      console.log('🔍 [Observability Hit Validation] Span duration not numeric');
      return false;
    }
  }

  // For transaction events, check transaction-specific fields
  if (processorEvent === 'transaction') {
    const transactionId = hit.fields?.['transaction.id'];
    const transactionName = hit.fields?.['transaction.name'];
    const transactionType = hit.fields?.['transaction.type'];
    const transactionDurationUs = hit.fields?.['transaction.duration.us'];
    
    if (!transactionId || !transactionName || !transactionType || !transactionDurationUs) {
      console.log('🔍 [Observability Hit Validation] Transaction missing required fields');
      return false;
    }

    // Check if transaction.duration.us is numeric
    const durationUs = transactionDurationUs[0];
    const isNumeric = typeof durationUs === 'number';

    if (!isNumeric) {
      console.log('🔍 [Observability Hit Validation] Transaction duration not numeric');
      return false;
    }
  }

  // For error events, check error-specific fields
  if (processorEvent === 'error') {
    // Check for message field (preferred: message, fallback: event.original)
    const hasMessage = hit.fields?.['message']?.[0] || hit.fields?.['event.original']?.[0];
    
    if (!hasMessage) {
      console.log('🔍 [Observability Hit Validation] Error missing message field');
      return false;
    }

    // Check for attribution (any of these): service.name, host.name, container.id, or cloud.provider
    const hasAttribution = hit.fields?.['service.name']?.[0] ||
                          hit.fields?.['host.name']?.[0] ||
                          hit.fields?.['container.id']?.[0] ||
                          hit.fields?.['cloud.provider']?.[0];

    if (!hasAttribution) {
      console.log('🔍 [Observability Hit Validation] Error missing attribution');
      return false;
    }
  }

  // For log events, check log-specific fields
  if (processorEvent === 'log') {
    // Check for message field (preferred: message, fallback: event.original)
    const hasMessage = hit.fields?.['message']?.[0] || hit.fields?.['event.original']?.[0];
    
    if (!hasMessage) {
      console.log('🔍 [Observability Hit Validation] Log missing message field');
      return false;
    }

    // Check for attribution (any of these): service.name, host.name, container.id, or cloud.provider
    const hasAttribution = hit.fields?.['service.name']?.[0] ||
                          hit.fields?.['host.name']?.[0] ||
                          hit.fields?.['container.id']?.[0] ||
                          hit.fields?.['cloud.provider']?.[0];

    if (!hasAttribution) {
      console.log('🔍 [Observability Hit Validation] Log missing attribution');
      return false;
    }
  }

  console.log('🔍 [Observability Hit Validation] Validation passed');
  return true;
};



const buildObservabilityProbeQuery = (
  dataView: Record<string, any>,
  query: Query,
  filters: Filter[],
  timeRange: TimeRange
) => {
  // Build the base probe query for all observability data (span OR transaction OR error OR log)
  const probeQuery = {
    bool: {
      filter: [
        {
          bool: {
            should: [
              { term: { 'processor.event': 'span' } },
              { term: { 'processor.event': 'transaction' } },
              { term: { 'processor.event': 'error' } },
              { term: { 'processor.event': 'log' } },
            ],
            minimum_should_match: 1,
          },
        },
        { exists: { field: '@timestamp' } },
      ],
    },
  };

  // Convert KQL to DSL if needed
  let finalQuery = probeQuery;
  if (query && typeof query !== 'string') {
    try {
      const esQuery = buildEsQuery(dataView, query, filters);
      finalQuery = {
        bool: {
          must: [probeQuery],
          filter: esQuery.bool?.filter || [],
        },
      };
    } catch (e) {
      // If KQL parsing fails, fall back to basic query
    }
  }

  return finalQuery;
};

const validateObservabilityProbeResponse = (rawResponse: any): boolean => {
  const hits = rawResponse.hits?.hits || [];
  console.log('🔍 [Observability Validation] Checking hits:', hits.length);
  if (hits.length === 0) {
    console.log('🔍 [Observability Validation] No hits found');
    return false;
  }
  const isValid = validateObservabilityHit(hits[0]);
  console.log('🔍 [Observability Validation] First hit validation result:', isValid);
  return isValid;
};

export const useMainPageObservabilityProbe = (): MainPageObservabilityProbeResult => {
  const services = useDiscoverServices();
  const dataView = useCurrentDataView();
  const query = useAppStateSelector((state) => state.query);
  const filters = useAppStateSelector((state) => state.filters);
  const timeRange = useAppStateSelector((state) => state.time);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const [hasObservabilityData, setHasObservabilityData] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { result: boolean; timestamp: number }>>(new Map());

  const cacheKey = useMemo(() => {
    if (!dataView) return null;
    return createCacheKey(dataView.id, query, filters, timeRange);
  }, [dataView, query, filters, timeRange]);

  const probeForObservabilityData = useCallback(async () => {
    if (!dataView || !cacheKey) return;

    console.log('🔍 [Main Page Probe] Starting probe for data view:', {
      title: dataView.title,
      indexPattern: dataView.indexPattern,
      name: dataView.name
    });

    // Check cache first
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setHasObservabilityData(cached.result);
      return;
    }

    setIsLoading(true);
    setError(undefined);

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      console.log('🔍 [Main Page Probe] Building unified observability probe query...');
      // Single probe for all observability data
      const searchSource = services.data.search.searchSource.createEmpty();
      const probeQuery = buildObservabilityProbeQuery(dataView, query, filters, timeRange);
      console.log('🔍 [Main Page Probe] Unified probe query:', JSON.stringify(probeQuery, null, 2));

      searchSource
        .setField('index', dataView)
        .setField('size', 1)
        .setField('query', probeQuery)
        .setField('trackTotalHits', false)
        .setField('fields', [
          'data_stream.type',
          'processor.event',
          'trace.id', 
          'span.id', 
          'span.duration.us', 
          'transaction.id',
          'transaction.name',
          'transaction.type',
          'transaction.duration.us',
          'message',
          'event.original',
          'event.dataset',
          'service.name',
          'host.name',
          'container.id',
          'cloud.provider',
          'error.id',
          'error.message',
          'error.exception.type',
          'error.exception.message',
          'error.stack_trace',
          'error.exception.stacktrace'
        ]);

      const response = await lastValueFrom(
        searchSource.fetch$({
          signal: abortControllerRef.current.signal,
        })
      );

      const hasObservabilityDataResult = validateObservabilityProbeResponse(response.rawResponse);
      console.log('🔍 [Main Page Probe] Unified probe response:', {
        hasObservabilityData: hasObservabilityDataResult,
        hits: response.rawResponse.hits?.hits?.length || 0,
        firstHit: response.rawResponse.hits?.hits?.[0]
      });

      // Cache results
      cacheRef.current.set(cacheKey, { 
        result: hasObservabilityDataResult, 
        timestamp: Date.now() 
      });
      
      setHasObservabilityData(hasObservabilityDataResult);
      
      console.log('🔍 [Main Page Probe] Final result:', {
        hasObservabilityData: hasObservabilityDataResult
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled
      }
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [dataView, query, filters, timeRange, cacheKey, services]);

  useEffect(() => {
    probeForObservabilityData();
  }, [probeForObservabilityData]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    hasObservabilityData,
    isLoading,
    error,
  };
};
