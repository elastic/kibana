/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { ShodanConnector } from './shodan';

describe('ShodanConnector', () => {
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

  describe('searchHosts action', () => {
    it('should search hosts with query and pagination', async () => {
      const mockResponse = {
        data: {
          matches: [
            { ip_str: '1.2.3.4', port: 22, transport: 'tcp' },
            { ip_str: '5.6.7.8', port: 80, transport: 'tcp' },
          ],
          total: 1000,
          facets: { country: { US: 500, CN: 300 } },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await ShodanConnector.actions.searchHosts.handler(mockContext, {
        query: 'apache',
        page: 1,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.shodan.io/shodan/host/search', {
        params: {
          query: 'apache',
          page: 1,
          key: 'test-api-key',
        },
      });
      expect(result).toEqual({
        matches: [
          { ip_str: '1.2.3.4', port: 22, transport: 'tcp' },
          { ip_str: '5.6.7.8', port: 80, transport: 'tcp' },
        ],
        total: 1000,
        facets: { country: { US: 500, CN: 300 } },
      });
    });

    it('should use default page when not provided', async () => {
      const mockResponse = {
        data: {
          matches: [],
          total: 0,
          facets: {},
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await ShodanConnector.actions.searchHosts.handler(mockContext, {
        query: 'nginx',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.shodan.io/shodan/host/search', {
        params: {
          query: 'nginx',
          page: 1,
          key: 'test-api-key',
        },
      });
    });
  });

  describe('getHostInfo action', () => {
    it('should retrieve detailed host information', async () => {
      const mockResponse = {
        data: {
          ip_str: '8.8.8.8',
          ports: [53, 443],
          hostnames: ['dns.google'],
          city: 'Mountain View',
          country_name: 'United States',
          org: 'Google LLC',
          data: [
            { port: 53, protocol: 'udp', service: 'dns' },
            { port: 443, protocol: 'tcp', service: 'https' },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await ShodanConnector.actions.getHostInfo.handler(mockContext, {
        ip: '8.8.8.8',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.shodan.io/shodan/host/8.8.8.8', {
        params: { key: 'test-api-key' },
      });
      expect(result).toEqual({
        ip: '8.8.8.8',
        ports: [53, 443],
        hostnames: ['dns.google'],
        city: 'Mountain View',
        country: 'United States',
        org: 'Google LLC',
        data: [
          { port: 53, protocol: 'udp', service: 'dns' },
          { port: 443, protocol: 'tcp', service: 'https' },
        ],
      });
    });
  });

  describe('countResults action', () => {
    it('should count search results with facets', async () => {
      const mockResponse = {
        data: {
          total: 5000,
          facets: {
            country: { US: 2000, CN: 1500, DE: 1000 },
            port: { '22': 3000, '80': 2000 },
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await ShodanConnector.actions.countResults.handler(mockContext, {
        query: 'port:22',
        facets: 'country,port',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.shodan.io/shodan/host/count', {
        params: {
          query: 'port:22',
          facets: 'country,port',
          key: 'test-api-key',
        },
      });
      expect(result).toEqual({
        total: 5000,
        facets: {
          country: { US: 2000, CN: 1500, DE: 1000 },
          port: { '22': 3000, '80': 2000 },
        },
      });
    });

    it('should count results without facets', async () => {
      const mockResponse = {
        data: {
          total: 10000,
          facets: {},
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await ShodanConnector.actions.countResults.handler(mockContext, {
        query: 'nginx',
      })) as { total: number };

      expect(mockClient.get).toHaveBeenCalledWith('https://api.shodan.io/shodan/host/count', {
        params: {
          query: 'nginx',
          key: 'test-api-key',
        },
      });
      expect(result.total).toBe(10000);
    });
  });

  describe('getServices action', () => {
    it('should retrieve list of available services', async () => {
      const mockResponse = {
        data: {
          http: 'Hypertext Transfer Protocol',
          ssh: 'Secure Shell',
          ftp: 'File Transfer Protocol',
          dns: 'Domain Name System',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await ShodanConnector.actions.getServices.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith('https://api.shodan.io/shodan/services', {
        params: { key: 'test-api-key' },
      });
      expect(result).toEqual({
        services: {
          http: 'Hypertext Transfer Protocol',
          ssh: 'Secure Shell',
          ftp: 'File Transfer Protocol',
          dns: 'Domain Name System',
        },
      });
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      const mockResponse = {
        data: {
          ip_str: '8.8.8.8',
          ports: [53, 443],
          hostnames: ['dns.google'],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!ShodanConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await ShodanConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith('https://api.shodan.io/shodan/host/8.8.8.8', {
        params: { key: 'test-api-key' },
      });
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Shodan API',
      });
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid API key'));

      if (!ShodanConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await ShodanConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Failed to connect');
    });
  });
});
