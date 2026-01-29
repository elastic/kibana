/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { AbuseIPDBConnector } from './abuseipdb';

describe('AbuseIPDBConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: {},
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkIp action', () => {
    it('should call API with correct parameters and return IP details', async () => {
      const mockResponse = {
        data: {
          data: {
            ipAddress: '8.8.8.8',
            abuseConfidenceScore: 0,
            usageType: 'Data Center/Web Hosting/Transit',
            isp: 'Google LLC',
            countryCode: 'US',
            totalReports: 0,
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await AbuseIPDBConnector.actions.checkIp.handler(mockContext, {
        ipAddress: '8.8.8.8',
        maxAgeInDays: 30,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.abuseipdb.com/api/v2/check', {
        params: {
          ipAddress: '8.8.8.8',
          maxAgeInDays: 30,
        },
      });
      expect(result).toEqual({
        ipAddress: '8.8.8.8',
        abuseConfidenceScore: 0,
        usageType: 'Data Center/Web Hosting/Transit',
        isp: 'Google LLC',
        countryCode: 'US',
        totalReports: 0,
      });
    });

    it('should use default maxAgeInDays when not provided', async () => {
      const mockResponse = {
        data: {
          data: {
            ipAddress: '1.2.3.4',
            abuseConfidenceScore: 50,
            usageType: 'ISP',
            isp: 'Example ISP',
            countryCode: 'US',
            totalReports: 10,
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await AbuseIPDBConnector.actions.checkIp.handler(mockContext, {
        ipAddress: '1.2.3.4',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.abuseipdb.com/api/v2/check', {
        params: {
          ipAddress: '1.2.3.4',
          maxAgeInDays: 90,
        },
      });
    });
  });

  describe('reportIp action', () => {
    it('should report IP with categories and comment', async () => {
      const mockResponse = {
        data: {
          data: {
            ipAddress: '1.2.3.4',
            abuseConfidenceScore: 100,
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await AbuseIPDBConnector.actions.reportIp.handler(mockContext, {
        ip: '1.2.3.4',
        categories: [18, 22],
        comment: 'Malicious activity detected',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.abuseipdb.com/api/v2/report',
        expect.any(URLSearchParams),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      expect(result).toEqual({
        ipAddress: '1.2.3.4',
        abuseConfidenceScore: 100,
      });
    });
  });

  describe('getIpInfo action', () => {
    it('should retrieve detailed IP information', async () => {
      const mockResponse = {
        data: {
          data: {
            ipAddress: '8.8.8.8',
            isPublic: true,
            ipVersion: 4,
            isWhitelisted: false,
            abuseConfidenceScore: 0,
            countryCode: 'US',
            usageType: 'Data Center',
            isp: 'Google LLC',
            domain: 'google.com',
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await AbuseIPDBConnector.actions.getIpInfo.handler(mockContext, {
        ipAddress: '8.8.8.8',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.abuseipdb.com/api/v2/check', {
        params: {
          ipAddress: '8.8.8.8',
          verbose: true,
        },
      });
      expect(result).toEqual({
        ipAddress: '8.8.8.8',
        isPublic: true,
        ipVersion: 4,
        isWhitelisted: false,
        abuseConfidenceScore: 0,
        countryCode: 'US',
        usageType: 'Data Center',
        isp: 'Google LLC',
        domain: 'google.com',
      });
    });
  });

  describe('bulkCheck action', () => {
    it('should check network range in CIDR notation', async () => {
      const mockResponse = {
        data: {
          data: {
            networkAddress: '192.168.1.0',
            netmask: '255.255.255.0',
            reportedAddress: [{ ipAddress: '192.168.1.1', numReports: 5 }],
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await AbuseIPDBConnector.actions.bulkCheck.handler(mockContext, {
        network: '192.168.1.0/24',
        maxAgeInDays: 30,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.abuseipdb.com/api/v2/check-block', {
        params: {
          network: '192.168.1.0/24',
          maxAgeInDays: 30,
        },
      });
      expect(result).toEqual({
        networkAddress: '192.168.1.0',
        netmask: '255.255.255.0',
        reportedAddress: [{ ipAddress: '192.168.1.1', numReports: 5 }],
      });
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      const mockResponse = {
        data: {
          data: {
            ipAddress: '8.8.8.8',
            abuseConfidenceScore: 0,
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!AbuseIPDBConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await AbuseIPDBConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith('https://api.abuseipdb.com/api/v2/check', {
        params: { ipAddress: '8.8.8.8' },
      });
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to AbuseIPDB API',
      });
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Network error'));

      if (!AbuseIPDBConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await AbuseIPDBConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Failed to connect');
    });
  });
});
