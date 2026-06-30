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

interface TestResult {
  ok: boolean;
  message?: string;
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

    it('supports workflows and agentBuilder', () => {
      expect(Workday.metadata.supportedFeatureIds).toContain('workflows');
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
        'https://mycompany.workday.com/ccx/api/v1/mycompany/workers',
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
        'https://mycompany.workday.com/ccx/api/v1/mycompany/workers',
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
        'https://mycompany.workday.com/ccx/api/v1/mycompany/workers',
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
        'https://mycompany.workday.com/ccx/api/v1/mycompany/workers/wid-001',
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should URL-encode the workerId', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 'wid special' } });

      await Workday.actions.getWorker.handler(mockContext, { workerId: 'wid special/path' });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/v1/mycompany/workers/wid%20special%2Fpath',
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
        'https://mycompany.workday.com/ccx/api/v1/mycompany/organizations',
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
        'https://mycompany.workday.com/ccx/api/v1/mycompany/organizations',
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
        'https://mycompany.workday.com/ccx/api/v1/mycompany/organizations/org-001',
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
        'https://mycompany.workday.com/ccx/api/v1/mycompany/jobPostings',
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
        'https://mycompany.workday.com/ccx/api/v1/mycompany/jobPostings',
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
        'https://mycompany.workday.com/ccx/api/v1/mycompany/jobPostings/job-001',
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

      if (!Workday.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await Workday.test.handler(mockContext)) as TestResult;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/v1/mycompany/workers',
        { params: { limit: 1 } }
      );
      expect(result.ok).toBe(true);
      expect(result.message).toBe('Successfully connected to Workday');
    });

    it('should return failure when credentials are invalid', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid client credentials'));

      if (!Workday.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await Workday.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Invalid client credentials');
    });

    it('should handle network errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Network timeout'));

      if (!Workday.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await Workday.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Network timeout');
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
        'https://mycompany.workday.com/ccx/api/v1/mycompany/workers/wid-001/directReports',
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
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/v1/mycompany/workers/wid-001/timeOffBalance',
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Forbidden'));

      await expect(
        Workday.actions.getTimeOffBalance.handler(mockContext, { workerId: 'wid-001' })
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
        'https://mycompany.workday.com/ccx/api/v1/mycompany/absenceTypes',
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
        'https://mycompany.workday.com/ccx/api/v1/mycompany/inbox_tasks',
        { params: { limit: 100 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should cap limit at 100', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listInboxTasks.handler(mockContext, { limit: 200 });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/v1/mycompany/inbox_tasks',
        { params: { limit: 100 } }
      );
    });

    it('should support pagination via offset', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listInboxTasks.handler(mockContext, { limit: 50, offset: 50 });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/v1/mycompany/inbox_tasks',
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
      // Recruiting
      expect(Workday.skill).toContain('listJobRequisitions');
      expect(Workday.skill).toContain('listCandidates');
      // Learning
      expect(Workday.skill).toContain('listCourses');
      expect(Workday.skill).toContain('listEnrollments');
      // Expenses
      expect(Workday.skill).toContain('listExpenseReports');
      // Requests
      expect(Workday.skill).toContain('listRequestTypes');
      // Journeys
      expect(Workday.skill).toContain('listJourneys');
      // Holidays
      expect(Workday.skill).toContain('listHolidays');
      // Projects
      expect(Workday.skill).toContain('listProjects');
      expect(Workday.skill).toContain('listProjectRevenue');
      // Procurement
      expect(Workday.skill).toContain('listPurchaseRequisitions');
      // Budgets
      expect(Workday.skill).toContain('checkBudget');
    });
  });

  // ===========================================================================
  // Recruiting (v4)
  // ===========================================================================

  describe('listJobRequisitions action', () => {
    it('should list job requisitions with no filter', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'req-001',
              descriptor: 'Senior Engineer',
              status: 'Open',
              department: 'Engineering',
            },
          ],
          total: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listJobRequisitions.handler(mockContext, {
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/recruiting/v4/mycompany/jobRequisitions',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should filter job requisitions by status', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listJobRequisitions.handler(mockContext, {
        status: 'Open',
        limit: 10,
        offset: 5,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/recruiting/v4/mycompany/jobRequisitions',
        { params: { limit: 10, offset: 5, status: 'Open' } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Forbidden'));

      await expect(
        Workday.actions.listJobRequisitions.handler(mockContext, { limit: 20 })
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('getJobRequisition action', () => {
    it('should retrieve a job requisition by WID', async () => {
      const mockResponse = {
        data: {
          id: 'req-001',
          descriptor: 'Senior Engineer',
          status: 'Open',
          hiringManager: { id: 'wid-010', descriptor: 'Alice Manager' },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.getJobRequisition.handler(mockContext, {
        jobRequisitionId: 'req-001',
      })) as WorkdayItemResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/recruiting/v4/mycompany/jobRequisitions/req-001',
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Job requisition not found'));

      await expect(
        Workday.actions.getJobRequisition.handler(mockContext, { jobRequisitionId: 'nonexistent' })
      ).rejects.toThrow('Job requisition not found');
    });
  });

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
  // Learning (v1)
  // ===========================================================================

  describe('listCourses action', () => {
    it('should list courses with no filter', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 'course-001', descriptor: 'Leadership 101', duration: '2h' }],
          total: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listCourses.handler(mockContext, {
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/learning/v1/mycompany/courses',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should filter courses by search keyword', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listCourses.handler(mockContext, {
        search: 'leadership',
        limit: 10,
        offset: 0,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/learning/v1/mycompany/courses',
        { params: { limit: 10, offset: 0, search: 'leadership' } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Service unavailable'));

      await expect(Workday.actions.listCourses.handler(mockContext, { limit: 20 })).rejects.toThrow(
        'Service unavailable'
      );
    });
  });

  describe('getCourse action', () => {
    it('should retrieve a course by WID', async () => {
      const mockResponse = {
        data: {
          id: 'course-001',
          descriptor: 'Leadership 101',
          description: 'Foundational leadership skills',
          duration: '2h',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.getCourse.handler(mockContext, {
        courseId: 'course-001',
      })) as WorkdayItemResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/learning/v1/mycompany/courses/course-001',
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Course not found'));

      await expect(
        Workday.actions.getCourse.handler(mockContext, { courseId: 'nonexistent' })
      ).rejects.toThrow('Course not found');
    });
  });

  describe('listEnrollments action', () => {
    it('should list enrollments for a worker', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: 'enroll-001', course: { descriptor: 'Leadership 101' }, status: 'Enrolled' },
          ],
          total: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listEnrollments.handler(mockContext, {
        workerId: 'wid-001',
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/learning/v1/mycompany/learnerCourseEnrollments',
        { params: { workerId: 'wid-001', limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should filter enrollments by status', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listEnrollments.handler(mockContext, {
        workerId: 'wid-001',
        status: 'Completed',
        limit: 10,
        offset: 5,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/learning/v1/mycompany/learnerCourseEnrollments',
        { params: { workerId: 'wid-001', limit: 10, offset: 5, status: 'Completed' } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Forbidden'));

      await expect(
        Workday.actions.listEnrollments.handler(mockContext, { workerId: 'wid-001', limit: 20 })
      ).rejects.toThrow('Forbidden');
    });
  });

  // ===========================================================================
  // Expense (v1)
  // ===========================================================================

  describe('listExpenseReports action', () => {
    it('should list expense reports with no filter', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 'exp-001', descriptor: 'Q1 Travel', status: 'Approved', total: 500 }],
          total: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listExpenseReports.handler(mockContext, {
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/expense/v1/mycompany/expenseReports',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should filter expense reports by worker and status', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listExpenseReports.handler(mockContext, {
        workerId: 'wid-001',
        status: 'Draft',
        limit: 10,
        offset: 0,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/expense/v1/mycompany/expenseReports',
        { params: { limit: 10, offset: 0, workerId: 'wid-001', status: 'Draft' } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        Workday.actions.listExpenseReports.handler(mockContext, { limit: 20 })
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('getExpenseReport action', () => {
    it('should retrieve an expense report by WID', async () => {
      const mockResponse = {
        data: {
          id: 'exp-001',
          descriptor: 'Q1 Travel',
          status: 'Approved',
          lineItems: [{ amount: 250, description: 'Flight' }],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.getExpenseReport.handler(mockContext, {
        expenseReportId: 'exp-001',
      })) as WorkdayItemResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/expense/v1/mycompany/expenseReports/exp-001',
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Expense report not found'));

      await expect(
        Workday.actions.getExpenseReport.handler(mockContext, { expenseReportId: 'nonexistent' })
      ).rejects.toThrow('Expense report not found');
    });
  });

  // ===========================================================================
  // Requests (v2)
  // ===========================================================================

  describe('listRequestTypes action', () => {
    it('should list request types', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: 'rt-001', descriptor: 'Address Change' },
            { id: 'rt-002', descriptor: 'Benefits Enrollment' },
          ],
          total: 2,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listRequestTypes.handler(mockContext, {
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/v2/mycompany/requestTypes',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Forbidden'));

      await expect(
        Workday.actions.listRequestTypes.handler(mockContext, { limit: 20 })
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('listRequests action', () => {
    it('should list requests with no filter', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 'req-001', descriptor: 'Address Change', status: 'Completed' }],
          total: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listRequests.handler(mockContext, {
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/v2/mycompany/requests',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should filter requests by status', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listRequests.handler(mockContext, {
        status: 'In Progress',
        limit: 10,
        offset: 0,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/v2/mycompany/requests',
        { params: { limit: 10, offset: 0, status: 'In Progress' } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Service unavailable'));

      await expect(
        Workday.actions.listRequests.handler(mockContext, { limit: 20 })
      ).rejects.toThrow('Service unavailable');
    });
  });

  // ===========================================================================
  // Journeys (v1)
  // ===========================================================================

  describe('listJourneys action', () => {
    it('should list journeys', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 'journey-001', descriptor: 'New Hire Onboarding', type: 'Onboarding' }],
          total: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listJourneys.handler(mockContext, {
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/journeys/v1/mycompany/journeys',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should support pagination', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listJourneys.handler(mockContext, { limit: 10, offset: 20 });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/journeys/v1/mycompany/journeys',
        { params: { limit: 10, offset: 20 } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        Workday.actions.listJourneys.handler(mockContext, { limit: 20 })
      ).rejects.toThrow('Unauthorized');
    });
  });

  // ===========================================================================
  // Holiday (v1)
  // ===========================================================================

  describe('listHolidays action', () => {
    it('should list holidays with no filter', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 'hol-001', descriptor: 'New Year Day', date: '2025-01-01' }],
          total: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listHolidays.handler(mockContext, {
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/v1/mycompany/holidayCalendars',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should filter holidays by worker and year', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listHolidays.handler(mockContext, {
        workerId: 'wid-001',
        year: 2025,
        limit: 20,
        offset: 0,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/v1/mycompany/holidayCalendars',
        { params: { limit: 20, offset: 0, workerId: 'wid-001', year: 2025 } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Forbidden'));

      await expect(
        Workday.actions.listHolidays.handler(mockContext, { limit: 20 })
      ).rejects.toThrow('Forbidden');
    });
  });

  // ===========================================================================
  // Projects (v3)
  // ===========================================================================

  describe('listProjects action', () => {
    it('should list projects with no filter', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 'proj-001', descriptor: 'Platform Upgrade', status: 'In Progress' }],
          total: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listProjects.handler(mockContext, {
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/project/v3/mycompany/projects',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should filter projects by status', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listProjects.handler(mockContext, {
        status: 'Completed',
        limit: 10,
        offset: 5,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/project/v3/mycompany/projects',
        { params: { limit: 10, offset: 5, status: 'Completed' } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Service unavailable'));

      await expect(
        Workday.actions.listProjects.handler(mockContext, { limit: 20 })
      ).rejects.toThrow('Service unavailable');
    });
  });

  describe('getProject action', () => {
    it('should retrieve a project by WID', async () => {
      const mockResponse = {
        data: {
          id: 'proj-001',
          descriptor: 'Platform Upgrade',
          status: 'In Progress',
          phases: [{ name: 'Planning', complete: true }],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.getProject.handler(mockContext, {
        projectId: 'proj-001',
      })) as WorkdayItemResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/project/v3/mycompany/projects/proj-001',
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Project not found'));

      await expect(
        Workday.actions.getProject.handler(mockContext, { projectId: 'nonexistent' })
      ).rejects.toThrow('Project not found');
    });
  });

  // ===========================================================================
  // Procurement (v5)
  // ===========================================================================

  describe('listPurchaseRequisitions action', () => {
    it('should list purchase requisitions with no filter', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: 'pr-001', descriptor: 'Office Supplies Q1', status: 'Approved', total: 300 },
          ],
          total: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listPurchaseRequisitions.handler(mockContext, {
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/procurement/v5/mycompany/purchaseRequisitions',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should filter purchase requisitions by status', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listPurchaseRequisitions.handler(mockContext, {
        status: 'Draft',
        limit: 10,
        offset: 0,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/procurement/v5/mycompany/purchaseRequisitions',
        { params: { limit: 10, offset: 0, status: 'Draft' } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Forbidden'));

      await expect(
        Workday.actions.listPurchaseRequisitions.handler(mockContext, { limit: 20 })
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('getPurchaseRequisition action', () => {
    it('should retrieve a purchase requisition by WID', async () => {
      const mockResponse = {
        data: {
          id: 'pr-001',
          descriptor: 'Office Supplies Q1',
          status: 'Approved',
          lineItems: [{ description: 'Pens', quantity: 50, unitPrice: 2 }],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.getPurchaseRequisition.handler(mockContext, {
        purchaseRequisitionId: 'pr-001',
      })) as WorkdayItemResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/procurement/v5/mycompany/purchaseRequisitions/pr-001',
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Requisition not found'));

      await expect(
        Workday.actions.getPurchaseRequisition.handler(mockContext, {
          purchaseRequisitionId: 'nonexistent',
        })
      ).rejects.toThrow('Requisition not found');
    });
  });

  describe('listPurchaseOrders action', () => {
    it('should list purchase orders with no filter', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 'po-001', descriptor: 'PO-2025-001', status: 'Open', total: 1500 }],
          total: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listPurchaseOrders.handler(mockContext, {
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/procurement/v5/mycompany/purchaseOrders',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should filter purchase orders by status', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listPurchaseOrders.handler(mockContext, {
        status: 'Closed',
        limit: 10,
        offset: 0,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/procurement/v5/mycompany/purchaseOrders',
        { params: { limit: 10, offset: 0, status: 'Closed' } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        Workday.actions.listPurchaseOrders.handler(mockContext, { limit: 20 })
      ).rejects.toThrow('Unauthorized');
    });
  });

  // ===========================================================================
  // Budgets (v1)
  // ===========================================================================

  describe('checkBudget action', () => {
    it('should check budget availability with required fields only', async () => {
      const mockResponse = {
        data: {
          available: true,
          remainingBalance: 5000,
          currency: 'USD',
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await Workday.actions.checkBudget.handler(mockContext, {
        budgetStructureId: 'budget-001',
        amount: 500,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/budget/v1/mycompany/budgetChecks',
        { budgetStructureId: 'budget-001', amount: 500 }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include optional currency and costCenter fields when provided', async () => {
      mockClient.post.mockResolvedValue({ data: { available: true, remainingBalance: 2000 } });

      await Workday.actions.checkBudget.handler(mockContext, {
        budgetStructureId: 'budget-001',
        amount: 1000,
        currencyCode: 'EUR',
        costCenterId: 'cc-001',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/budget/v1/mycompany/budgetChecks',
        {
          budgetStructureId: 'budget-001',
          amount: 1000,
          currencyCode: 'EUR',
          costCenterId: 'cc-001',
        }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.post.mockRejectedValue(new Error('Budget structure not found'));

      await expect(
        Workday.actions.checkBudget.handler(mockContext, {
          budgetStructureId: 'nonexistent',
          amount: 500,
        })
      ).rejects.toThrow('Budget structure not found');
    });
  });

  // ===========================================================================
  // Revenue (v1)
  // ===========================================================================

  describe('listProjectRevenue action', () => {
    it('should list project revenue with no filter', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 'rev-001', project: { descriptor: 'Platform Upgrade' }, amount: 10000 }],
          total: 1,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await Workday.actions.listProjectRevenue.handler(mockContext, {
        limit: 20,
      })) as WorkdayListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/revenue/v1/mycompany/revenue',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should filter project revenue by project WID', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [], total: 0 } });

      await Workday.actions.listProjectRevenue.handler(mockContext, {
        projectId: 'proj-001',
        limit: 10,
        offset: 0,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://mycompany.workday.com/ccx/api/revenue/v1/mycompany/revenue',
        { params: { limit: 10, offset: 0, projectId: 'proj-001' } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Service unavailable'));

      await expect(
        Workday.actions.listProjectRevenue.handler(mockContext, { limit: 20 })
      ).rejects.toThrow('Service unavailable');
    });
  });
});
