/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { GoogleThreatIntelligenceConnector } from './google_threat_intelligence';
import {
  AdvancedSearchInputSchema,
  GetFileMitreAttackTechniquesInputSchema,
  GetReportMitreAttackTechniquesInputSchema,
  SearchCollectionsInputSchema,
} from './types';

const SHA256_HASH = '25d8ae4678c37251e7ffbaeddc252ae2530ef23f66e4c856d98ef60f399fa3dc';
const THREAT_ACTOR_ID = 'threat-actor--bcaaad6f-0597-4b89-b69b-84a6be2b7bc3';
const REPORT_ID = 'report--24-10074013';

describe('GoogleThreatIntelligenceConnector', () => {
  const mockClient = {
    get: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: {},
    log: {},
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(GoogleThreatIntelligenceConnector).toBeDefined();
  });

  describe('metadata and configuration', () => {
    it('exposes the new connector only to Agent Builder', () => {
      expect(GoogleThreatIntelligenceConnector.metadata.supportedFeatureIds).toEqual([
        'agentBuilder',
      ]);
    });

    it('validates the configurable base URL against allowed hosts', () => {
      const { shape } = GoogleThreatIntelligenceConnector.schema as unknown as {
        shape: Record<string, { meta: () => { validate?: unknown } | undefined }>;
      };

      expect(Object.keys(shape)).toEqual(['baseUrl']);
      expect(shape.baseUrl.meta()?.validate).toEqual({ allowedHosts: true });
      expect(GoogleThreatIntelligenceConnector.validateUrls?.fields).toEqual(['baseUrl']);
    });

    it('configures API key authentication with the x-apikey header', () => {
      expect(GoogleThreatIntelligenceConnector.auth?.types).toContainEqual(
        expect.objectContaining({
          type: 'api_key_header',
          defaults: { headerField: 'x-apikey' },
        })
      );
    });
  });

  describe('test handler', () => {
    it('calls the IP report endpoint with the x-tool header and resolves when gti_assessment is present', async () => {
      mockClient.get.mockResolvedValue({
        data: { data: { attributes: { gti_assessment: { contributing_factors: {} } } } },
      });

      const result = await GoogleThreatIntelligenceConnector.test.handler(mockContext);

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe('https://www.virustotal.com/api/v3/ip_addresses/8.8.8.8');
      expect(call[1]).toMatchObject({ headers: { 'x-tool': 'Elastic' } });
      expect(result).toEqual({});
    });

    it('uses a configured API base URL without a trailing slash', async () => {
      mockClient.get.mockResolvedValue({
        data: { data: { attributes: { gti_assessment: {} } } },
      });
      const configuredContext = {
        ...mockContext,
        config: { baseUrl: 'https://gti.example.com/' },
      } as unknown as ActionContext;

      await GoogleThreatIntelligenceConnector.test.handler(configuredContext);

      expect(mockClient.get.mock.calls[0][0]).toBe(
        'https://gti.example.com/api/v3/ip_addresses/8.8.8.8'
      );
    });

    it('throws a subscription-tier error when the key is valid but gti_assessment is absent', async () => {
      mockClient.get.mockResolvedValue({ data: { data: { attributes: {} } } });

      await expect(GoogleThreatIntelligenceConnector.test.handler(mockContext)).rejects.toThrow(
        'does not have an Enterprise subscription'
      );
    });

    it('throws on API/network failure, same as every action (see "GTI API error handling" below)', async () => {
      mockClient.get.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(GoogleThreatIntelligenceConnector.test.handler(mockContext)).rejects.toThrow(
        'ECONNREFUSED'
      );
    });
  });

  describe('threat landscape actions', () => {
    it('searches collections with documented filter, order, and paging parameters', async () => {
      const handler = GoogleThreatIntelligenceConnector.actions.searchCollections.handler;
      const apiResponse = { data: [{ id: THREAT_ACTOR_ID, type: 'collection' }] };
      mockClient.get.mockResolvedValue({ data: apiResponse });

      const result = await handler(mockContext, {
        filter: 'collection_type:threat-actor targeted_region:CA',
        order: 'relevance-',
        limit: 20,
        cursor: 'next-page',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://www.virustotal.com/api/v3/collections', {
        headers: { 'x-tool': 'Elastic' },
        params: {
          filter: 'collection_type:threat-actor targeted_region:CA',
          order: 'relevance-',
          limit: 20,
          cursor: 'next-page',
        },
      });
      expect(result).toEqual(apiResponse);
    });

    it('gets any collection object and encodes its ID as one path segment', async () => {
      const handler = GoogleThreatIntelligenceConnector.actions.getCollection.handler;
      mockClient.get.mockResolvedValue({
        data: { data: { id: 'actor/with?reserved#characters' } },
      });

      await handler(mockContext, { id: 'actor/with?reserved#characters' });

      expect(mockClient.get.mock.calls[0][0]).toBe(
        'https://www.virustotal.com/api/v3/collections/actor%2Fwith%3Freserved%23characters'
      );
    });

    it('gets a named relationship and encodes both path parameters', async () => {
      const handler = GoogleThreatIntelligenceConnector.actions.getRelatedObjects.handler;
      mockClient.get.mockResolvedValue({ data: { data: [] } });

      await handler(mockContext, {
        id: THREAT_ACTOR_ID,
        relationship: 'related/files',
        limit: 10,
        cursor: 'next-page',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `https://www.virustotal.com/api/v3/collections/${THREAT_ACTOR_ID}/related%2Ffiles`,
        {
          headers: { 'x-tool': 'Elastic' },
          params: { limit: 10, cursor: 'next-page' },
        }
      );
    });

    it('searches IOCs inside a collection with the documented query parameters', async () => {
      const handler = GoogleThreatIntelligenceConnector.actions.searchCollectionIocs.handler;
      mockClient.get.mockResolvedValue({ data: { data: [] } });

      await handler(mockContext, {
        id: THREAT_ACTOR_ID,
        query: 'entity:domain positives:5+',
        order: 'positives-',
        limit: 5,
        cursor: 'next-page',
        attributes: 'last_analysis_stats',
        relationships: 'resolutions',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `https://www.virustotal.com/api/v3/collections/${THREAT_ACTOR_ID}/search`,
        {
          headers: { 'x-tool': 'Elastic' },
          params: {
            query: 'entity:domain positives:5+',
            order: 'positives-',
            limit: 5,
            cursor: 'next-page',
            attributes: 'last_analysis_stats',
            relationships: 'resolutions',
          },
        }
      );
    });

    it('gets IOC stream objects with filters and compact descriptors', async () => {
      const handler = GoogleThreatIntelligenceConnector.actions.getIocStream.handler;
      mockClient.get.mockResolvedValue({ data: { data: [] } });

      await handler(mockContext, {
        filter: 'origin:subscriptions entity_type:file',
        order: 'date-',
        limit: 10,
        cursor: 'next-page',
        descriptorsOnly: true,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://www.virustotal.com/api/v3/ioc_stream', {
        headers: { 'x-tool': 'Elastic' },
        params: {
          filter: 'origin:subscriptions entity_type:file',
          order: 'date-',
          limit: 10,
          cursor: 'next-page',
          descriptors_only: true,
        },
      });
    });

    it('runs advanced corpus search with paging and descriptor controls', async () => {
      const handler = GoogleThreatIntelligenceConnector.actions.advancedSearch.handler;
      mockClient.get.mockResolvedValue({ data: { data: [] } });

      await handler(mockContext, {
        query: 'entity:url positives:5+',
        order: 'last_submission_date-',
        limit: 10,
        cursor: 'next-page',
        descriptorsOnly: true,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.virustotal.com/api/v3/intelligence/search',
        {
          headers: { 'x-tool': 'Elastic' },
          params: {
            query: 'entity:url positives:5+',
            order: 'last_submission_date-',
            limit: 10,
            cursor: 'next-page',
            descriptors_only: true,
          },
        }
      );
    });

    it('gets a report MITRE ATT&CK tree with structured filters', async () => {
      const handler =
        GoogleThreatIntelligenceConnector.actions.getReportMitreAttackTechniques.handler;
      mockClient.get.mockResolvedValue({ data: { data: { tactics: [] } } });

      await handler(mockContext, {
        reportId: REPORT_ID,
        mitreNamespace: 'mobile',
        ttpSource: 'seen_in_iocs',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `https://www.virustotal.com/api/v3/collections/${REPORT_ID}/mitre_tree`,
        {
          headers: { 'x-tool': 'Elastic' },
          params: { filter: 'mitre_namespace:mobile ttp_source:seen_in_iocs' },
        }
      );
    });

    it('rejects oversized queries and invalid report IDs at the schema level', () => {
      expect(SearchCollectionsInputSchema.safeParse({ filter: 'a'.repeat(2001) }).success).toBe(
        false
      );
      expect(AdvancedSearchInputSchema.safeParse({ query: 'a'.repeat(2001) }).success).toBe(false);
      expect(
        GetReportMitreAttackTechniquesInputSchema.safeParse({ reportId: 'campaign--123' }).success
      ).toBe(false);
    });
  });

  describe('getFileMitreAttackTechniques', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.getFileMitreAttackTechniques.handler;

    it('rejects a malformed hash at the schema level, before the handler runs', () => {
      const result = GetFileMitreAttackTechniquesInputSchema.safeParse({ fileHash: 'test' });
      expect(result.success).toBe(false);
    });

    it('calls the behaviour_mitre_trees endpoint with the hash and x-tool header, and returns the sandbox-keyed data as-is', async () => {
      const apiResponse = {
        data: {
          Zenbox: {
            tactics: [
              {
                id: 'TA0005',
                name: 'Stealth',
                techniques: [
                  {
                    id: 'T1027',
                    name: 'Obfuscated Files or Information',
                    signatures: [{ severity: 'INFO', description: 'encode data using XOR' }],
                  },
                ],
              },
            ],
          },
        },
      };
      mockClient.get.mockResolvedValue({ data: apiResponse });

      const result = await handler(mockContext, { fileHash: SHA256_HASH });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe(
        `https://www.virustotal.com/api/v3/files/${SHA256_HASH}/behaviour_mitre_trees`
      );
      expect(call[1]).toMatchObject({ headers: { 'x-tool': 'Elastic' } });
      expect(result).toEqual(apiResponse);
    });

    it('resolves with an empty object for a hash known to GTI but never sandboxed', async () => {
      mockClient.get.mockResolvedValue({ data: { data: {} } });

      const result = await handler(mockContext, { fileHash: SHA256_HASH });

      expect(result).toEqual({ data: {} });
    });

    it('throws on a 404 (hash unknown to GTI), matching the real API error shape', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 404,
          data: { error: { code: 'NotFoundError', message: `File "${SHA256_HASH}" not found` } },
        },
      });

      await expect(handler(mockContext, { fileHash: SHA256_HASH })).rejects.toThrow(
        `GTI API error (404): File "${SHA256_HASH}" not found`
      );
    });
  });

  describe('GTI API error handling', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.getFileMitreAttackTechniques.handler;

    it('throws an enriched GTI error when the API returns an error envelope', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 401,
          data: { error: { code: 'WrongCredentialsError', message: 'Wrong API key' } },
        },
      });

      await expect(handler(mockContext, { fileHash: SHA256_HASH })).rejects.toThrow(
        'GTI API error (401): Wrong API key'
      );
    });

    it('falls back to the error code when the envelope has no message', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 400, data: { error: { code: 'BadRequestError' } } },
      });

      await expect(handler(mockContext, { fileHash: SHA256_HASH })).rejects.toThrow(
        'GTI API error (400): BadRequestError'
      );
    });

    it('rethrows the original error when the response body is not GTI-shaped, e.g. a bare network error', async () => {
      mockClient.get.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(handler(mockContext, { fileHash: SHA256_HASH })).rejects.toThrow('ECONNREFUSED');
    });
  });
});
