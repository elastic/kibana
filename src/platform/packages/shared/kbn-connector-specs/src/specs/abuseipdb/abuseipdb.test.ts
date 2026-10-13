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
            lastReportedAt: null,
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
        lastReportedAt: null,
      });
    });

    it('should accept IPv6 addresses', async () => {
      expect(
        AbuseIPDBConnector.actions.checkIp.input.safeParse({
          ipAddress: '2001:4860:4860::8888',
        }).success
      ).toBe(true);

      mockClient.get.mockResolvedValue({
        data: {
          data: {
            ipAddress: '2001:4860:4860::8888',
            abuseConfidenceScore: 0,
            usageType: 'Data Center/Web Hosting/Transit',
            isp: 'Google LLC',
            countryCode: 'US',
            totalReports: 0,
            lastReportedAt: null,
          },
        },
      });

      await AbuseIPDBConnector.actions.checkIp.handler(mockContext, {
        ipAddress: '2001:4860:4860::8888',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.abuseipdb.com/api/v2/check', {
        params: {
          ipAddress: '2001:4860:4860::8888',
          maxAgeInDays: 90,
        },
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
            lastReportedAt: '2024-01-01T00:00:00+00:00',
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await AbuseIPDBConnector.actions.checkIp.handler(mockContext, {
        ipAddress: '1.2.3.4',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.abuseipdb.com/api/v2/check', {
        params: {
          ipAddress: '1.2.3.4',
          maxAgeInDays: 90,
        },
      });
      expect(result.lastReportedAt).toBe('2024-01-01T00:00:00+00:00');
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
      const body = mockClient.post.mock.calls[0][1] as URLSearchParams;
      expect(body.get('comment')).toBe('Malicious activity detected');
    });

    it('should omit comment from the request body when unset', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { ipAddress: '1.2.3.4', abuseConfidenceScore: 50 } },
      });

      await AbuseIPDBConnector.actions.reportIp.handler(mockContext, {
        ip: '1.2.3.4',
        categories: [18],
      });

      const body = mockClient.post.mock.calls[0][1] as URLSearchParams;
      expect(body.has('comment')).toBe(false);
    });

    it('should reject an empty comment string at the schema boundary', () => {
      expect(() =>
        AbuseIPDBConnector.actions.reportIp.input.parse({
          ip: '1.2.3.4',
          categories: [18],
          comment: '',
        })
      ).toThrow();
    });

    it('should accept IPv6 addresses at the schema boundary', () => {
      expect(
        AbuseIPDBConnector.actions.reportIp.input.safeParse({
          ip: '2001:4860:4860::8888',
          categories: [18],
        }).success
      ).toBe(true);
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
            totalReports: 0,
            lastReportedAt: null,
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
          maxAgeInDays: 90,
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
        totalReports: 0,
        lastReportedAt: null,
      });
    });

    it('should accept IPv6 addresses at the schema boundary', () => {
      expect(
        AbuseIPDBConnector.actions.getIpInfo.input.safeParse({
          ipAddress: '2001:4860:4860::8888',
        }).success
      ).toBe(true);
    });

    it('should pass through an explicit maxAgeInDays', async () => {
      mockClient.get.mockResolvedValue({
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
            totalReports: 0,
            lastReportedAt: null,
          },
        },
      });

      await AbuseIPDBConnector.actions.getIpInfo.handler(mockContext, {
        ipAddress: '8.8.8.8',
        maxAgeInDays: 30,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.abuseipdb.com/api/v2/check', {
        params: {
          ipAddress: '8.8.8.8',
          maxAgeInDays: 30,
          verbose: true,
        },
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

  describe('getBlacklist action', () => {
    it('should GET /blacklist with confidenceMinimum and limit', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          meta: { generatedAt: '2024-06-01T00:00:00+00:00' },
          data: [
            {
              ipAddress: '203.0.113.10',
              countryCode: 'US',
              abuseConfidenceScore: 100,
              lastReportedAt: '2024-05-31T12:00:00+00:00',
            },
          ],
        },
      });

      const result = await AbuseIPDBConnector.actions.getBlacklist.handler(mockContext, {
        confidenceMinimum: 90,
        limit: 25,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.abuseipdb.com/api/v2/blacklist', {
        params: {
          confidenceMinimum: 90,
          limit: 25,
        },
      });
      expect(result).toEqual({
        generatedAt: '2024-06-01T00:00:00+00:00',
        ips: [
          {
            ipAddress: '203.0.113.10',
            countryCode: 'US',
            abuseConfidenceScore: 100,
            lastReportedAt: '2024-05-31T12:00:00+00:00',
          },
        ],
      });
    });

    it('should default confidenceMinimum to 100 and limit to 10 when unset', async () => {
      mockClient.get.mockResolvedValue({
        data: { meta: {}, data: [] },
      });

      const result = await AbuseIPDBConnector.actions.getBlacklist.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith('https://api.abuseipdb.com/api/v2/blacklist', {
        params: {
          confidenceMinimum: 100,
          limit: 10,
        },
      });
      expect(result).toEqual({ generatedAt: null, ips: [] });
    });

    it('should coerce workflow string inputs for confidenceMinimum and limit', () => {
      const parsed = AbuseIPDBConnector.actions.getBlacklist.input.safeParse({
        confidenceMinimum: '90',
        limit: '10',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toEqual({ confidenceMinimum: 90, limit: 10 });
      }
    });
  });

  describe('test handler', () => {
    const testSpec = AbuseIPDBConnector.test;

    it('should be opted in for the Test tab', () => {
      expect(testSpec.enabled).toBe(true);
    });

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

      await expect(testSpec.handler(mockContext)).resolves.toEqual({});

      expect(mockClient.get).toHaveBeenCalledWith('https://api.abuseipdb.com/api/v2/check', {
        params: { ipAddress: '8.8.8.8' },
      });
    });

    it('should throw when API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Network error'));

      await expect(testSpec.handler(mockContext)).rejects.toThrow('Network error');
    });
  });
});
