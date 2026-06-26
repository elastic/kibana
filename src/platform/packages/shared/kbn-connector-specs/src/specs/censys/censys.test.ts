/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { CensysConnector } from './censys';
import { CensEyeCreateAnalysisJobInputSchema } from './types';

jest.mock('@kbn/repo-info', () => ({
  kibanaPackageJson: { version: '9.4.0' },
}));

const ORGANIZATION_ID = '11111111-2222-3333-4444-555555555555';

describe('CensysConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { organizationId: ORGANIZATION_ID },
    log: {},
    secrets: { authType: 'bearer', token: 'censys_pat_test' },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const expectOrgAndUserAgent = (call: unknown[]) => {
    const config = call[1] as { params: Record<string, unknown>; headers: Record<string, string> };
    expect(config.params).toMatchObject({ organization_id: ORGANIZATION_ID });
    expect(config.headers['User-Agent']).toMatch(
      /^CensysKibana\/\S+ \(Kibana\/\S+; Node\/\S+; ts=\d+\)$/
    );
  };

  describe('getHost', () => {
    it('calls the host endpoint with organization_id and User-Agent', async () => {
      mockClient.get.mockResolvedValue({ data: { result: { resource: { ip: '8.8.8.8' } } } });
      const result = await CensysConnector.actions.getHost.handler(mockContext, {
        host: '8.8.8.8',
      });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe('https://api.platform.censys.io/v3/global/asset/host/8.8.8.8');
      expectOrgAndUserAgent(call);
      expect(result).toEqual({ result: { resource: { ip: '8.8.8.8' } } });
    });

    it('calls the host endpoint with organization_id and User-Agent for IPv6', async () => {
      mockClient.get.mockResolvedValue({ data: { result: { resource: { ip: '2001:4860:4860::8888' } } } });
      await CensysConnector.actions.getHost.handler(mockContext, {
        host: '2001:4860:4860::8888',
      });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe('https://api.platform.censys.io/v3/global/asset/host/2001:4860:4860::8888');
      expectOrgAndUserAgent(call);
    });
  });

  describe('getWebProperty', () => {
    it('composes the webproperty_id as hostname:port', async () => {
      mockClient.get.mockResolvedValue({ data: { result: { resource: { hostname: 'example.com', port: 443 } } } });
      await CensysConnector.actions.getWebProperty.handler(mockContext, {
        hostname: 'example.com',
        port: 443,
      });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe(
        'https://api.platform.censys.io/v3/global/asset/webproperty/example.com%3A443'
      );
    });

    it('composes the webproperty_id for an IPv4 host', async () => {
      mockClient.get.mockResolvedValue({ data: { result: { resource: { hostname: '8.8.8.8', port: 443 } } } });
      await CensysConnector.actions.getWebProperty.handler(mockContext, {
        hostname: '8.8.8.8',
        port: 443,
      });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe(
        'https://api.platform.censys.io/v3/global/asset/webproperty/8.8.8.8%3A443'
      );
    });

    it('brackets IPv6 when composing the webproperty_id', async () => {
      mockClient.get.mockResolvedValue({ data: { result: { resource: { hostname: '2001:4860:4860::8888', port: 443 } } } });
      await CensysConnector.actions.getWebProperty.handler(mockContext, {
        hostname: '2001:4860:4860::8888',
        port: 443,
      });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe(
        'https://api.platform.censys.io/v3/global/asset/webproperty/%5B2001%3A4860%3A4860%3A%3A8888%5D%3A443'
      );
    });
  });

  describe('getCertificate', () => {
    it('hits the certificate endpoint with the sha256', async () => {
      const sha256 = 'a'.repeat(64);
      mockClient.get.mockResolvedValue({ data: { result: { resource: { fingerprint_sha256: sha256 } } } });
      await CensysConnector.actions.getCertificate.handler(mockContext, {
        certificate: sha256,
      });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe(`https://api.platform.censys.io/v3/global/asset/certificate/${sha256}`);
    });
  });

  describe('getHostHistory', () => {
    it('maps user startTime/endTime to Censys API params (start_time > end_time)', async () => {
      mockClient.get.mockResolvedValue({ data: { result: { events: [] } } });
      const userStartTime = '2025-01-01T00:00:00Z';
      const userEndTime = '2025-01-31T23:59:59Z';
      await CensysConnector.actions.getHostHistory.handler(mockContext, {
        host: '1.1.1.1',
        startTime: userStartTime,
        endTime: userEndTime,
      });
      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe('https://api.platform.censys.io/v3/global/asset/host/1.1.1.1/timeline');
      // Censys expects start_time > end_time; connector input uses startTime < endTime.
      expect(call[1].params).toMatchObject({
        start_time: userEndTime,
        end_time: userStartTime,
        organization_id: ORGANIZATION_ID,
      });
    });
  });

  describe('rescan', () => {
    it('posts a service rescan body', async () => {
      mockClient.post.mockResolvedValue({ result: { tracked_scan_id: 'scan-1' } });
      await CensysConnector.actions.rescan.handler(mockContext, {
        type: 'service',
        ip: '8.8.8.8',
        port: 443,
        protocol: 'HTTP',
        transportProtocol: 'tcp',
      });
      const call = mockClient.post.mock.calls[0];
      expect(call[0]).toBe('https://api.platform.censys.io/v3/global/scans/rescan');
      expect(call[1]).toEqual({
        target: { service_id: { ip: '8.8.8.8', port: 443, protocol: 'HTTP', transport_protocol: 'tcp' } },
      });
    });

    it('posts a web property rescan body', async () => {
      mockClient.post.mockResolvedValue({ data: { scan_id: 'scan-2' } });
      await CensysConnector.actions.rescan.handler(mockContext, {
        type: 'webproperty',
        hostname: 'example.com',
        port: 443,
      });
      const call = mockClient.post.mock.calls[0];
      expect(call[1]).toEqual({ target: { web_origin: { hostname: 'example.com', port: 443 } } });
    });

    it('posts a web property rescan body with an IPv4 host', async () => {
      mockClient.post.mockResolvedValue({ data: { scan_id: 'scan-3' } });
      await CensysConnector.actions.rescan.handler(mockContext, {
        type: 'webproperty',
        hostname: '8.8.8.8',
        port: 443,
      });
      const call = mockClient.post.mock.calls[0];
      expect(call[1]).toEqual({ target: { web_origin: { hostname: '8.8.8.8', port: 443 } } });
    });
  });

  describe('scanStatus', () => {
    it('returns the scan status payload from the API', async () => {
      const scanStatusResponse = {
        result: {
          tracked_scan_id: 'scan-1',
          tasks: [
            {
              description: 'Rescanning SNMP',
              status: 'completed',
              update_time: '2026-05-19T10:54:27Z',
            },
          ],
          target: {
            service_id: {
              ip: '8.8.8.8',
              port: 443,
              protocol: 'HTTP',
              transportProtocol: 'tcp',
            },
          },
          completed: true,
          create_time: '2026-05-27T10:53:48Z',
        },
      };
      mockClient.get.mockResolvedValue({ data: scanStatusResponse });

      const result = await CensysConnector.actions.scanStatus.handler(mockContext, {
        scanId: 'scan-1',
      });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe('https://api.platform.censys.io/v3/global/scans/scan-1');
      expectOrgAndUserAgent(call);
      expect(result).toEqual(scanStatusResponse);
    });
  });

  describe('censEyeCreateAnalysisJob', () => {
    it('rejects empty input', () => {
      expect(CensEyeCreateAnalysisJobInputSchema.safeParse({}).success).toBe(false);
    });

    it('accepts a typed target and rejects one missing the type discriminator', () => {
      expect(
        CensEyeCreateAnalysisJobInputSchema.safeParse({ type: 'host', host: '8.8.8.8' }).success
      ).toBe(true);
      expect(
        CensEyeCreateAnalysisJobInputSchema.safeParse({ host: '8.8.8.8' }).success
      ).toBe(false);
    });

    it('submits a host Censeye job', async () => {
      mockClient.post.mockResolvedValue({ data: { job_id: 'job-1' } });
      await CensysConnector.actions.censEyeCreateAnalysisJob.handler(mockContext, {
        type: 'host',
        host: '8.8.8.8',
      });
      const call = mockClient.post.mock.calls[0];
      expect(call[0]).toBe('https://api.platform.censys.io/v3/threat-hunting/censeye/jobs');
      expect(call[1]).toEqual({ target: { host_id: '8.8.8.8' } });
    });

    it('submits a webproperty Censeye job', async () => {
      mockClient.post.mockResolvedValue({ data: { job_id: 'job-2' } });
      await CensysConnector.actions.censEyeCreateAnalysisJob.handler(mockContext, {
        type: 'webproperty',
        hostname: 'example.com',
        port: 443,
      });
      const call = mockClient.post.mock.calls[0];
      expect(call[1]).toEqual({ target: { webproperty_id: 'example.com:443' } });
    });

    it('submits a webproperty Censeye job with an IPv4 webPropertyId', async () => {
      mockClient.post.mockResolvedValue({ data: { job_id: 'job-2b' } });
      await CensysConnector.actions.censEyeCreateAnalysisJob.handler(mockContext, {
        type: 'webproperty',
        hostname: '8.8.8.8',
        port: 443,
      });
      const call = mockClient.post.mock.calls[0];
      expect(call[1]).toEqual({ target: { webproperty_id: '8.8.8.8:443' } });
    });

    it('brackets IPv6 hosts in the webproperty_id body field', async () => {
      mockClient.post.mockResolvedValue({ data: { job_id: 'job-2c' } });
      await CensysConnector.actions.censEyeCreateAnalysisJob.handler(mockContext, {
        type: 'webproperty',
        hostname: '2001:4860:4860::8888',
        port: 443,
      });
      const call = mockClient.post.mock.calls[0];
      expect(call[1]).toEqual({
        target: { webproperty_id: '[2001:4860:4860::8888]:443' },
      });
    });

    it('submits a certificate Censeye job', async () => {
      mockClient.post.mockResolvedValue({ data: { job_id: 'job-3' } });
      const sha256 = 'b'.repeat(64);
      await CensysConnector.actions.censEyeCreateAnalysisJob.handler(mockContext, {
        type: 'certificate',
        certificate: sha256,
      });
      const call = mockClient.post.mock.calls[0];
      expect(call[1]).toEqual({ target: { certificate_id: sha256 } });
    });
  });

  describe('censEyeJobStatus', () => {
    it('returns the Censeye job status payload from the API', async () => {
      const jobStatusResponse = {
        result: {
          job_id: 'job-1',
          target: {
            certificate_id: 'b'.repeat(64),
          },
          state: 'completed',
          at_time: '2026-05-19T11:54:32.084431264Z',
          create_time: '2026-05-19T11:54:32.227616657Z',
          update_time: '2026-05-19T11:54:51.303523067Z',
          delete_time: '2026-06-19T11:54:32.120201545Z',
          result_count: 4,
        },
      };
      mockClient.get.mockResolvedValue({ data: jobStatusResponse });

      const result = await CensysConnector.actions.censEyeJobStatus.handler(mockContext, {
        jobId: 'job-1',
      });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe('https://api.platform.censys.io/v3/threat-hunting/censeye/jobs/job-1');
      expectOrgAndUserAgent(call);
      expect(result).toEqual(jobStatusResponse);
    });
  });

  describe('censEyeJobResult', () => {
    it('returns the Censeye job results payload from the API', async () => {
      const jobResultsResponse = {
        result: {
          results: [
            {
              count: 474759325,
              field_value_pairs: [
                {
                  field: 'cert.parsed.issuer.common_name',
                  value: 'WR1',
                },
              ],
            },
            {
              count: 99,
              field_value_pairs: [
                {
                  field: 'cert.parsed.subject_dn',
                  value: 'CN=censys.com',
                },
              ],
            },
            {
              count: 1063244067,
              field_value_pairs: [
                {
                  field: 'cert.parsed.ja4x',
                  value: 'f373a9f83c6b_7023c563de38_f3c18a12a8e2',
                },
              ],
            },
            {
              count: 474756989,
              field_value_pairs: [
                {
                  field: 'cert.parsed.issuer_dn',
                  value: 'C=US, O=Google Trust Services, CN=WR1',
                },
              ],
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue({ data: jobResultsResponse });

      const result = await CensysConnector.actions.censEyeJobResult.handler(mockContext, {
        jobId: 'job-1',
      });

      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe(
        'https://api.platform.censys.io/v3/threat-hunting/censeye/jobs/job-1/results'
      );
      expectOrgAndUserAgent(call);
      expect(call[1].params).toMatchObject({ organization_id: ORGANIZATION_ID });
      expect(result).toEqual(jobResultsResponse);
    });
  });

  describe('Censys API error handling', () => {
    it('throws an enriched error using detail from an RFC 7807 ErrorModel response', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 400,
          data: { title: 'Bad Request', detail: 'Invalid host_id' },
        },
      });

      await expect(
        CensysConnector.actions.getHost.handler(mockContext, { host: '8.8.8.' })
      ).rejects.toThrow('Censys API error (400): Invalid host_id');
    });

    it('appends per-field errors[] when present', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 422,
          data: {
            title: 'Unprocessable Entity',
            status: 422,
            detail: 'validation failed',
            errors: [
              {
                message: 'Invalid host id: ip address is not valid',
                location: 'path.host_id',
                value: '8.8.8.',
              },
            ],
          },
        },
      });

      await expect(
        CensysConnector.actions.getHost.handler(mockContext, { host: '8.8.8.8' })
      ).rejects.toThrow(
        'Censys API error (422): validation failed - path.host_id: Invalid host id: ip address is not valid'
      );
    });

    it('falls back to title when detail is missing', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 404, data: { title: 'Not Found' } },
      });

      await expect(
        CensysConnector.actions.getHost.handler(mockContext, { host: '8.8.8.8' })
      ).rejects.toThrow('Censys API error (404): Not Found');
    });

    it('uses message from a 401 AuthenticationError response', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 401, data: { message: 'Access token is not active' } },
      });

      await expect(
        CensysConnector.actions.getHost.handler(mockContext, { host: '8.8.8.8' })
      ).rejects.toThrow('Censys API error (401): Access token is not active');
    });

    it('rethrows the original error when the response body is not Censys-shaped', async () => {
      const networkError = new Error('ECONNREFUSED');
      mockClient.get.mockRejectedValue(networkError);

      await expect(
        CensysConnector.actions.getHost.handler(mockContext, { host: '8.8.8.8' })
      ).rejects.toThrow('ECONNREFUSED');
    });
  });

  describe('test handler', () => {
    it('returns ok on success', async () => {
      mockClient.get.mockResolvedValue({ data: { organization: { id: ORGANIZATION_ID } } });
      if (!CensysConnector.test) throw new Error('Test handler not defined');
      const result = await CensysConnector.test.handler(mockContext);
      const call = mockClient.get.mock.calls[0];
      expect(call[0]).toBe(
        `https://api.platform.censys.io/v3/accounts/organizations/${ORGANIZATION_ID}`
      );
      expect(result.ok).toBe(true);
    });

    it('returns ok=false on API failure', async () => {
      mockClient.get.mockRejectedValue(new Error('Unauthorized'));
      if (!CensysConnector.test) throw new Error('Test handler not defined');
      const result = await CensysConnector.test.handler(mockContext);
      expect(result.ok).toBe(false);
      expect(result.message).toContain('Unauthorized');
    });

    it('returns ok=false with an enriched Censys auth error when 401 is returned', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 401, data: { message: 'Access token is not active' } },
      });
      if (!CensysConnector.test) throw new Error('Test handler not defined');
      const result = await CensysConnector.test.handler(mockContext);
      expect(result.ok).toBe(false);
      expect(result.message).toBe('Censys API error (401): Access token is not active');
    });

    it('returns ok=false when organizationId is missing', async () => {
      if (!CensysConnector.test) throw new Error('Test handler not defined');
      const ctxNoOrg = { ...mockContext, config: {} } as unknown as ActionContext;
      const result = await CensysConnector.test.handler(ctxNoOrg);
      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/organization ID/i);
    });
  });
});
