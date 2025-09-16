/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';

export interface ConnectorInstance {
  id: string;
  name: string;
  isPreconfigured: boolean;
  isDeprecated: boolean;
}

export interface ConnectorTypeInfo {
  actionTypeId: string;
  displayName: string;
  instances: ConnectorInstance[];
  enabled: boolean;
  enabledInConfig: boolean;
  enabledInLicense: boolean;
  minimumLicenseRequired: string;
}

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

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['workflows', 'connectors'],
    queryFn: async (): Promise<ConnectorsResponse> => {
      try {
        const response = await http.get('/api/workflows/connectors');
        return response;
      } catch (err) {
        // Log error for debugging but don't throw - let React Query handle retries
        console.warn('Failed to fetch connectors:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - connectors don't change frequently
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Provide fallback data on error
    onError: (error) => {
      console.error('Error fetching connectors:', error);
    },
  });

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
