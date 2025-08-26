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

interface SpanOverviewProbeResult {
  hasSpanData: boolean;
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

const validateSpanHit = (hit: Record<string, any>): boolean => {
  // Check if the hit has the required span fields
  const processorEvent = hit.fields?.['processor.event']?.[0];
  const timestamp = hit.fields?.['@timestamp'];
  const traceId = hit.fields?.['trace.id'];
  const spanId = hit.fields?.['span.id'];
  const spanDurationUs = hit.fields?.['span.duration.us'];
  
  const hasRequiredFields =
    processorEvent === 'span' &&
    timestamp &&
    traceId &&
    spanId &&
    spanDurationUs;

  if (!hasRequiredFields) {
    return false;
  }

  // Check if span.duration.us is numeric
  const durationUs = spanDurationUs[0];
  const isNumeric = typeof durationUs === 'number';

  if (!isNumeric) {
    return false;
  }

  // Check if it's a traces data stream
  const dataStreamType = hit.fields?.['data_stream.type']?.[0];
  const isTraces = dataStreamType === 'traces' || isTracesDataStream(hit._index as string);

  if (!isTraces) {
    return false;
  }

  return isTraces;
};

const buildProbeQuery = (
  dataView: Record<string, any>,
  query: Query,
  filters: Filter[],
  timeRange: TimeRange
) => {
  // Build the base probe query
  const probeQuery = {
    bool: {
      filter: [
        { term: { 'processor.event': 'span' } },
        { exists: { field: '@timestamp' } },
        { exists: { field: 'trace.id' } },
        { exists: { field: 'span.id' } },
        { exists: { field: 'span.duration.us' } },
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

const validateProbeResponse = (rawResponse: any): boolean => {
  const hits = rawResponse.hits?.hits || [];
  return hits.length > 0 && validateSpanHit(hits[0]);
};

export const useSpanOverviewProbe = (): SpanOverviewProbeResult => {
  const services = useDiscoverServices();
  const dataView = useCurrentDataView();
  const query = useAppStateSelector((state) => state.query);
  const filters = useAppStateSelector((state) => state.filters);
  const timeRange = useAppStateSelector((state) => state.time);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const [hasSpanData, setHasSpanData] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { result: boolean; timestamp: number }>>(new Map());

  const cacheKey = useMemo(() => {
    if (!dataView) return null;
    return createCacheKey(dataView.id, query, filters, timeRange);
  }, [dataView, query, filters, timeRange]);

  const probeForSpanData = useCallback(async () => {
    if (!dataView || !cacheKey) return;

    // Check cache first
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setHasSpanData(cached.result);
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
      // Create search source for the probe
      const searchSource = services.data.search.searchSource.createEmpty();
      
      // Build the probe query
      const probeQuery = buildProbeQuery(dataView, query, filters, timeRange);

      // Configure search source
      searchSource
        .setField('index', dataView)
        .setField('size', 1)
        .setField('query', probeQuery)
        .setField('trackTotalHits', false)
        .setField('fields', ['data_stream.type', 'trace.id', 'span.id', 'span.duration.us', 'processor.event']);

      const { rawResponse } = await lastValueFrom(
        searchSource.fetch$({
          signal: abortControllerRef.current.signal,
        })
      );

      const hasSpanDataResult = validateProbeResponse(rawResponse);
      cacheRef.current.set(cacheKey, { result: hasSpanDataResult, timestamp: Date.now() });
      setHasSpanData(hasSpanDataResult);
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
    probeForSpanData();
  }, [probeForSpanData]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    hasSpanData,
    isLoading,
    error,
  };
};
