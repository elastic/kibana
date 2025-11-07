/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { enhanceKibanaConnectorsWithFetcher } from './connector_utils';
import type { InternalConnectorContract } from '../types/v1';

describe('enhanceKibanaConnectorsWithFetcher', () => {
  describe('Kibana connectors', () => {
    it('should add fetcher parameter to Kibana connector with ZodObject schema', () => {
      const mockConnector: InternalConnectorContract = {
        type: 'kibana.getCaseDefaultSpace',
        connectorIdRequired: false,
        description: 'GET /api/cases/:id',
        methods: ['GET'],
        patterns: ['/api/cases/{caseId}'],
        isInternal: true,
        parameterTypes: {
          pathParams: ['caseId'],
          urlParams: [],
          bodyParams: [],
        },
        paramsSchema: z.object({
          caseId: z.string(),
        }),
        outputSchema: z.any(),
      };

      const enhanced = enhanceKibanaConnectorsWithFetcher([mockConnector]);

      expect(enhanced).toHaveLength(1);
      expect(enhanced[0].type).toBe('kibana.getCaseDefaultSpace');

      // Test that the schema now accepts fetcher
      const testData = {
        caseId: '123',
        fetcher: {
          skip_ssl_verification: true,
          max_redirects: 5,
        },
      };

      const result = enhanced[0].paramsSchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(testData);
      }
    });

    it('should add fetcher parameter to Kibana connector with intersection schema', () => {
      const mockConnector: InternalConnectorContract = {
        type: 'kibana.postActionsConnectorId',
        connectorIdRequired: false,
        description: 'POST /api/actions/connector/:id',
        methods: ['POST'],
        patterns: ['/api/actions/connector/{id}'],
        isInternal: true,
        parameterTypes: {
          pathParams: ['id'],
          urlParams: [],
          bodyParams: ['config', 'name'],
        },
        paramsSchema: z.intersection(
          z.object({
            config: z.record(z.any()),
          }),
          z.object({
            id: z.string(),
            name: z.string(),
          })
        ),
        outputSchema: z.any(),
      };

      const enhanced = enhanceKibanaConnectorsWithFetcher([mockConnector]);

      expect(enhanced).toHaveLength(1);

      // Test that the schema now accepts fetcher
      const testData = {
        id: 'conn-123',
        name: 'My Connector',
        config: { key: 'value' },
        fetcher: {
          follow_redirects: false,
          keep_alive: true,
        },
      };

      const result = enhanced[0].paramsSchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(testData);
      }
    });

    it('should allow fetcher with all optional fields', () => {
      const mockConnector: InternalConnectorContract = {
        type: 'kibana.testEndpoint',
        connectorIdRequired: false,
        description: 'Test endpoint',
        methods: ['GET'],
        patterns: ['/api/test'],
        isInternal: true,
        parameterTypes: {
          pathParams: [],
          urlParams: [],
          bodyParams: [],
        },
        paramsSchema: z.object({}),
        outputSchema: z.any(),
      };

      const enhanced = enhanceKibanaConnectorsWithFetcher([mockConnector]);

      // Test with all fetcher options
      const testData = {
        fetcher: {
          skip_ssl_verification: true,
          follow_redirects: false,
          max_redirects: 10,
          keep_alive: true,
        },
      };

      const result = enhanced[0].paramsSchema.safeParse(testData);
      expect(result.success).toBe(true);
    });

    it('should allow fetcher with no fields (undefined)', () => {
      const mockConnector: InternalConnectorContract = {
        type: 'kibana.testEndpoint',
        connectorIdRequired: false,
        description: 'Test endpoint',
        methods: ['GET'],
        patterns: ['/api/test'],
        isInternal: true,
        parameterTypes: {
          pathParams: [],
          urlParams: [],
          bodyParams: [],
        },
        paramsSchema: z.object({}),
        outputSchema: z.any(),
      };

      const enhanced = enhanceKibanaConnectorsWithFetcher([mockConnector]);

      // Test without fetcher (should be optional)
      const testData = {};

      const result = enhanced[0].paramsSchema.safeParse(testData);
      expect(result.success).toBe(true);
    });

    it('should handle multiple Kibana connectors', () => {
      const mockConnectors: InternalConnectorContract[] = [
        {
          type: 'kibana.connector1',
          connectorIdRequired: false,
          description: 'Connector 1',
          methods: ['GET'],
          patterns: ['/api/1'],
          isInternal: true,
          parameterTypes: { pathParams: [], urlParams: [], bodyParams: [] },
          paramsSchema: z.object({ param1: z.string() }),
          outputSchema: z.any(),
        },
        {
          type: 'kibana.connector2',
          connectorIdRequired: false,
          description: 'Connector 2',
          methods: ['POST'],
          patterns: ['/api/2'],
          isInternal: true,
          parameterTypes: { pathParams: [], urlParams: [], bodyParams: [] },
          paramsSchema: z.object({ param2: z.number() }),
          outputSchema: z.any(),
        },
      ];

      const enhanced = enhanceKibanaConnectorsWithFetcher(mockConnectors);

      expect(enhanced).toHaveLength(2);

      // Test both connectors accept fetcher
      const result1 = enhanced[0].paramsSchema.safeParse({
        param1: 'test',
        fetcher: { skip_ssl_verification: true },
      });
      expect(result1.success).toBe(true);

      const result2 = enhanced[1].paramsSchema.safeParse({
        param2: 123,
        fetcher: { max_redirects: 3 },
      });
      expect(result2.success).toBe(true);
    });
  });

  describe('Non-Kibana connectors', () => {
    it('should not modify non-Kibana connectors', () => {
      const mockConnector: InternalConnectorContract = {
        type: 'elasticsearch.search',
        connectorIdRequired: false,
        description: 'Elasticsearch search',
        methods: ['POST'],
        patterns: ['/{index}/_search'],
        isInternal: true,
        parameterTypes: {
          pathParams: ['index'],
          urlParams: [],
          bodyParams: [],
        },
        paramsSchema: z.object({
          index: z.string(),
          query: z.object({}).optional(),
        }),
        outputSchema: z.any(),
      };

      const enhanced = enhanceKibanaConnectorsWithFetcher([mockConnector]);

      expect(enhanced).toHaveLength(1);
      expect(enhanced[0]).toEqual(mockConnector); // Should be unchanged

      // Test that fetcher is NOT in the parsed result (Zod strips unknown properties)
      const testData = {
        index: 'test-index',
        query: {},
        fetcher: { skip_ssl_verification: true },
      };

      const result = enhanced[0].paramsSchema.safeParse(testData);
      expect(result.success).toBe(true); // Validation succeeds
      if (result.success) {
        // But fetcher should be stripped out
        expect(result.data).not.toHaveProperty('fetcher');
        expect(result.data).toEqual({ index: 'test-index', query: {} });
      }
    });

    it('should handle mixed Kibana and non-Kibana connectors', () => {
      const mockConnectors: InternalConnectorContract[] = [
        {
          type: 'kibana.getCase',
          connectorIdRequired: false,
          description: 'Kibana connector',
          methods: ['GET'],
          patterns: ['/api/cases/{id}'],
          isInternal: true,
          parameterTypes: { pathParams: ['id'], urlParams: [], bodyParams: [] },
          paramsSchema: z.object({ id: z.string() }),
          outputSchema: z.any(),
        },
        {
          type: 'elasticsearch.index',
          connectorIdRequired: false,
          description: 'ES connector',
          methods: ['POST'],
          patterns: ['/{index}/_doc'],
          isInternal: true,
          parameterTypes: { pathParams: ['index'], urlParams: [], bodyParams: [] },
          paramsSchema: z.object({ index: z.string() }),
          outputSchema: z.any(),
        },
      ];

      const enhanced = enhanceKibanaConnectorsWithFetcher(mockConnectors);

      expect(enhanced).toHaveLength(2);

      // Kibana connector should accept fetcher
      const kibanaResult = enhanced[0].paramsSchema.safeParse({
        id: '123',
        fetcher: { skip_ssl_verification: true },
      });
      expect(kibanaResult.success).toBe(true);
      if (kibanaResult.success) {
        expect(kibanaResult.data).toHaveProperty('fetcher');
      }

      // ES connector should strip out fetcher (not in schema)
      const esResult = enhanced[1].paramsSchema.safeParse({
        index: 'test',
        fetcher: { skip_ssl_verification: true },
      });
      expect(esResult.success).toBe(true); // Validation succeeds
      if (esResult.success) {
        // But fetcher should be stripped out
        expect(esResult.data).not.toHaveProperty('fetcher');
        expect(esResult.data).toEqual({ index: 'test' });
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty connector array', () => {
      const enhanced = enhanceKibanaConnectorsWithFetcher([]);
      expect(enhanced).toHaveLength(0);
    });

    it('should validate fetcher field types', () => {
      const mockConnector: InternalConnectorContract = {
        type: 'kibana.test',
        connectorIdRequired: false,
        description: 'Test',
        methods: ['GET'],
        patterns: ['/api/test'],
        isInternal: true,
        parameterTypes: { pathParams: [], urlParams: [], bodyParams: [] },
        paramsSchema: z.object({}),
        outputSchema: z.any(),
      };

      const enhanced = enhanceKibanaConnectorsWithFetcher([mockConnector]);

      // Test with invalid fetcher types
      const invalidData = {
        fetcher: {
          skip_ssl_verification: 'not a boolean', // Should be boolean
          max_redirects: 'not a number', // Should be number
        },
      };

      const result = enhanced[0].paramsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
