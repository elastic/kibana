/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { VirusTotalConnector } from './virustotal';

describe('VirusTotalConnector', () => {
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

  describe('scanFileHash action', () => {
    it('should scan file hash and return analysis results', async () => {
      const mockResponse = {
        data: {
          data: {
            id: '44d88612fea8a8f36de82e1278abb02f',
            attributes: {
              md5: '44d88612fea8a8f36de82e1278abb02f',
              sha1: '3395856ce81f2b7382dee72602f798b642f14140',
              sha256: '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
              last_analysis_stats: {
                malicious: 5,
                suspicious: 2,
                undetected: 63,
                harmless: 0,
              },
              last_analysis_date: 1609459200,
              last_modification_date: 1609459200,
            },
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await VirusTotalConnector.actions.scanFileHash.handler(mockContext, {
        hash: '44d88612fea8a8f36de82e1278abb02f',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.virustotal.com/api/v3/files/44d88612fea8a8f36de82e1278abb02f'
      );
      expect(result).toEqual({
        id: '44d88612fea8a8f36de82e1278abb02f',
        attributes: mockResponse.data.data.attributes,
        stats: {
          malicious: 5,
          suspicious: 2,
          undetected: 63,
          harmless: 0,
        },
      });
    });

    it('should handle SHA-256 hash', async () => {
      const mockResponse = {
        data: {
          data: {
            id: '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
            attributes: {
              sha256: '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
              last_analysis_stats: {
                malicious: 0,
                suspicious: 0,
                undetected: 70,
                harmless: 0,
              },
            },
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await VirusTotalConnector.actions.scanFileHash.handler(mockContext, {
        hash: '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
      })) as { id: string; stats: { malicious: number } };

      expect(result.stats.malicious).toBe(0);
      expect(result.id).toBe('275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f');
    });
  });

  describe('scanUrl action', () => {
    it('should submit URL for scanning and retrieve results', async () => {
      const mockSubmitResponse = {
        data: {
          data: {
            id: 'u-analysis-id-12345',
            type: 'analysis',
          },
        },
      };
      const mockAnalysisResponse = {
        data: {
          data: {
            attributes: {
              status: 'completed',
              stats: {
                malicious: 2,
                suspicious: 1,
                undetected: 67,
                harmless: 0,
              },
            },
          },
        },
      };
      mockClient.post.mockResolvedValue(mockSubmitResponse);
      mockClient.get.mockResolvedValue(mockAnalysisResponse);

      const result = await VirusTotalConnector.actions.scanUrl.handler(mockContext, {
        url: 'https://suspicious.example.com',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://www.virustotal.com/api/v3/urls',
        expect.any(URLSearchParams),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.virustotal.com/api/v3/analyses/u-analysis-id-12345'
      );
      expect(result).toEqual({
        id: 'u-analysis-id-12345',
        status: 'completed',
        stats: {
          malicious: 2,
          suspicious: 1,
          undetected: 67,
          harmless: 0,
        },
      });
    });

    it('should handle queued analysis status', async () => {
      const mockSubmitResponse = {
        data: {
          data: {
            id: 'u-analysis-id-67890',
            type: 'analysis',
          },
        },
      };
      const mockAnalysisResponse = {
        data: {
          data: {
            attributes: {
              status: 'queued',
              stats: {},
            },
          },
        },
      };
      mockClient.post.mockResolvedValue(mockSubmitResponse);
      mockClient.get.mockResolvedValue(mockAnalysisResponse);

      const result = (await VirusTotalConnector.actions.scanUrl.handler(mockContext, {
        url: 'https://example.com',
      })) as { status: string };

      expect(result.status).toBe('queued');
    });
  });

  describe('submitFile action', () => {
    it('should submit base64-encoded file for analysis', async () => {
      const mockResponse = {
        data: {
          data: {
            id: 'file-analysis-id-abc123',
            type: 'analysis',
            links: {
              self: 'https://www.virustotal.com/api/v3/analyses/file-analysis-id-abc123',
            },
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await VirusTotalConnector.actions.submitFile.handler(mockContext, {
        file: 'dGVzdCBmaWxlIGNvbnRlbnQ=',
        filename: 'test.txt',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://www.virustotal.com/api/v3/files',
        expect.any(FormData)
      );
      expect(result).toEqual({
        id: 'file-analysis-id-abc123',
        type: 'analysis',
        links: {
          self: 'https://www.virustotal.com/api/v3/analyses/file-analysis-id-abc123',
        },
      });
    });

    it('should handle file submission without filename', async () => {
      const mockResponse = {
        data: {
          data: {
            id: 'file-analysis-id-def456',
            type: 'analysis',
            links: {
              self: 'https://www.virustotal.com/api/v3/analyses/file-analysis-id-def456',
            },
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = (await VirusTotalConnector.actions.submitFile.handler(mockContext, {
        file: 'YW5vdGhlciB0ZXN0IGZpbGU=',
      })) as { id: string };

      expect(result.id).toBe('file-analysis-id-def456');
    });
  });

  describe('getIpReport action', () => {
    it('should retrieve IP address reputation report', async () => {
      const mockResponse = {
        data: {
          data: {
            id: '8.8.8.8',
            attributes: {
              reputation: 100,
              country: 'US',
              asn: 15169,
              as_owner: 'Google LLC',
              last_analysis_stats: {
                malicious: 0,
                suspicious: 0,
                undetected: 88,
                harmless: 0,
              },
            },
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await VirusTotalConnector.actions.getIpReport.handler(mockContext, {
        ip: '8.8.8.8',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.virustotal.com/api/v3/ip_addresses/8.8.8.8'
      );
      expect(result).toEqual({
        id: '8.8.8.8',
        attributes: mockResponse.data.data.attributes,
        reputation: 100,
        country: 'US',
      });
    });

    it('should handle malicious IP with negative reputation', async () => {
      const mockResponse = {
        data: {
          data: {
            id: '1.2.3.4',
            attributes: {
              reputation: -50,
              country: 'CN',
              asn: 12345,
              as_owner: 'Malicious ISP',
              last_analysis_stats: {
                malicious: 10,
                suspicious: 5,
                undetected: 73,
                harmless: 0,
              },
            },
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await VirusTotalConnector.actions.getIpReport.handler(mockContext, {
        ip: '1.2.3.4',
      })) as { reputation: number; attributes: { last_analysis_stats: { malicious: number } } };

      expect(result.reputation).toBe(-50);
      expect(result.attributes.last_analysis_stats.malicious).toBe(10);
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      const mockResponse = {
        data: {
          data: {
            id: '8.8.8.8',
            attributes: {
              reputation: 100,
              country: 'US',
            },
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!VirusTotalConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await VirusTotalConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://www.virustotal.com/api/v3/ip_addresses/8.8.8.8'
      );
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to VirusTotal API',
      });
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid API key'));

      if (!VirusTotalConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await VirusTotalConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Failed to connect');
    });
  });
});
