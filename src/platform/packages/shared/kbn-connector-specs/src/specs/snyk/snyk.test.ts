/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { SnykConnector } from './snyk';

const BASE_URL = 'https://api.snyk.io';
const ORG_ID = 'test-org-id';
const PROJECT_ID = 'test-project-id';

describe('SnykConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { orgId: ORG_ID, projectId: PROJECT_ID, apiUrl: BASE_URL },
    log: {},
  } as unknown as ActionContext;

  const missingConfigContext = {
    client: mockClient,
    log: {},
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAggregatedIssues action', () => {
    it('calls the aggregated-issues endpoint with default filters', async () => {
      mockClient.post.mockResolvedValue({ data: { issues: [{ id: 'SNYK-JS-FOO-1' }] } });

      const result = await SnykConnector.actions.getAggregatedIssues.handler(mockContext, {});

      expect(mockClient.post).toHaveBeenCalledWith(
        `${BASE_URL}/v1/org/${ORG_ID}/project/${PROJECT_ID}/aggregated-issues`,
        {
          data: {
            filters: { ignored: false },
            includeDescription: true,
            includeIntroducedThrough: true,
          },
        }
      );
      expect(result).toEqual({ issues: [{ id: 'SNYK-JS-FOO-1' }] });
    });

    it('forwards custom filters and flags', async () => {
      mockClient.post.mockResolvedValue({ data: { issues: [] } });

      await SnykConnector.actions.getAggregatedIssues.handler(mockContext, {
        filters: { ignored: true, severity: ['critical', 'high'] },
        includeDescription: false,
        includeIntroducedThrough: false,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: {
            filters: { ignored: true, severity: ['critical', 'high'] },
            includeDescription: false,
            includeIntroducedThrough: false,
          },
        })
      );
    });

    it('throws when config is missing', async () => {
      await expect(
        SnykConnector.actions.getAggregatedIssues.handler(missingConfigContext, {})
      ).rejects.toThrow('Snyk connector configuration is missing');
    });
  });

  describe('getVulnerability action', () => {
    it('fetches vulnerability details by issue number', async () => {
      const mockVuln = { id: 'SNYK-JS-LODASH-567746', severity: 'high' };
      mockClient.get.mockResolvedValue({ data: mockVuln });

      const result = await SnykConnector.actions.getVulnerability.handler(mockContext, {
        issueNumber: 'SNYK-JS-LODASH-567746',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/v1/vuln/SNYK-JS-LODASH-567746`);
      expect(result).toEqual(mockVuln);
    });

    it('throws when config is missing', async () => {
      await expect(
        SnykConnector.actions.getVulnerability.handler(missingConfigContext, {
          issueNumber: 'SNYK-JS-FOO-1',
        })
      ).rejects.toThrow('Snyk connector configuration is missing');
    });
  });

  describe('getVulnerabilityPaths action', () => {
    it('fetches dependency paths for an issue', async () => {
      const mockPaths = { paths: [[{ name: 'lodash', version: '4.17.20' }]] };
      mockClient.get.mockResolvedValue({ data: mockPaths });

      const result = await SnykConnector.actions.getVulnerabilityPaths.handler(mockContext, {
        issueNumber: 'SNYK-JS-LODASH-567746',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${BASE_URL}/v1/org/${ORG_ID}/project/${PROJECT_ID}/history/latest/issue/SNYK-JS-LODASH-567746/paths`
      );
      expect(result).toEqual(mockPaths);
    });

    it('throws when config is missing', async () => {
      await expect(
        SnykConnector.actions.getVulnerabilityPaths.handler(missingConfigContext, {
          issueNumber: 'SNYK-JS-FOO-1',
        })
      ).rejects.toThrow('Snyk connector configuration is missing');
    });
  });

  describe('getIssueIgnore action', () => {
    it('fetches the current ignore entry for an issue', async () => {
      const mockIgnore = {
        '*': [{ reason: 'Not exploitable', expires: '2027-01-01', reasonType: 'not-vulnerable' }],
      };
      mockClient.get.mockResolvedValue({ data: mockIgnore });

      const result = await SnykConnector.actions.getIssueIgnore.handler(mockContext, {
        issueNumber: 'SNYK-JS-LODASH-567746',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${BASE_URL}/v1/org/${ORG_ID}/project/${PROJECT_ID}/ignore/SNYK-JS-LODASH-567746`
      );
      expect(result).toEqual(mockIgnore);
    });

    it('throws when config is missing', async () => {
      await expect(
        SnykConnector.actions.getIssueIgnore.handler(missingConfigContext, {
          issueNumber: 'SNYK-JS-FOO-1',
        })
      ).rejects.toThrow('Snyk connector configuration is missing');
    });
  });

  describe('applyIgnoreExtension action', () => {
    const ignoreInput = {
      issueNumber: 'SNYK-JS-LODASH-567746',
      expires: '2027-01-16',
      reason: 'Not exploitable in production',
      reasonType: 'not-vulnerable' as const,
      disregardIfFixable: false,
      ignorePath: '*',
    };

    it('sends PUT with correctly shaped body array', async () => {
      mockClient.put.mockResolvedValue({ data: { ok: true } });

      const result = await SnykConnector.actions.applyIgnoreExtension.handler(
        mockContext,
        ignoreInput
      );

      expect(mockClient.put).toHaveBeenCalledWith(
        `${BASE_URL}/v1/org/${ORG_ID}/project/${PROJECT_ID}/ignore/SNYK-JS-LODASH-567746`,
        {
          data: [
            {
              ignorePath: '*',
              reason: 'Not exploitable in production',
              reasonType: 'not-vulnerable',
              disregardIfFixable: false,
              expires: '2027-01-16',
            },
          ],
        }
      );
      expect(result).toEqual({ ok: true });
    });

    it('uses default reasonType and ignorePath when omitted', async () => {
      mockClient.put.mockResolvedValue({ data: {} });

      await SnykConnector.actions.applyIgnoreExtension.handler(mockContext, {
        issueNumber: 'SNYK-JS-LODASH-567746',
        expires: '2027-01-16',
        reason: 'Not exploitable',
        reasonType: 'temporary-ignore',
        disregardIfFixable: false,
        ignorePath: '*',
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ reasonType: 'temporary-ignore', ignorePath: '*' }),
          ]),
        })
      );
    });

    it('throws when config is missing', async () => {
      await expect(
        SnykConnector.actions.applyIgnoreExtension.handler(missingConfigContext, ignoreInput)
      ).rejects.toThrow('Snyk connector configuration is missing');
    });
  });

  describe('test handler', () => {
    it('returns ok when the org projects endpoint is reachable', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      if (!SnykConnector.test) throw new Error('test handler not defined');
      const result = await SnykConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/v1/org/${ORG_ID}/project`);
      expect(result).toEqual({ ok: true, message: 'Successfully connected to Snyk API' });
    });

    it('returns failure when the request throws', async () => {
      mockClient.get.mockRejectedValue(new Error('Network error'));

      if (!SnykConnector.test) throw new Error('test handler not defined');
      const result = await SnykConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Failed to connect');
    });

    it('returns failure when config is missing', async () => {
      if (!SnykConnector.test) throw new Error('test handler not defined');
      const result = await SnykConnector.test.handler(missingConfigContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Snyk connector configuration is missing');
    });
  });
});
