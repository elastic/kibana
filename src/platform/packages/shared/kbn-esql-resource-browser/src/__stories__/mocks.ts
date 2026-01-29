/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, HttpStart } from '@kbn/core/public';
import type { ESQLSourceResult, ESQLFieldWithMetadata } from '@kbn/esql-types';
import type { ESQLColumnData } from '@kbn/esql-language/src/commands/registry/types';
import type { ColumnsMap } from '@kbn/esql-language/src/language/shared/columns_retrieval_helpers';
import type { ILicense } from '@kbn/licensing-types';

// Mock data sources
export const mockDataSources: ESQLSourceResult[] = [
  { name: 'logs-*', type: 'data stream', title: 'logs-*', hidden: false },
  { name: 'metrics-*', type: 'data stream', title: 'metrics-*', hidden: false },
  { name: 'kibana_sample_data_logs', type: 'index', title: 'Sample Logs', hidden: false },
  { name: 'kibana_sample_data_ecommerce', type: 'index', title: 'Sample eCommerce', hidden: false },
  { name: 'kibana_sample_data_flights', type: 'index', title: 'Sample Flights', hidden: false },
  { name: '.ds-logs-nginx-2024.01.01', type: 'integration', title: 'Nginx Logs', hidden: false },
  { name: 'users_lookup', type: 'lookup index', title: 'Users Lookup', hidden: false },
  { name: 'tsdb-metrics', type: 'timeseries', title: 'TSDB Metrics', hidden: false },
];

// Mock fields
export const mockFields: ESQLFieldWithMetadata[] = [
  { name: '@timestamp', type: 'date', userDefined: false },
  { name: 'message', type: 'text', userDefined: false },
  { name: 'host.name', type: 'keyword', userDefined: false },
  { name: 'host.ip', type: 'ip', userDefined: false },
  { name: 'bytes', type: 'long', userDefined: false },
  { name: 'response_time', type: 'double', userDefined: false },
  { name: 'geo.location', type: 'geo_point', userDefined: false },
  { name: 'status_code', type: 'integer', userDefined: false },
  { name: 'user.name', type: 'keyword', userDefined: false },
  { name: 'tags', type: 'keyword', userDefined: false },
];

// Mock HTTP client
export const createMockHttp = (): HttpStart => {
  return {
    get: async (path: string) => {
      // Simulate API responses based on path
      if (path.includes('sources')) {
        return mockDataSources;
      }
      return [];
    },
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
    fetch: async () => ({}),
    patch: async () => ({}),
  } as unknown as HttpStart;
};

// Mock Core with application and http
export const createMockCore = (): Pick<CoreStart, 'application' | 'http'> => {
  return {
    application: {
      capabilities: {
        fleet: { read: true },
      },
    } as unknown as CoreStart['application'],
    http: createMockHttp(),
  };
};

// Mock getLicense function
export const mockGetLicense = async (): Promise<ILicense | undefined> => {
  return {
    isActive: true,
    isAvailable: true,
    signature: 'mock-signature',
    toJSON: () => ({ signature: 'mock-signature' }),
    getUnavailableReason: () => undefined,
    hasAtLeast: () => true,
    check: () => ({ state: 'valid' as const, message: '' }),
    getFeature: (featureName: string) => {
      if (featureName === 'ccr') {
        return { isAvailable: true, isEnabled: true };
      }
      return { isAvailable: false, isEnabled: false };
    },
  } as unknown as ILicense;
};

// Mock getColumnMap function that returns mock fields
export const createMockGetColumnMap = () => {
  return async (): Promise<ColumnsMap> => {
    const columnMap: ColumnsMap = new Map<string, ESQLColumnData>();
    mockFields.forEach((field) => {
      columnMap.set(field.name, field as ESQLColumnData);
    });
    return columnMap;
  };
};
