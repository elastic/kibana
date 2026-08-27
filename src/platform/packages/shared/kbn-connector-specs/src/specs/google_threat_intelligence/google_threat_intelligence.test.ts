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
import { GetFileBehavioursInputSchema, GetFileMitreAttackTechniquesInputSchema } from './types';

const SHA256_HASH = '25d8ae4678c37251e7ffbaeddc252ae2530ef23f66e4c856d98ef60f399fa3dc';

describe('GoogleThreatIntelligenceConnector', () => {
  const mockClient = {
    get: jest.fn(),
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

  describe('getFileBehaviours', () => {
    const handler = GoogleThreatIntelligenceConnector.actions.getFileBehaviours.handler;

    it('rejects a malformed hash at the schema level, before the handler runs', () => {
      const result = GetFileBehavioursInputSchema.safeParse({ fileHash: 'test' });
      expect(result.success).toBe(false);
    });

    it('rejects a hash longer than 64 characters at the schema level', () => {
      const result = GetFileBehavioursInputSchema.safeParse({ fileHash: `${SHA256_HASH}a` });
      expect(result.success).toBe(false);
    });

    it('rejects a limit above 40 at the schema level', () => {
      const result = GetFileBehavioursInputSchema.safeParse({ fileHash: SHA256_HASH, limit: 41 });
      expect(result.success).toBe(false);
    });

    it('rejects a negative limit at the schema level', () => {
      const result = GetFileBehavioursInputSchema.safeParse({ fileHash: SHA256_HASH, limit: -1 });
      expect(result.success).toBe(false);
    });

    it('accepts limit at its boundary values (0 and 40)', () => {
      expect(
        GetFileBehavioursInputSchema.safeParse({ fileHash: SHA256_HASH, limit: 0 }).success
      ).toBe(true);
      expect(
        GetFileBehavioursInputSchema.safeParse({ fileHash: SHA256_HASH, limit: 40 }).success
      ).toBe(true);
    });

    it('calls the behaviours endpoint with the hash and x-tool header, and returns populated data as-is', async () => {
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

      const result = await handler(mockContext, { fileHash: SHA256_HASH });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe(`https://www.virustotal.com/api/v3/files/${SHA256_HASH}/behaviours`);
      expect(call[1]).toMatchObject({ headers: { 'x-tool': 'Elastic' } });
      expect(result).toEqual(apiResponse);
    });

    it('resolves with an empty collection for a hash known to GTI but never sandboxed', async () => {
      mockClient.get.mockResolvedValue({
        data: { data: [], meta: { count: 0 } },
      });

      const result = await handler(mockContext, { fileHash: SHA256_HASH });

      expect(result).toEqual({ data: [], meta: { count: 0 } });
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
    const handler = GoogleThreatIntelligenceConnector.actions.getFileBehaviours.handler;

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
