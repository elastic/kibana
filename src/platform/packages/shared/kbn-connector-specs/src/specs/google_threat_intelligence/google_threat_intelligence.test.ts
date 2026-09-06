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
  GetAnalysisInputSchema,
  GetDomainRelationshipInputSchema,
  GetDomainReportInputSchema,
  GetFileBehavioursInputSchema,
  GetFileMitreAttackTechniquesInputSchema,
  GetFileRelationshipInputSchema,
  GetIpRelationshipInputSchema,
  GetIpReportInputSchema,
  GetReportMitreAttackTechniquesInputSchema,
  GetUrlReportInputSchema,
  GetUrlScanReportInputSchema,
  ScanPrivateUrlInputSchema,
  ScanUrlInputSchema,
  SearchCollectionsInputSchema,
} from './types';

const SHA256_HASH = '25d8ae4678c37251e7ffbaeddc252ae2530ef23f66e4c856d98ef60f399fa3dc';
const THREAT_ACTOR_ID = 'threat-actor--bcaaad6f-0597-4b89-b69b-84a6be2b7bc3';
const REPORT_ID = 'report--24-10074013';
const SAMPLE_URL = 'http://www.example.com/path?q=1';
const SAMPLE_URL_ID = 'aHR0cDovL3d3dy5leGFtcGxlLmNvbS9wYXRoP3E9MQ';

describe('GoogleThreatIntelligenceConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: {},
    log: {},
    secrets: { authType: 'api_key_header', apiKey: 'gti-test-key' },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(GoogleThreatIntelligenceConnector).toBeDefined();
  });

  describe('metadata and configuration', () => {
    it('exposes the connector to Agent Builder and Workflows', () => {
      expect(GoogleThreatIntelligenceConnector.metadata.supportedFeatureIds).toEqual([
        'agentBuilder',
        'workflows',
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

  describe('getIpReport', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.getIpReport.handler;

    it('accepts IPv4 and IPv6, and rejects a malformed address at the schema level', () => {
      expect(GetIpReportInputSchema.safeParse({ ipAddress: '8.8.8.8' }).success).toBe(true);
      expect(GetIpReportInputSchema.safeParse({ ipAddress: '2001:4860:4860::8888' }).success).toBe(
        true
      );
      expect(GetIpReportInputSchema.safeParse({ ipAddress: '999.1.1.1' }).success).toBe(false);
    });

    it('rejects an overlong address, so the format union needs no separate .max() bound', () => {
      expect(GetIpReportInputSchema.safeParse({ ipAddress: '1'.repeat(100000) }).success).toBe(
        false
      );
      expect(
        GetIpReportInputSchema.safeParse({ ipAddress: `${'0'.repeat(50000)}::1` }).success
      ).toBe(false);
    });

    it('calls the ip_addresses endpoint, URL-encodes an IPv6 address, and returns the report as-is', async () => {
      const apiResponse = {
        data: {
          id: '2001:4860:4860::8888',
          type: 'ip_address',
          attributes: {
            as_owner: 'Google LLC',
            asn: 15169,
            network: '2001:4860:4860::/48',
            gti_assessment: { verdict: { value: 'VERDICT_BENIGN' } },
          },
        },
      };
      mockClient.get.mockResolvedValue({ data: apiResponse });

      const result = await handler(mockContext, { ipAddress: '2001:4860:4860::8888' });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe(
        `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(
          '2001:4860:4860::8888'
        )}`
      );
      expect(call[1]).toMatchObject({ headers: { 'x-tool': 'Elastic' } });
      expect(result).toEqual(apiResponse);
    });
  });

  describe('getIpRelationship', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.getIpRelationship.handler;

    it('rejects an empty relationship and an out-of-range limit at the schema level', () => {
      expect(
        GetIpRelationshipInputSchema.safeParse({ ipAddress: '8.8.8.8', relationship: '' }).success
      ).toBe(false);
      expect(
        GetIpRelationshipInputSchema.safeParse({
          ipAddress: '8.8.8.8',
          relationship: 'resolutions',
          limit: 41,
        }).success
      ).toBe(false);
      expect(
        GetIpRelationshipInputSchema.safeParse({
          ipAddress: '8.8.8.8',
          relationship: 'resolutions',
          limit: -1,
        }).success
      ).toBe(false);
    });

    it('accepts limit at its boundary values (0 and 40)', () => {
      expect(
        GetIpRelationshipInputSchema.safeParse({
          ipAddress: '8.8.8.8',
          relationship: 'resolutions',
          limit: 0,
        }).success
      ).toBe(true);
      expect(
        GetIpRelationshipInputSchema.safeParse({
          ipAddress: '8.8.8.8',
          relationship: 'resolutions',
          limit: 40,
        }).success
      ).toBe(true);
    });

    it('calls the relationship endpoint with both segments encoded and passes limit/cursor through', async () => {
      const apiResponse = {
        data: [
          { id: 'resolution-id', type: 'resolution', attributes: { host_name: 'example.com' } },
        ],
        meta: { count: 200, cursor: 'opaque-cursor' },
      };
      mockClient.get.mockResolvedValue({ data: apiResponse });

      const result = await handler(mockContext, {
        ipAddress: '2606:4700:4700::1111',
        relationship: 'resolutions',
        limit: 2,
      });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe(
        `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(
          '2606:4700:4700::1111'
        )}/resolutions`
      );
      expect(call[1]).toMatchObject({
        headers: { 'x-tool': 'Elastic' },
        params: { limit: 2, cursor: undefined },
      });
      expect(result).toEqual(apiResponse);
    });

    it('throws on a 404, which is how GTI reports a relationship it does not recognize', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 404,
          data: { error: { code: 'NotFoundError', message: 'Resource not found.' } },
        },
      });

      await expect(
        handler(mockContext, { ipAddress: '8.8.8.8', relationship: 'not_a_real_relationship' })
      ).rejects.toThrow('GTI API error (404): Resource not found.');
    });
  });

  describe('getDomainReport', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.getDomainReport.handler;

    it('rejects a malformed and an overlong domain at the schema level', () => {
      expect(GetDomainReportInputSchema.safeParse({ domain: 'example.com' }).success).toBe(true);
      expect(GetDomainReportInputSchema.safeParse({ domain: 'not a domain' }).success).toBe(false);
      expect(
        GetDomainReportInputSchema.safeParse({ domain: `${'a'.repeat(250)}.example.com` }).success
      ).toBe(false);
    });

    it('calls the domains endpoint with the domain and returns the report as-is', async () => {
      const apiResponse = {
        data: {
          id: 'example.com',
          type: 'domain',
          attributes: { gti_assessment: { verdict: { value: 'VERDICT_BENIGN' } } },
        },
      };
      mockClient.get.mockResolvedValue({ data: apiResponse });

      const result = await handler(mockContext, { domain: 'example.com' });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe('https://www.virustotal.com/api/v3/domains/example.com');
      expect(call[1]).toMatchObject({ headers: { 'x-tool': 'Elastic' } });
      expect(result).toEqual(apiResponse);
    });
  });

  describe('getDomainRelationship', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.getDomainRelationship.handler;

    it('rejects an empty relationship string at the schema level', () => {
      expect(
        GetDomainRelationshipInputSchema.safeParse({ domain: 'example.com', relationship: '' })
          .success
      ).toBe(false);
    });

    it('calls the relationship endpoint with both segments encoded and passes limit/cursor through', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [] } });

      await handler(mockContext, {
        domain: 'example.com',
        relationship: 'subdomains',
        limit: 5,
        cursor: 'next-page',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.virustotal.com/api/v3/domains/example.com/subdomains',
        {
          headers: { 'x-tool': 'Elastic' },
          params: { limit: 5, cursor: 'next-page' },
        }
      );
    });
  });

  describe('getUrlReport', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.getUrlReport.handler;

    it('accepts any URL scheme and rejects a malformed or overlong URL at the schema level', () => {
      expect(GetUrlReportInputSchema.safeParse({ url: 'https://example.com/path' }).success).toBe(
        true
      );
      expect(GetUrlReportInputSchema.safeParse({ url: 'ftp://example.com/file' }).success).toBe(
        true
      );
      expect(GetUrlReportInputSchema.safeParse({ url: 'not-a-url' }).success).toBe(false);
      expect(
        GetUrlReportInputSchema.safeParse({ url: `https://example.com/${'a'.repeat(2048)}` })
          .success
      ).toBe(false);
    });

    it('derives the GTI URL identifier (base64url of the URL, no padding) and calls the urls endpoint', async () => {
      const apiResponse = {
        data: {
          id: SAMPLE_URL_ID,
          type: 'url',
          attributes: {
            url: SAMPLE_URL,
            gti_assessment: { verdict: { value: 'VERDICT_UNDETECTED' } },
          },
        },
      };
      mockClient.get.mockResolvedValue({ data: apiResponse });

      const result = await handler(mockContext, { url: SAMPLE_URL });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe(`https://www.virustotal.com/api/v3/urls/${SAMPLE_URL_ID}`);
      expect(call[1]).toMatchObject({ headers: { 'x-tool': 'Elastic' } });
      expect(result).toEqual(apiResponse);
    });
  });

  describe('getUrlRelationship', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.getUrlRelationship.handler;

    it('calls the relationship endpoint with the derived URL identifier and passes limit/cursor through', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [] } });

      await handler(mockContext, {
        url: SAMPLE_URL,
        relationship: 'downloaded_files',
        limit: 3,
        cursor: 'next-page',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `https://www.virustotal.com/api/v3/urls/${SAMPLE_URL_ID}/downloaded_files`,
        {
          headers: { 'x-tool': 'Elastic' },
          params: { limit: 3, cursor: 'next-page' },
        }
      );
    });
  });

  describe('getFileReport', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.getFileReport.handler;

    it('calls the files endpoint with the hash and returns the report as-is', async () => {
      const apiResponse = {
        data: {
          id: SHA256_HASH,
          type: 'file',
          attributes: {
            type_description: 'Win32 EXE',
            gti_assessment: { verdict: { value: 'VERDICT_MALICIOUS' } },
          },
        },
      };
      mockClient.get.mockResolvedValue({ data: apiResponse });

      const result = await handler(mockContext, { fileHash: SHA256_HASH });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe(`https://www.virustotal.com/api/v3/files/${SHA256_HASH}`);
      expect(call[1]).toMatchObject({ headers: { 'x-tool': 'Elastic' } });
      expect(result).toEqual(apiResponse);
    });
  });

  describe('getFileRelationship', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.getFileRelationship.handler;

    it('rejects an empty relationship string at the schema level', () => {
      expect(
        GetFileRelationshipInputSchema.safeParse({ fileHash: SHA256_HASH, relationship: '' })
          .success
      ).toBe(false);
    });

    it('calls the relationship endpoint with both segments encoded and passes limit/cursor through', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [] } });

      await handler(mockContext, {
        fileHash: SHA256_HASH,
        relationship: 'contacted_domains',
        limit: 4,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `https://www.virustotal.com/api/v3/files/${SHA256_HASH}/contacted_domains`,
        {
          headers: { 'x-tool': 'Elastic' },
          params: { limit: 4, cursor: undefined },
        }
      );
    });
  });

  describe('getFileBehaviours', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.getFileBehaviours.handler;

    it('rejects a malformed hash, an overlong hash, and an out-of-range limit at the schema level', () => {
      expect(GetFileBehavioursInputSchema.safeParse({ fileHash: 'test' }).success).toBe(false);
      expect(GetFileBehavioursInputSchema.safeParse({ fileHash: `${SHA256_HASH}00` }).success).toBe(
        false
      );
      expect(
        GetFileBehavioursInputSchema.safeParse({ fileHash: SHA256_HASH, limit: 41 }).success
      ).toBe(false);
      expect(
        GetFileBehavioursInputSchema.safeParse({ fileHash: SHA256_HASH, limit: -1 }).success
      ).toBe(false);
    });

    it('defaults the limit to 1 and accepts boundary values 0 and 40', () => {
      expect(GetFileBehavioursInputSchema.parse({ fileHash: SHA256_HASH }).limit).toBe(1);
      expect(
        GetFileBehavioursInputSchema.safeParse({ fileHash: SHA256_HASH, limit: 0 }).success
      ).toBe(true);
      expect(
        GetFileBehavioursInputSchema.safeParse({ fileHash: SHA256_HASH, limit: 40 }).success
      ).toBe(true);
    });

    it('calls the behaviours endpoint with the hash and returns populated data as-is', async () => {
      const apiResponse = {
        data: [
          {
            id: `${SHA256_HASH}_C2AE`,
            type: 'file_behaviour',
            attributes: { sandbox_name: 'C2AE' },
          },
        ],
        meta: { count: 1 },
      };
      mockClient.get.mockResolvedValue({ data: apiResponse });

      const input = GetFileBehavioursInputSchema.parse({ fileHash: SHA256_HASH });
      const result = await handler(mockContext, input);

      expect(mockClient.get).toHaveBeenCalledWith(
        `https://www.virustotal.com/api/v3/files/${SHA256_HASH}/behaviours`,
        {
          headers: { 'x-tool': 'Elastic' },
          params: { limit: 1, cursor: undefined },
        }
      );
      expect(result).toEqual(apiResponse);
    });

    it('resolves with an empty collection for a hash known to GTI but never sandboxed', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], meta: { count: 0 } } });

      const result = await handler(mockContext, { fileHash: SHA256_HASH, limit: 1 });

      expect(result).toEqual({ data: [], meta: { count: 0 } });
    });

    it('throws on a 404, which is how GTI reports a hash it has no record of at all', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 404,
          data: { error: { code: 'NotFoundError', message: `File "${SHA256_HASH}" not found` } },
        },
      });

      await expect(handler(mockContext, { fileHash: SHA256_HASH, limit: 1 })).rejects.toThrow(
        `GTI API error (404): File "${SHA256_HASH}" not found`
      );
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

  describe('scanUrl', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.scanUrl.handler;

    it('marks public and private scans as write operations', () => {
      expect(GoogleThreatIntelligenceConnector.actions.scanUrl.scope).toBe('write');
      expect(GoogleThreatIntelligenceConnector.actions.scanPrivateUrl.scope).toBe('write');
    });

    it('rejects a malformed URL at the schema level, before the handler runs', () => {
      expect(ScanUrlInputSchema.safeParse({ url: 'not-a-url' }).success).toBe(false);
    });

    it('submits the URL as a form-urlencoded body and returns the analysis id as-is', async () => {
      const apiResponse = { data: { type: 'analysis', id: 'u-abc123' } };
      mockClient.post.mockResolvedValue({ data: apiResponse });

      const result = await handler(mockContext, { url: 'https://example.com/' });

      const call = mockClient.post.mock.calls[0];
      expect(call[0]).toBe('https://www.virustotal.com/api/v3/urls');
      expect(call[1]).toBeInstanceOf(URLSearchParams);
      expect((call[1] as URLSearchParams).get('url')).toBe('https://example.com/');
      expect(call[2]).toMatchObject({
        headers: { 'x-tool': 'Elastic', 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      expect(result).toEqual(apiResponse);
    });

    it('posts to the configured API base URL', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { id: 'u-abc123' } } });
      const configuredContext = {
        ...mockContext,
        config: { baseUrl: 'https://gti.example.com/' },
      } as unknown as ActionContext;

      await handler(configuredContext, { url: 'https://example.com/' });

      expect(mockClient.post.mock.calls[0][0]).toBe('https://gti.example.com/api/v3/urls');
    });
  });

  describe('getAnalysis', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.getAnalysis.handler;

    it('rejects an empty and an overlong analysis id at the schema level', () => {
      expect(GetAnalysisInputSchema.safeParse({ analysisId: '' }).success).toBe(false);
      expect(GetAnalysisInputSchema.safeParse({ analysisId: 'a'.repeat(513) }).success).toBe(false);
    });

    it('calls the analyses endpoint with the id and returns the response as-is', async () => {
      const apiResponse = {
        data: {
          type: 'url_analysis',
          id: 'u-abc123',
          attributes: { status: 'completed', stats: { malicious: 0 } },
        },
        meta: { url_info: { id: 'the-url-id', url: 'https://example.com/' } },
      };
      mockClient.get.mockResolvedValue({ data: apiResponse });

      const result = await handler(mockContext, { analysisId: 'u-abc123' });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe('https://www.virustotal.com/api/v3/analyses/u-abc123');
      expect(call[1]).toMatchObject({ headers: { 'x-tool': 'Elastic' } });
      expect(result).toEqual(apiResponse);
    });
  });

  describe('getUrlScanReport', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.getUrlScanReport.handler;

    it('rejects an empty and an overlong URL id at the schema level', () => {
      expect(GetUrlScanReportInputSchema.safeParse({ urlId: '' }).success).toBe(false);
      expect(GetUrlScanReportInputSchema.safeParse({ urlId: 'a'.repeat(513) }).success).toBe(false);
    });

    it('encodes the supplied identifier rather than deriving one from a URL', async () => {
      mockClient.get.mockResolvedValue({ data: { data: { type: 'url', id: 'the/url+id' } } });

      await handler(mockContext, { urlId: 'the/url+id' });

      expect(mockClient.get.mock.calls[0][0]).toBe(
        `https://www.virustotal.com/api/v3/urls/${encodeURIComponent('the/url+id')}`
      );
    });
  });

  describe('scanPrivateUrl', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.scanPrivateUrl.handler;

    it('rejects out-of-range retention and interaction timeouts at the schema level', () => {
      const url = 'https://example.com/';
      expect(ScanPrivateUrlInputSchema.safeParse({ url, retentionPeriodDays: 0 }).success).toBe(
        false
      );
      expect(ScanPrivateUrlInputSchema.safeParse({ url, retentionPeriodDays: 29 }).success).toBe(
        false
      );
      expect(ScanPrivateUrlInputSchema.safeParse({ url, interactionTimeout: 59 }).success).toBe(
        false
      );
      expect(ScanPrivateUrlInputSchema.safeParse({ url, interactionTimeout: 1801 }).success).toBe(
        false
      );
    });

    it('submits only the url when no optional parameters are supplied', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { type: 'private_analysis', id: 'private-id' } },
      });

      await handler(mockContext, { url: 'https://example.com/' });

      const call = mockClient.post.mock.calls[0];
      expect(call[0]).toBe('https://www.virustotal.com/api/v3/private/urls');
      expect(Array.from((call[1] as URLSearchParams).keys())).toEqual(['url']);
    });

    it('maps every optional parameter onto its GTI form field name', async () => {
      const apiResponse = { data: { type: 'private_analysis', id: 'private-id' } };
      mockClient.post.mockResolvedValue({ data: apiResponse });

      const result = await handler(mockContext, {
        url: 'https://example.com/',
        userAgent: 'custom-agent/1.0',
        sandboxes: 'chrome_headless_linux,cape_win',
        retentionPeriodDays: 7,
        storageRegion: 'EU',
        interactionSandbox: 'cape_win',
        interactionTimeout: 120,
      });

      const body = mockClient.post.mock.calls[0][1] as URLSearchParams;
      expect(Object.fromEntries(body.entries())).toEqual({
        url: 'https://example.com/',
        user_agent: 'custom-agent/1.0',
        sandboxes: 'chrome_headless_linux,cape_win',
        retention_period_days: '7',
        storage_region: 'EU',
        interaction_sandbox: 'cape_win',
        interaction_timeout: '120',
      });
      expect(mockClient.post.mock.calls[0][2]).toMatchObject({
        headers: { 'x-tool': 'Elastic', 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      expect(result).toEqual(apiResponse);
    });
  });

  describe('getPrivateAnalysis', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.getPrivateAnalysis.handler;

    it('calls the private analyses endpoint with the id and returns the response as-is', async () => {
      const apiResponse = {
        data: { type: 'private_analysis', id: 'private-id', attributes: { status: 'completed' } },
      };
      mockClient.get.mockResolvedValue({ data: apiResponse });

      const result = await handler(mockContext, { analysisId: 'private-id' });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe('https://www.virustotal.com/api/v3/private/analyses/private-id');
      expect(call[1]).toMatchObject({ headers: { 'x-tool': 'Elastic' } });
      expect(result).toEqual(apiResponse);
    });
  });

  describe('getPrivateUrlReport', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.getPrivateUrlReport.handler;

    it('calls the private URL report endpoint with the id, encoded', async () => {
      mockClient.get.mockResolvedValue({ data: { data: { type: 'private_url' } } });

      await handler(mockContext, { urlId: 'the/url+id' });

      expect(mockClient.get.mock.calls[0][0]).toBe(
        `https://www.virustotal.com/api/v3/private/urls/${encodeURIComponent('the/url+id')}`
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

    it('enriches errors from the form-post path the same way as the get path', async () => {
      mockClient.post.mockRejectedValue({
        response: {
          status: 400,
          data: { error: { code: 'BadRequestError', message: 'Invalid URL' } },
        },
      });

      await expect(
        GoogleThreatIntelligenceConnector.actions.scanUrl.handler(mockContext, {
          url: 'https://example.com/',
        })
      ).rejects.toThrow('GTI API error (400): Invalid URL');
    });
  });
});
