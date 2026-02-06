/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { GreyNoiseConnector } from './greynoise';

describe('GreyNoiseConnector', () => {
  const mockClient = {
    get: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: {},
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getIpContext action', () => {
    it('should retrieve full IP context information', async () => {
      const mockResponse = {
        data: {
          ip: '1.2.3.4',
          seen: true,
          classification: 'malicious',
          first_seen: '2024-01-01',
          last_seen: '2024-01-15',
          actor: 'scanner',
          tags: ['web crawler', 'brute force'],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GreyNoiseConnector.actions.getIpContext.handler(mockContext, {
        ip: '1.2.3.4',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.greynoise.io/v2/noise/context/1.2.3.4'
      );
      expect(result).toEqual({
        ip: '1.2.3.4',
        seen: true,
        classification: 'malicious',
        firstSeen: '2024-01-01',
        lastSeen: '2024-01-15',
        actor: 'scanner',
        tags: ['web crawler', 'brute force'],
      });
    });

    it('should handle benign classification', async () => {
      const mockResponse = {
        data: {
          ip: '8.8.8.8',
          seen: true,
          classification: 'benign',
          first_seen: '2023-01-01',
          last_seen: '2024-01-15',
          actor: 'Google Public DNS',
          tags: ['DNS'],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await GreyNoiseConnector.actions.getIpContext.handler(mockContext, {
        ip: '8.8.8.8',
      })) as { classification: string; actor: string };

      expect(result.classification).toBe('benign');
      expect(result.actor).toBe('Google Public DNS');
    });
  });

  describe('quickLookup action', () => {
    it('should perform quick noise status lookup', async () => {
      const mockResponse = {
        data: {
          noise: true,
          code: '0x01',
          code_message: 'IP has been observed by GreyNoise',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GreyNoiseConnector.actions.quickLookup.handler(mockContext, {
        ip: '1.2.3.4',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.greynoise.io/v2/noise/quick/1.2.3.4'
      );
      expect(result).toEqual({
        ip: '1.2.3.4',
        noise: true,
        code: '0x01',
        codeMessage: 'IP has been observed by GreyNoise',
      });
    });

    it('should handle IP not in dataset', async () => {
      const mockResponse = {
        data: {
          noise: false,
          code: '0x00',
          code_message: 'IP has not been observed scanning the Internet',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await GreyNoiseConnector.actions.quickLookup.handler(mockContext, {
        ip: '192.168.1.1',
      })) as { noise: boolean; code: string };

      expect(result.noise).toBe(false);
      expect(result.code).toBe('0x00');
    });
  });

  describe('getMetadata action', () => {
    it('should retrieve IP metadata', async () => {
      const mockResponse = {
        data: {
          metadata: { tor: false, vpn: false, proxy: false },
          asn: 'AS15169',
          city: 'Mountain View',
          country: 'United States',
          country_code: 'US',
          organization: 'Google LLC',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GreyNoiseConnector.actions.getMetadata.handler(mockContext, {
        ip: '8.8.8.8',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.greynoise.io/v2/meta/metadata', {
        params: { ip: '8.8.8.8' },
      });
      expect(result).toEqual({
        ip: '8.8.8.8',
        metadata: { tor: false, vpn: false, proxy: false },
        asn: 'AS15169',
        city: 'Mountain View',
        country: 'United States',
        countryCode: 'US',
        organization: 'Google LLC',
      });
    });
  });

  describe('riotLookup action', () => {
    it('should check if IP is in RIOT list', async () => {
      const mockResponse = {
        data: {
          riot: true,
          category: 'public_dns',
          name: 'Google Public DNS',
          description: 'Google DNS Service',
          explanation: 'IP is part of known benign service',
          last_updated: '2024-01-15',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await GreyNoiseConnector.actions.riotLookup.handler(mockContext, {
        ip: '8.8.8.8',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.greynoise.io/v2/riot/8.8.8.8');
      expect(result).toEqual({
        ip: '8.8.8.8',
        riot: true,
        category: 'public_dns',
        name: 'Google Public DNS',
        description: 'Google DNS Service',
        explanation: 'IP is part of known benign service',
        lastUpdated: '2024-01-15',
      });
    });

    it('should handle IP not in RIOT list', async () => {
      const mockResponse = {
        data: {
          riot: false,
          category: null,
          name: null,
          description: null,
          explanation: null,
          last_updated: null,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await GreyNoiseConnector.actions.riotLookup.handler(mockContext, {
        ip: '1.2.3.4',
      })) as { riot: boolean };

      expect(result.riot).toBe(false);
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      const mockResponse = {
        data: {
          noise: false,
          code: '0x00',
          code_message: 'IP has not been observed',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!GreyNoiseConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await GreyNoiseConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.greynoise.io/v2/noise/quick/8.8.8.8'
      );
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to GreyNoise API',
      });
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('API key invalid'));

      if (!GreyNoiseConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await GreyNoiseConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Failed to connect');
    });
  });
});
