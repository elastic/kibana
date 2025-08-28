/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useAppStateSelector } from '../../state_management/discover_app_state_container';

interface TransactionProbeResult {
  hasTransactionData: boolean;
  isLoading: boolean;
}

export const useTransactionOverviewProbe = (): TransactionProbeResult => {
  const services = useDiscoverServices();
  const [hasTransactionData, setHasTransactionData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get current Discover state
  const dataView = useAppStateSelector((state) => state.dataSource?.dataView);
  const query = useAppStateSelector((state) => state.query);
  const filters = useAppStateSelector((state) => state.filters);
  const timeRange = useAppStateSelector((state) => state.time);

  const probeForTransactionData = useCallback(async () => {
    if (!dataView || !services.data.search.searchSource) {
      setHasTransactionData(false);
      return;
    }

    setIsLoading(true);

    try {
      // Create a minimal search source for the probe
      const searchSource = services.data.search.searchSource.createEmpty();
      
      // Set the data view
      searchSource.setField('index', dataView);
      
      // Set the time range
      if (timeRange) {
        searchSource.setField('filter', [
          {
            range: {
              '@timestamp': {
                gte: timeRange.from,
                lte: timeRange.to,
              },
            },
          },
        ]);
      }

      // Add existing filters
      if (filters && filters.length > 0) {
        searchSource.setField('filter', [
          ...(searchSource.getField('filter') || []),
          ...filters,
        ]);
      }

      // Add existing query
      if (query && query.query) {
        searchSource.setField('query', query.query);
      }

      // Add transaction-specific filter
      const transactionFilter = {
        bool: {
          filter: [
            { term: { 'processor.event': 'transaction' } },
            { exists: { field: '@timestamp' } },
            { exists: { field: 'trace.id' } },
            { exists: { field: 'transaction.id' } },
            { exists: { field: 'transaction.name' } },
            { exists: { field: 'transaction.type' } },
            { exists: { field: 'transaction.duration.us' } },
          ],
        },
      };

      // Combine with existing query
      const existingQuery = searchSource.getField('query');
      if (existingQuery) {
        searchSource.setField('query', {
          bool: {
            must: [existingQuery, transactionFilter],
          },
        });
      } else {
        searchSource.setField('query', transactionFilter);
      }

      // Set minimal size and fields for performance
      searchSource.setField('size', 1);
      searchSource.setField('fields', [
        'processor.event',
        'trace.id',
        'transaction.id',
        'transaction.name',
        'transaction.type',
        'transaction.duration.us',
        '@timestamp',
        'service.name',
        'data_stream.type',
        '_index',
      ]);

      // Execute the probe
      const response = await searchSource.fetch$().toPromise();
      
      if (response && response.rawResponse) {
        const hits = response.rawResponse.hits?.hits || [];
        
        // Check if we have any transaction documents
        const hasTransactionHits = hits.some((hit) => {
          const source = hit._source;
          const fields = hit.fields;
          
          // Check for required transaction fields
          const hasProcessorEvent = source?.processor?.event === 'transaction' || fields?.['processor.event']?.[0] === 'transaction';
          const hasTimestamp = source?.['@timestamp'] || fields?.['@timestamp']?.[0];
          const hasTraceId = source?.trace?.id || fields?.['trace.id']?.[0];
          const hasTransactionId = source?.transaction?.id || fields?.['transaction.id']?.[0];
          const hasTransactionName = source?.transaction?.name || fields?.['transaction.name']?.[0];
          const hasTransactionType = source?.transaction?.type || fields?.['transaction.type']?.[0];
          const hasTransactionDuration = source?.transaction?.duration?.us || fields?.['transaction.duration.us']?.[0];
          
          // Check for traces data stream
          const hasTracesDataStream = fields?.['data_stream.type']?.[0] === 'traces';
          const isTracesIndex = hit._index?.match(/^(\.ds-)?traces-/);
          
          return (
            hasProcessorEvent &&
            hasTimestamp &&
            hasTraceId &&
            hasTransactionId &&
            hasTransactionName &&
            hasTransactionType &&
            hasTransactionDuration &&
            hasTracesDataStream &&
            isTracesIndex
          );
        });

        setHasTransactionData(hasTransactionHits);
      } else {
        setHasTransactionData(false);
      }
    } catch (error) {
      console.warn('Transaction probe failed:', error);
      setHasTransactionData(false);
    } finally {
      setIsLoading(false);
    }
  }, [dataView, query, filters, timeRange, services.data.search.searchSource]);

  // Run the probe when dependencies change
  useEffect(() => {
    probeForTransactionData();
  }, [probeForTransactionData]);

  return { hasTransactionData, isLoading };
};
