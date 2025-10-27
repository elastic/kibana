/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@kbn/react-query';
import type { ConnectorInstance, ConnectorTypeInfo } from '@kbn/workflows';
import { addDynamicConnectorsToCache } from '../../../../common/schema';

export interface ConnectorsResponse {
  connectorTypes: Record<string, ConnectorTypeInfo>;
  totalConnectors: number;
}

export interface UseAvailableConnectorsResult {
  data: ConnectorsResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch available connectors from the workflows management API
 * Returns both connector types and their instances for schema generation and autocompletion
 */
export function useAvailableConnectors(): UseAvailableConnectorsResult {
  const {
    services: { http },
  } = useKibana<CoreStart>();

  const { data, isLoading, error, refetch } = useQuery<ConnectorsResponse>({
    queryKey: ['workflows', 'connectors'],
    queryFn: async () => http.get<ConnectorsResponse>('/api/workflows/connectors'),
    staleTime: 5 * 60 * 1000, // 5 minutes - connectors don't change frequently
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Provide fallback data on error
    onError: (_error) => {
      // console.error('Error fetching connectors:', error);
    },
  });

  // Add dynamic connectors to cache when data is fetched
  // Use a ref to track the last processed connector types to avoid unnecessary re-processing
  const lastConnectorTypesRef = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (data?.connectorTypes) {
      // Only process if the connector types have actually changed
      const currentConnectorTypes = data.connectorTypes;
      const lastConnectorTypes = lastConnectorTypesRef.current;

      // Simple check: compare the number of connector types and their keys
      const hasChanged =
        !lastConnectorTypes ||
        Object.keys(currentConnectorTypes).length !== Object.keys(lastConnectorTypes).length ||
        !Object.keys(currentConnectorTypes).every((key) => key in lastConnectorTypes);

      if (hasChanged) {
        addDynamicConnectorsToCache(currentConnectorTypes);
        // use this algorithm to return stable data, e.g. mutate object only when data actually changes

        // Update the ref to track this version
        lastConnectorTypesRef.current = currentConnectorTypes;
      }
    }
  }, [data?.connectorTypes]);

  return {
    data,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Helper hook to get connector instances for a specific action type
 */
export function useConnectorInstances(actionTypeId: string): ConnectorInstance[] {
  const { data } = useAvailableConnectors();

  return data?.connectorTypes[actionTypeId]?.instances || [];
}

/**
 * Helper hook to get all available connector types (for schema generation)
 */
export function useConnectorTypes(): ConnectorTypeInfo[] {
  const { data } = useAvailableConnectors();

  return data ? Object.values(data.connectorTypes) : [];
}
