/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { Workday } from './workday';

interface WorkdayListResponse {
  data: unknown[];
  total: number;
}

interface WorkdayItemResponse {
  id: string;
  [key: string]: unknown;
}

describe('Workday', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    request: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn(), error: jest.fn() },
    config: {
      tenantUrl: 'https://mycompany.workday.com',
      tenantName: 'mycompany',
    },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('has the correct connector id', () => {
      expect(Workday.metadata.id).toBe('.workday');
    });

    it('requires enterprise license', () => {
      expect(Workday.metadata.minimumLicense).toBe('enterprise');
    });

    it('is technical preview', () => {
      expect(Workday.metadata.isTechnicalPreview).toBe(true);
    });

    it('supports agentBuilder', () => {
      expect(Workday.metadata.supportedFeatureIds).toContain('agentBuilder');
    });
  });

  describe('auth', () => {
    it('supports oauth_authorization_code', () => {
      const types = (Workday.auth?.types as Array<string | { type: string }>).map((t) =>
        typeof t === 'string' ? t : t.type
      );
      expect(types).toContain('oauth_authorization_code');
    });

    it('hides the scope field', () => {
      const oauthType = (
        Workday.auth?.types as Array<
          string | { type: string; overrides?: { meta?: Record<string, unknown> } }
        >
      ).find((t) => typeof t === 'object' && t.type === 'oauth_authorization_code');
      expect(oauthType).toBeDefined();
      expect(typeof oauthType).toBe('object');
      if (typeof oauthType === 'object') {
        expect(oauthType.overrides?.meta).toHaveProperty('scope');
        const scopeMeta = oauthType.overrides?.meta?.scope as Record<string, unknown>;
        expect(scopeMeta.hidden).toBe(true);
      }
    });
  });

  describe('whoAmI action', () => {
    it('should return the current user worker profile', async () => {
      const mockResponse = {
        data: { id: 'wid-me', descriptor: 'Erik Currin', businessTitle: 'Engineer' },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Workday.actions.whoAmI.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/common/v1/mycompany/workers/me',
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(Workday.actions.whoAmI.handler(mockContext, {})).rejects.toThrow('Unauthorized');
    });
  });

  describe('searchWorkers action', () => {
    it('should search workers with default limit', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: 'wid-001', descriptor: 'Jane Smith', businessTitle: 'Software Engineer' },
            { id: 'wid-002', descriptor: 'John Doe', businessTitle: 'Product Manager' },
          ],
          total: 2,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.searchWorkers.handler(mockContext, {
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/common/v1/mycompany/workers',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should search workers by name', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 'wid-001', descriptor: 'Jane Smith', businessTitle: 'Software Engineer' }],
          total: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await Workday.actions.searchWorkers.handler(mockContext, {
        search: 'Jane',
        limit: 10,
        offset: 0,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/common/v1/mycompany/workers',
        { params: { limit: 10, offset: 0, search: 'Jane' } }
      );
    });

    it('should strip trailing slash from tenantUrl', async () => {
      const ctxWithTrailingSlash = {
        ...mockContext,
        config: { tenantUrl: 'https://mycompany.workday.com/', tenantName: 'mycompany' },
      } as unknown as ActionContext;
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.searchWorkers.handler(ctxWithTrailingSlash, { limit: 20 });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/common/v1/mycompany/workers',
        { params: { limit: 20 } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        Workday.actions.searchWorkers.handler(mockContext, { limit: 20 })
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('getWorker action', () => {
    it('should retrieve a worker by WID', async () => {
      const mockResponse = {
        data: {
          id: 'wid-001',
          descriptor: 'Jane Smith',
          businessTitle: 'Software Engineer',
          primarySupervisoryOrganization: { id: 'org-001', descriptor: 'Engineering' },
          hireDate: '2021-03-15',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.getWorker.handler(mockContext, {
        workerId: 'wid-001',
      })) as WorkdayItemResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/common/v1/mycompany/workers/wid-001',
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should URL-encode the workerId', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 'wid special' } });

      await Workday.actions.getWorker.handler(mockContext, { workerId: 'wid special/path' });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/common/v1/mycompany/workers/wid%20special%2Fpath',
        {}
      );
    });

    it('should propagate not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Worker not found'));

      await expect(
        Workday.actions.getWorker.handler(mockContext, { workerId: 'nonexistent' })
      ).rejects.toThrow('Worker not found');
    });
  });

  describe('listOrganizations action', () => {
    it('should list organizations with no filter', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: 'org-001', descriptor: 'Engineering', type: 'supervisory' },
            { id: 'org-002', descriptor: 'Finance', type: 'company' },
          ],
          total: 2,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listOrganizations.handler(mockContext, {
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/common/v1/mycompany/organizations',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should filter organizations by type', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listOrganizations.handler(mockContext, {
        type: 'supervisory',
        limit: 50,
        offset: 10,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/common/v1/mycompany/organizations',
        { params: { limit: 50, offset: 10, type: 'supervisory' } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Forbidden'));

      await expect(
        Workday.actions.listOrganizations.handler(mockContext, { limit: 20 })
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('getOrganization action', () => {
    it('should retrieve an organization by WID', async () => {
      const mockResponse = {
        data: {
          id: 'org-001',
          descriptor: 'Engineering',
          type: 'supervisory',
          manager: { id: 'wid-010', descriptor: 'Alice Manager' },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.getOrganization.handler(mockContext, {
        organizationId: 'org-001',
      })) as WorkdayItemResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/common/v1/mycompany/organizations/org-001',
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Organization not found'));

      await expect(
        Workday.actions.getOrganization.handler(mockContext, { organizationId: 'nonexistent' })
      ).rejects.toThrow('Organization not found');
    });
  });

  describe('listJobPostings action', () => {
    it('should list job postings with no filter', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'job-001',
              descriptor: 'Senior Software Engineer',
              status: 'open',
              location: 'San Francisco, CA',
            },
          ],
          total: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listJobPostings.handler(mockContext, {
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/recruiting/v4/mycompany/jobPostings',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should filter job postings by status', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listJobPostings.handler(mockContext, {
        status: 'open',
        limit: 10,
        offset: 5,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/recruiting/v4/mycompany/jobPostings',
        { params: { limit: 10, offset: 5, status: 'open' } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Service unavailable'));

      await expect(
        Workday.actions.listJobPostings.handler(mockContext, { limit: 20 })
      ).rejects.toThrow('Service unavailable');
    });
  });

  describe('getJobPosting action', () => {
    it('should retrieve a job posting by WID', async () => {
      const mockResponse = {
        data: {
          id: 'job-001',
          descriptor: 'Senior Software Engineer',
          jobDescription: 'Full description of the role...',
          location: 'San Francisco, CA',
          hiringManager: { id: 'wid-010', descriptor: 'Alice Manager' },
          status: 'open',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.getJobPosting.handler(mockContext, {
        jobPostingId: 'job-001',
      })) as WorkdayItemResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/recruiting/v4/mycompany/jobPostings/job-001',
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Job posting not found'));

      await expect(
        Workday.actions.getJobPosting.handler(mockContext, { jobPostingId: 'nonexistent' })
      ).rejects.toThrow('Job posting not found');
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [{ id: 'wid-001' }], total: 1 } });

      const result = await Workday.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/common/v1/mycompany/workers',
        { params: { limit: 1 } }
      );
      expect(result.message).toBe('Successfully connected to Workday');
    });

    it('should return failure when credentials are invalid', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid client credentials'));

      if (!Workday.test) {
        throw new Error('Test handler not defined');
      }
      await expect(Workday.test.handler(mockContext)).rejects.toThrow('Invalid client credentials');
    });

    it('should handle network errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Network timeout'));

      if (!Workday.test) {
        throw new Error('Test handler not defined');
      }
      await expect(Workday.test.handler(mockContext)).rejects.toThrow('Network timeout');
    });
  });

  describe('getDirectReports action', () => {
    it('should list direct reports for a manager', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: 'wid-010', descriptor: 'Bob Report', businessTitle: 'Engineer' },
            { id: 'wid-011', descriptor: 'Carol Report', businessTitle: 'Designer' },
          ],
          total: 2,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.getDirectReports.handler(mockContext, {
        workerId: 'wid-001',
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/common/v1/mycompany/workers/wid-001/directReports',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Worker not found'));

      await expect(
        Workday.actions.getDirectReports.handler(mockContext, {
          workerId: 'nonexistent',
          limit: 20,
        })
      ).rejects.toThrow('Worker not found');
    });
  });

  describe('getTimeOffBalance action', () => {
    it('should retrieve time off balance for a worker', async () => {
      const mockResponse = {
        data: {
          data: [
            { absencePlan: { descriptor: 'Vacation' }, balance: 10, used: 5 },
            { absencePlan: { descriptor: 'Sick' }, balance: 5, used: 1 },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.getTimeOffBalance.handler(mockContext, {
        workerId: 'wid-001',
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/absenceManagement/v5/mycompany/balances',
        { params: { limit: 20, worker: 'wid-001' } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should default to the current user when workerId is omitted', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.getTimeOffBalance.handler(mockContext, { limit: 20 });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/absenceManagement/v5/mycompany/balances',
        { params: { limit: 20, worker: 'me' } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Forbidden'));

      await expect(
        Workday.actions.getTimeOffBalance.handler(mockContext, { workerId: 'wid-001' })
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('listTimeOffEntries action', () => {
    it('should list time off entries for a specific worker', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              date: '2025-03-01',
              hours: 8,
              status: 'Approved',
              absencePlan: { descriptor: 'Vacation' },
            },
          ],
          total: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listTimeOffEntries.handler(mockContext, {
        workerId: 'wid-001',
        fromDate: '2025-01-01',
        toDate: '2025-12-31',
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/absenceManagement/v5/mycompany/workers/wid-001/timeOffDetails',
        { params: { limit: 20, fromDate: '2025-01-01', toDate: '2025-12-31' } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should default to the current user when workerId is omitted', async () => {
      const mockResponse = { data: { data: [], total: 0 } };
      mockClient.get.mockResolvedValue(mockResponse);

      await Workday.actions.listTimeOffEntries.handler(mockContext, { limit: 20 });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/absenceManagement/v5/mycompany/workers/me/timeOffDetails',
        { params: { limit: 20 } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Forbidden'));

      await expect(
        Workday.actions.listTimeOffEntries.handler(mockContext, { workerId: 'wid-001' })
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('listAbsenceTypes action', () => {
    it('should list absence types', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: 'abs-001', descriptor: 'Vacation', type: 'vacation' },
            { id: 'abs-002', descriptor: 'Sick Leave', type: 'sick' },
          ],
          total: 2,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listAbsenceTypes.handler(mockContext, {
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/absenceManagement/v5/mycompany/workers/me/eligibleAbsenceTypes',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Service unavailable'));

      await expect(
        Workday.actions.listAbsenceTypes.handler(mockContext, { limit: 20 })
      ).rejects.toThrow('Service unavailable');
    });
  });

  describe('listInboxTasks action', () => {
    it('should list inbox tasks with default limit of 100', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'task-001',
              descriptor: 'Approve time off request',
              status: 'In Progress',
              assignedDate: '2024-01-10',
              dueDate: '2024-01-15',
            },
          ],
          total: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listInboxTasks.handler(mockContext, {
        limit: 100,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/common/v1/mycompany/workers/me/inboxTasks',
        { params: { limit: 100 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should pass limit through to the API', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listInboxTasks.handler(mockContext, { limit: 75 });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/common/v1/mycompany/workers/me/inboxTasks',
        { params: { limit: 75 } }
      );
    });

    it('should support pagination via offset', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listInboxTasks.handler(mockContext, { limit: 50, offset: 50 });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/common/v1/mycompany/workers/me/inboxTasks',
        { params: { limit: 50, offset: 50 } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        Workday.actions.listInboxTasks.handler(mockContext, { limit: 100 })
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('skill content', () => {
    it('defines a skill string', () => {
      expect(typeof Workday.skill).toBe('string');
      expect((Workday.skill ?? '').length).toBeGreaterThan(0);
    });

    it('skill covers key workflows', () => {
      expect(Workday.skill).toContain('searchWorkers');
      expect(Workday.skill).toContain('getWorker');
      expect(Workday.skill).toContain('getDirectReports');
      expect(Workday.skill).toContain('listOrganizations');
      expect(Workday.skill).toContain('listJobPostings');
      expect(Workday.skill).toContain('getTimeOffBalance');
      expect(Workday.skill).toContain('listInboxTasks');
      expect(Workday.skill).toContain('listCandidates');
      expect(Workday.skill).toContain('listHolidays');
    });
  });

  // ===========================================================================
  // Recruiting (v4)
  // ===========================================================================

  describe('listCandidates action', () => {
    it('should list candidates with no filter', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'cand-001',
              descriptor: 'Jane Applicant',
              stage: 'Interview',
              applicationDate: '2025-01-10',
            },
          ],
          total: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listCandidates.handler(mockContext, {
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/recruiting/v4/mycompany/candidates',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should filter candidates by requisition and status', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listCandidates.handler(mockContext, {
        jobRequisitionId: 'req-001',
        status: 'Active',
        limit: 10,
        offset: 0,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/recruiting/v4/mycompany/candidates',
        { params: { limit: 10, offset: 0, jobRequisitionId: 'req-001', status: 'Active' } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        Workday.actions.listCandidates.handler(mockContext, { limit: 20 })
      ).rejects.toThrow('Unauthorized');
    });
  });

  // ===========================================================================
  // Holiday (v1)
  // ===========================================================================

  describe('listHolidays action', () => {
    it('should list holidays for a worker over a date range', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 'hol-001', descriptor: 'New Year Day', date: '2025-01-01' }],
          total: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listHolidays.handler(mockContext, {
        workerIds: ['wid-001'],
        fromDate: '2025-01-01',
        toDate: '2025-12-31',
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/holiday/v1/mycompany/holidayEvents',
        { params: expect.any(URLSearchParams) }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include multiple worker IDs as repeated params', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listHolidays.handler(mockContext, {
        workerIds: ['wid-001', 'wid-002'],
        fromDate: '2025-01-01',
        toDate: '2025-06-30',
        limit: 20,
      });

      const call = mockClient.get.mock.calls[0];
      const params: URLSearchParams = call[1].params;
      expect(params.getAll('worker')).toEqual(['wid-001', 'wid-002']);
      expect(params.get('fromDate')).toBe('2025-01-01');
      expect(params.get('toDate')).toBe('2025-06-30');
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Forbidden'));

      await expect(
        Workday.actions.listHolidays.handler(mockContext, {
          workerIds: ['wid-001'],
          fromDate: '2025-01-01',
          toDate: '2025-12-31',
          limit: 20,
        })
      ).rejects.toThrow('Forbidden');
    });
  });
});
