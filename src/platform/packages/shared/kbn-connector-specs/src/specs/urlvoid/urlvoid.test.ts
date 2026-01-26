/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { URLVoidConnector } from './urlvoid';

describe('URLVoidConnector', () => {
  const mockClient = {
    get: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: {},
    secrets: {
      authType: 'api_key_header' as const,
      'X-Api-Key': 'test-api-key',
    },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scanDomain action', () => {
    it('should scan domain and return reputation details', async () => {
      const mockResponse = {
        data: {
          reputation: {
            safety_score: 95,
            risk_score: 5,
          },
          detections: 1,
          engines: {
            total: 30,
            detected: 1,
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await URLVoidConnector.actions.scanDomain.handler(mockContext, {
        domain: 'example.com',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.urlvoid.com/api1000/test-api-key/host/example.com'
      );
      expect(result).toEqual({
        domain: 'example.com',
        reputation: {
          safety_score: 95,
          risk_score: 5,
        },
        detections: 1,
        engines: {
          total: 30,
          detected: 1,
        },
      });
    });

    it('should handle clean domain with no detections', async () => {
      const mockResponse = {
        data: {
          reputation: {
            safety_score: 100,
            risk_score: 0,
          },
          detections: 0,
          engines: {
            total: 30,
            detected: 0,
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await URLVoidConnector.actions.scanDomain.handler(mockContext, {
        domain: 'google.com',
      })) as { detections: number; reputation: { safety_score: number } };

      expect(result.detections).toBe(0);
      expect(result.reputation.safety_score).toBe(100);
    });
  });

  describe('checkUrl action', () => {
    it('should check URL and extract domain for scanning', async () => {
      const mockResponse = {
        data: {
          reputation: {
            safety_score: 90,
            risk_score: 10,
          },
          detections: 2,
          engines: {
            total: 30,
            detected: 2,
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await URLVoidConnector.actions.checkUrl.handler(mockContext, {
        url: 'https://suspicious.example.com/path',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.urlvoid.com/api1000/test-api-key/host/suspicious.example.com'
      );
      expect(result).toEqual({
        url: 'https://suspicious.example.com/path',
        domain: 'suspicious.example.com',
        reputation: {
          safety_score: 90,
          risk_score: 10,
        },
        detections: 2,
        engines: {
          total: 30,
          detected: 2,
        },
      });
    });

    it('should handle URL with subdomain', async () => {
      const mockResponse = {
        data: {
          reputation: { safety_score: 100, risk_score: 0 },
          detections: 0,
          engines: { total: 30, detected: 0 },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await URLVoidConnector.actions.checkUrl.handler(mockContext, {
        url: 'https://blog.example.com/article',
      })) as { domain: string };

      expect(result.domain).toBe('blog.example.com');
    });
  });

  describe('getDomainInfo action', () => {
    it('should retrieve comprehensive domain information', async () => {
      const mockResponse = {
        data: {
          reputation: {
            safety_score: 85,
            risk_score: 15,
          },
          ip: '1.2.3.4',
          country: 'United States',
          registrar: 'GoDaddy',
          domain_age: '5 years',
          detections: 3,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await URLVoidConnector.actions.getDomainInfo.handler(mockContext, {
        domain: 'example.com',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.urlvoid.com/api1000/test-api-key/host/example.com'
      );
      expect(result).toEqual({
        domain: 'example.com',
        reputation: {
          safety_score: 85,
          risk_score: 15,
        },
        ip: '1.2.3.4',
        country: 'United States',
        registrar: 'GoDaddy',
        created: '5 years',
        detections: 3,
      });
    });
  });

  describe('scanDomainStats action', () => {
    it('should retrieve API usage statistics', async () => {
      const mockResponse = {
        data: {
          queries_remaining: 450,
          queries_used: 50,
          plan: 'premium',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await URLVoidConnector.actions.scanDomainStats.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.urlvoid.com/api1000/test-api-key/stats/remained'
      );
      expect(result).toEqual({
        queriesRemaining: 450,
        queriesUsed: 50,
        plan: 'premium',
      });
    });

    it('should handle low remaining queries', async () => {
      const mockResponse = {
        data: {
          queries_remaining: 10,
          queries_used: 990,
          plan: 'basic',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await URLVoidConnector.actions.scanDomainStats.handler(mockContext, {})) as {
        queriesRemaining: number;
        queriesUsed: number;
      };

      expect(result.queriesRemaining).toBe(10);
      expect(result.queriesUsed).toBe(990);
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      const mockResponse = {
        data: {
          queries_remaining: 500,
          queries_used: 0,
          plan: 'premium',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!URLVoidConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await URLVoidConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.urlvoid.com/api1000/test-api-key/stats/remained'
      );
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to URLVoid API',
      });
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid API key'));

      if (!URLVoidConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await URLVoidConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Failed to connect');
    });
  });
});
