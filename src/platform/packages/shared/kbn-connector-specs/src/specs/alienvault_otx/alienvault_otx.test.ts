/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { AlienVaultOTXConnector } from './alienvault_otx';

describe('AlienVaultOTXConnector', () => {
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

  describe('getIndicator action', () => {
    it('should retrieve indicator information', async () => {
      const mockResponse = {
        data: {
          indicator: '8.8.8.8',
          type: 'IPv4',
          pulseCount: 5,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await AlienVaultOTXConnector.actions.getIndicator.handler(mockContext, {
        indicatorType: 'IPv4',
        indicator: '8.8.8.8',
        section: 'general',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://otx.alienvault.com/api/v1/indicators/IPv4/8.8.8.8/general'
      );
      expect(result).toEqual({
        indicator: '8.8.8.8',
        type: 'IPv4',
        data: mockResponse.data,
      });
    });

    it('should use default section when not provided', async () => {
      const mockResponse = {
        data: { indicator: 'example.com', type: 'domain' },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await AlienVaultOTXConnector.actions.getIndicator.handler(mockContext, {
        indicatorType: 'domain',
        indicator: 'example.com',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://otx.alienvault.com/api/v1/indicators/domain/example.com/general'
      );
    });
  });

  describe('searchPulses action', () => {
    it('should search pulses with query and pagination', async () => {
      const mockResponse = {
        data: {
          count: 100,
          results: [{ id: '1', name: 'Pulse 1' }],
          next: 'url-to-next-page',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await AlienVaultOTXConnector.actions.searchPulses.handler(mockContext, {
        query: 'malware',
        page: 2,
        limit: 10,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://otx.alienvault.com/api/v1/pulses/subscribed',
        {
          params: {
            q: 'malware',
            page: 2,
            limit: 10,
          },
        }
      );
      expect(result).toEqual({
        count: 100,
        results: [{ id: '1', name: 'Pulse 1' }],
        next: 'url-to-next-page',
      });
    });

    it('should search without query', async () => {
      const mockResponse = {
        data: {
          count: 50,
          results: [],
          next: null,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await AlienVaultOTXConnector.actions.searchPulses.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://otx.alienvault.com/api/v1/pulses/subscribed',
        {
          params: {
            page: 1,
            limit: 20,
          },
        }
      );
    });
  });

  describe('getPulse action', () => {
    it('should retrieve pulse details by ID', async () => {
      const mockResponse = {
        data: {
          id: 'pulse-123',
          name: 'Test Pulse',
          description: 'Test description',
          author_name: 'John Doe',
          created: '2024-01-01',
          modified: '2024-01-02',
          tags: ['malware', 'trojan'],
          indicators: [{ type: 'IPv4', indicator: '1.2.3.4' }],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await AlienVaultOTXConnector.actions.getPulse.handler(mockContext, {
        pulseId: 'pulse-123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://otx.alienvault.com/api/v1/pulses/pulse-123'
      );
      expect(result).toEqual({
        id: 'pulse-123',
        name: 'Test Pulse',
        description: 'Test description',
        author: 'John Doe',
        created: '2024-01-01',
        modified: '2024-01-02',
        tags: ['malware', 'trojan'],
        indicators: [{ type: 'IPv4', indicator: '1.2.3.4' }],
      });
    });
  });

  describe('getRelatedPulses action', () => {
    it('should retrieve related pulses for an indicator', async () => {
      const mockResponse = {
        data: {
          count: 3,
          results: [{ id: '1', name: 'Related Pulse 1' }],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await AlienVaultOTXConnector.actions.getRelatedPulses.handler(mockContext, {
        indicatorType: 'IPv4',
        indicator: '8.8.8.8',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://otx.alienvault.com/api/v1/indicators/IPv4/8.8.8.8/pulses'
      );
      expect(result).toEqual({
        indicator: '8.8.8.8',
        count: 3,
        pulses: [{ id: '1', name: 'Related Pulse 1' }],
      });
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      const mockResponse = {
        data: { count: 1, results: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!AlienVaultOTXConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await AlienVaultOTXConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://otx.alienvault.com/api/v1/pulses/subscribed',
        {
          params: { limit: 1 },
        }
      );
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to AlienVault OTX API',
      });
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Network error'));

      if (!AlienVaultOTXConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await AlienVaultOTXConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Failed to connect');
    });
  });
});
