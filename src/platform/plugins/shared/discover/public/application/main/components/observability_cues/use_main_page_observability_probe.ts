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
  hasApmData: boolean;
  hasLogsData: boolean;
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

const validateApmHit = (hit: Record<string, any>): boolean => {
  // Check if the hit has the required APM fields
  const processorEvent = hit.fields?.['processor.event']?.[0];
  const timestamp = hit.fields?.['@timestamp'];
  const traceId = hit.fields?.['trace.id'];
  
  // Check if it's a valid APM event type
  const isValidEvent = processorEvent === 'span' || processorEvent === 'transaction';
  
  if (!isValidEvent || !timestamp || !traceId) {
    return false;
  }

  // For span events, check span-specific fields
  if (processorEvent === 'span') {
    const spanId = hit.fields?.['span.id'];
    const spanDurationUs = hit.fields?.['span.duration.us'];
    
    if (!spanId || !spanDurationUs) {
      return false;
    }

    // Check if span.duration.us is numeric
    const durationUs = spanDurationUs[0];
    const isNumeric = typeof durationUs === 'number';

    if (!isNumeric) {
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
      return false;
    }

    // Check if transaction.duration.us is numeric
    const durationUs = transactionDurationUs[0];
    const isNumeric = typeof durationUs === 'number';

    if (!isNumeric) {
      return false;
    }
  }

  // Check if it's a traces data stream
  const dataStreamType = hit.fields?.['data_stream.type']?.[0];
  const isTraces = dataStreamType === 'traces' || isTracesDataStream(hit._index as string);

  if (!isTraces) {
    return false;
  }

  return true;
};

const validateLogsHit = (hit: Record<string, any>): boolean => {
  // Check if the hit has the required log fields
  const processorEvent = hit.fields?.['processor.event']?.[0];
  const timestamp = hit.fields?.['@timestamp'];
  
  // Check if it's a valid log event type
  const isValidEvent = processorEvent === 'log' || processorEvent === 'error';
  
  if (!isValidEvent || !timestamp) {
    return false;
  }

  // Check for message field (preferred: message, fallback: event.original)
  const hasMessage = hit.fields?.['message']?.[0] || hit.fields?.['event.original']?.[0];
  
  if (!hasMessage) {
    return false;
  }

  // Check data stream context
  const dataStreamType = hit.fields?.['data_stream.type']?.[0];
  const hasEventDataset = hit.fields?.['event.dataset']?.[0];
  
  // For processor.event: "error", allow data_stream.type: "traces" as long as error fields exist
  let hasValidDataStream = dataStreamType === 'logs' || hasEventDataset;
  
  if (processorEvent === 'error') {
    const hasTracesDataStream = dataStreamType === 'traces';
    const hasErrorFields = hit.fields?.['error.id']?.[0] ||
                          hit.fields?.['error.message']?.[0] ||
                          hit.fields?.['error.exception.type']?.[0] ||
                          hit.fields?.['error.exception.message']?.[0] ||
                          hit.fields?.['error.stack_trace']?.[0] ||
                          hit.fields?.['error.exception.stacktrace']?.[0];
    
    if (hasTracesDataStream && hasErrorFields) {
      hasValidDataStream = true;
    }
  }
  
  if (!hasValidDataStream) {
    return false;
  }

  // Check for attribution (any of these): service.name, host.name, container.id, or cloud.provider
  const hasAttribution = hit.fields?.['service.name']?.[0] ||
                        hit.fields?.['host.name']?.[0] ||
                        hit.fields?.['container.id']?.[0] ||
                        hit.fields?.['cloud.provider']?.[0];

  if (!hasAttribution) {
    return false;
  }

  return true;
};

const buildApmProbeQuery = (
  dataView: Record<string, any>,
  query: Query,
  filters: Filter[],
  timeRange: TimeRange
) => {
  // Build the base probe query for APM data (span OR transaction)
  const probeQuery = {
    bool: {
      filter: [
        {
          bool: {
            should: [
              { term: { 'processor.event': 'span' } },
              { term: { 'processor.event': 'transaction' } },
            ],
            minimum_should_match: 1,
          },
        },
        { exists: { field: '@timestamp' } },
        { exists: { field: 'trace.id' } },
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

const buildLogsProbeQuery = (
  dataView: Record<string, any>,
  query: Query,
  filters: Filter[],
  timeRange: TimeRange
) => {
  // Build the base probe query for logs data (log OR error)
  const probeQuery = {
    bool: {
      filter: [
        {
          bool: {
            should: [
              { term: { 'processor.event': 'log' } },
              { term: { 'processor.event': 'error' } },
            ],
            minimum_should_match: 1,
          },
        },
        { exists: { field: '@timestamp' } },
        {
          bool: {
            should: [
              { exists: { field: 'message' } },
              { exists: { field: 'event.original' } },
            ],
            minimum_should_match: 1,
          },
        },
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

const validateApmProbeResponse = (rawResponse: any): boolean => {
  const hits = rawResponse.hits?.hits || [];
  return hits.length > 0 && validateApmHit(hits[0]);
};

const validateLogsProbeResponse = (rawResponse: any): boolean => {
  const hits = rawResponse.hits?.hits || [];
  return hits.length > 0 && validateLogsHit(hits[0]);
};

export const useMainPageObservabilityProbe = (): MainPageObservabilityProbeResult => {
  const services = useDiscoverServices();
  const dataView = useCurrentDataView();
  const query = useAppStateSelector((state) => state.query);
  const filters = useAppStateSelector((state) => state.filters);
  const timeRange = useAppStateSelector((state) => state.time);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const [hasApmData, setHasApmData] = useState(false);
  const [hasLogsData, setHasLogsData] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { apmResult: boolean; logsResult: boolean; timestamp: number }>>(new Map());

  const cacheKey = useMemo(() => {
    if (!dataView) return null;
    return createCacheKey(dataView.id, query, filters, timeRange);
  }, [dataView, query, filters, timeRange]);

  const probeForObservabilityData = useCallback(async () => {
    if (!dataView || !cacheKey) return;

    // Check cache first
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setHasApmData(cached.apmResult);
      setHasLogsData(cached.logsResult);
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
      // Probe for APM data
      const apmSearchSource = services.data.search.searchSource.createEmpty();
      const apmProbeQuery = buildApmProbeQuery(dataView, query, filters, timeRange);

      apmSearchSource
        .setField('index', dataView)
        .setField('size', 1)
        .setField('query', apmProbeQuery)
        .setField('trackTotalHits', false)
        .setField('fields', [
          'data_stream.type', 
          'trace.id', 
          'span.id', 
          'span.duration.us', 
          'processor.event',
          'transaction.id',
          'transaction.name',
          'transaction.type',
          'transaction.duration.us'
        ]);

      const apmResponse = await lastValueFrom(
        apmSearchSource.fetch$({
          signal: abortControllerRef.current.signal,
        })
      );

      const hasApmDataResult = validateApmProbeResponse(apmResponse.rawResponse);

      // Probe for logs data
      const logsSearchSource = services.data.search.searchSource.createEmpty();
      const logsProbeQuery = buildLogsProbeQuery(dataView, query, filters, timeRange);

      logsSearchSource
        .setField('index', dataView)
        .setField('size', 1)
        .setField('query', logsProbeQuery)
        .setField('trackTotalHits', false)
        .setField('fields', [
          'data_stream.type',
          'processor.event',
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

      const logsResponse = await lastValueFrom(
        logsSearchSource.fetch$({
          signal: abortControllerRef.current.signal,
        })
      );

      const hasLogsDataResult = validateLogsProbeResponse(logsResponse.rawResponse);

      // Cache results
      cacheRef.current.set(cacheKey, { 
        apmResult: hasApmDataResult, 
        logsResult: hasLogsDataResult, 
        timestamp: Date.now() 
      });
      
      setHasApmData(hasApmDataResult);
      setHasLogsData(hasLogsDataResult);
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
    hasApmData,
    hasLogsData,
    isLoading,
    error,
  };
};
