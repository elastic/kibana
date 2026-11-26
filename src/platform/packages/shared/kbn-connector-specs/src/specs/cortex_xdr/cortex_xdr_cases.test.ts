/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { timing } from './client';
import { CortexXdr } from './cortex_xdr';

const API_URL = 'https://api-tenant.xdr.us.paloaltonetworks.com';
const BASE = `${API_URL}/public_api/v1`;
const EP = 'aeec6a2cc92e46fab3b6f621722e9916';

const ok = (data: unknown, status = 200) => ({ status, data, headers: {} });
const httpError = (status: number, data: unknown = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data, headers: {} },
  });

const createContext = () => {
  const request = jest.fn();
  const ctx = {
    client: { request },
    config: { apiUrl: API_URL },
    log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, request };
};

const runAction = (ctx: ActionContext, name: string, input: unknown) => {
  const action = CortexXdr.actions[name];
  return action.handler(ctx, action.input.parse(input));
};

/** The request_data of each call, in order. */
const sent = (request: jest.Mock) =>
  request.mock.calls.map(([config]) => ({
    url: config.url,
    method: config.method,
    body: config.data?.request_data,
  }));

describe('Cortex XDR connector', () => {
  beforeEach(() => jest.spyOn(timing, 'sleep').mockResolvedValue());
  afterEach(() => jest.restoreAllMocks());

  describe('scripts', () => {
    it('getScripts always sends a filters array, with boolean filters as values', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue(ok({ reply: { scripts: [] } }));
      await runAction(ctx, 'getScripts', {});
      await runAction(ctx, 'getScripts', {
        names: ['collect'],
        windowsSupported: true,
        isHighRisk: false,
      });
      expect(sent(request).map(({ body }) => body)).toEqual([
        { filters: [] },
        {
          filters: [
            { field: 'name', operator: 'in', value: ['collect'] },
            { field: 'windows_supported', operator: 'in', value: true },
            { field: 'is_high_risk', operator: 'in', value: false },
          ],
        },
      ]);
    });

    it('runScript sends the script, endpoints, parameters, timeout and case id', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(
        ok({ reply: { action_id: 900, endpoints_count: 1, status: 1 } })
      );
      await runAction(ctx, 'runScript', {
        scriptUid: '43973479d389f2ac7e99b6db88eaee40',
        endpointIds: [EP],
        parameters: { path: 'C:\\Temp', depth: 2 },
        caseId: '15',
      });
      expect(sent(request)[0].body).toEqual({
        script_uid: '43973479d389f2ac7e99b6db88eaee40',
        filters: [{ field: 'endpoint_id_list', operator: 'in', value: [EP] }],
        parameters_values: { path: 'C:\\Temp', depth: 2 },
        timeout: 600,
        incident_id: '15',
      });
    });

    it('runScript rejects more than 50 parameters and a timeout over 3600', () => {
      const base = { scriptUid: 'abc', endpointIds: [EP] };
      const many = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`p${i}`, i]));
      expect(
        CortexXdr.actions.runScript.input.safeParse({ ...base, parameters: many }).success
      ).toBe(false);
      expect(CortexXdr.actions.runScript.input.safeParse({ ...base, timeout: 3601 }).success).toBe(
        false
      );
    });

    it('getScriptResults sends the action id as a string', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: { script_name: 's', results: [] } }));
      await runAction(ctx, 'getScriptResults', { actionId: 900 });
      expect(sent(request)[0].body).toEqual({ action_id: '900' });
    });
  });

  describe('cases', () => {
    it('getCases maps filters and sort and keeps the vendor counts', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(
        ok({ reply: { TOTAL_COUNT: 40, FILTER_COUNT: 1, DATA: [{ case_id: 3 }] } })
      );
      const result = await runAction(ctx, 'getCases', {
        caseId: 3,
        status: ['New'],
        severity: ['high', 'critical'],
        createdAfter: 1,
        createdBefore: 2,
        modifiedAfter: 3,
        modifiedBefore: 4,
        sortField: 'creation_time',
        sortOrder: 'asc',
      });
      expect(sent(request)[0]).toEqual({
        url: `${BASE}/case/search`,
        method: 'POST',
        body: {
          filters: [
            { field: 'case_id', operator: 'in', value: [3] },
            { field: 'status_progress', operator: 'in', value: ['New'] },
            { field: 'severity', operator: 'in', value: ['high', 'critical'] },
            { field: 'creation_time', operator: 'gte', value: 1 },
            { field: 'creation_time', operator: 'lte', value: 2 },
            { field: 'modification_time', operator: 'gte', value: 3 },
            { field: 'modification_time', operator: 'lte', value: 4 },
          ],
          sort: { field: 'creation_time', keyword: 'asc' },
          search_from: 0,
          search_to: 100,
        },
      });
      expect(result).toEqual({
        reply: { TOTAL_COUNT: 40, FILTER_COUNT: 1, DATA: [{ case_id: 3 }] },
        pagesFetched: 1,
        nextSearchFrom: null,
      });
    });

    it('getCaseDetails combines the case, its artifacts and its issues', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce(ok({ reply: { DATA: [{ case_id: 9, issue_ids: [1, 2] }] } }))
        .mockResolvedValueOnce(
          ok([{ case_id: 9, file_artifacts: { DATA: [] }, network_artifacts: { DATA: [] } }])
        )
        .mockResolvedValueOnce(ok({ reply: { DATA: [{ id: 1 }, { id: 2 }] } }));
      const result = await runAction(ctx, 'getCaseDetails', { caseId: 9 });
      expect(sent(request)).toEqual([
        {
          url: `${BASE}/case/search`,
          method: 'POST',
          body: {
            filters: [{ field: 'case_id', operator: 'in', value: [9] }],
            search_from: 0,
            search_to: 1,
          },
        },
        { url: `${BASE}/case/artifacts/9/`, method: 'GET', body: undefined },
        {
          url: `${BASE}/issue/search`,
          method: 'POST',
          body: {
            filters: [{ field: 'id', operator: 'in', value: [1, 2] }],
            search_from: 0,
            search_to: 100,
          },
        },
      ]);
      expect(result).toEqual({
        found: true,
        case: { case_id: 9, issue_ids: [1, 2] },
        artifacts: { case_id: 9, file_artifacts: { DATA: [] }, network_artifacts: { DATA: [] } },
        issues: [{ id: 1 }, { id: 2 }],
        issuesTruncated: false,
        errors: [],
      });
    });

    it('getCaseDetails returns found false for an unknown case', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: { DATA: [] } }));
      await expect(runAction(ctx, 'getCaseDetails', { caseId: 5 })).resolves.toEqual({
        found: false,
        caseId: 5,
      });
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('getCaseDetails reports a failed part and keeps the rest', async () => {
      const { ctx, request } = createContext();
      const ids = Array.from({ length: 120 }, (_, i) => i + 1);
      request
        .mockResolvedValueOnce(ok({ reply: { DATA: [{ case_id: 9, issue_ids: ids }] } }))
        .mockRejectedValueOnce(httpError(403, { reply: { err_msg: 'no view' } }))
        .mockResolvedValueOnce(ok({ reply: { DATA: [{ id: 1 }] } }));
      const result = await runAction(ctx, 'getCaseDetails', { caseId: 9 });
      expect(result).toMatchObject({
        found: true,
        artifacts: null,
        issues: [{ id: 1 }],
        issuesTruncated: true,
        errors: [{ part: 'artifacts', message: expect.stringContaining('HTTP 403') }],
      });
      expect(sent(request)[2].body.filters[0].value).toHaveLength(100);
    });

    it('updateCase sends only the given fields and reports them', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok('', 204));
      await expect(
        runAction(ctx, 'updateCase', {
          caseId: 31,
          status: 'Resolved',
          resolveReason: 'Resolved - False Positive',
          resolveComment: 'Benign admin tool',
          userSeverity: '',
        })
      ).resolves.toEqual({
        success: true,
        caseId: 31,
        updatedFields: ['status_progress', 'resolve_reason', 'resolve_comment', 'user_severity'],
      });
      expect(sent(request)[0]).toEqual({
        url: `${BASE}/case/update/31`,
        method: 'POST',
        body: {
          update_data: {
            status_progress: 'Resolved',
            resolve_reason: 'Resolved - False Positive',
            resolve_comment: 'Benign admin tool',
            user_severity: '',
          },
        },
      });
    });

    it('updateCase names the missing case on 404', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(httpError(404));
      await expect(runAction(ctx, 'updateCase', { caseId: 31, notes: 'x' })).rejects.toThrow(
        'No Cortex XDR case with id 31'
      );
    });

    it.each([
      ['no field', { caseId: 1 }],
      ['Resolved without a reason', { caseId: 1, status: 'Resolved' }],
      ['a comment without Resolved', { caseId: 1, status: 'New', resolveComment: 'x' }],
      ['an invalid email', { caseId: 1, assignedUser: 'not-an-email' }],
      ['an unknown severity', { caseId: 1, userSeverity: 'urgent' }],
    ])('updateCase rejects %s', (_label, input) => {
      expect(CortexXdr.actions.updateCase.input.safeParse(input).success).toBe(false);
    });
  });

  describe('issues', () => {
    it('getIssues maps filters and evidence flag', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(
        ok({ reply: { TOTAL_COUNT: 1, FILTER_COUNT: 1, DATA: [{ id: 4 }] } })
      );
      await runAction(ctx, 'getIssues', {
        ids: [4],
        severity: ['HIGH'],
        detectionMethod: ['XDR Agent'],
        status: ['New'],
        insertedAfter: 10,
        insertedBefore: 20,
        includeEvidences: true,
        sortField: 'severity',
      });
      expect(sent(request)[0].body).toEqual({
        filters: [
          { field: 'id', operator: 'in', value: [4] },
          { field: 'severity', operator: 'in', value: ['HIGH'] },
          { field: 'detection.method', operator: 'in', value: ['XDR Agent'] },
          { field: 'status.progress', operator: 'in', value: ['New'] },
          { field: '_insert_time', operator: 'gte', value: 10 },
          { field: '_insert_time', operator: 'lte', value: 20 },
        ],
        include_evidences: true,
        sort: { field: 'severity', keyword: 'desc' },
        search_from: 0,
        search_to: 100,
      });
    });

    it('updateIssue updates one issue per request and continues after a failed id', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce(ok('', 204))
        .mockRejectedValueOnce(httpError(404))
        .mockResolvedValueOnce(ok('', 204));
      const result = await runAction(ctx, 'updateIssue', {
        issueIds: [1, 2, 3],
        status: 'Resolved',
        resolutionReason: 'Resolved - False Positive',
      });
      expect(sent(request).map(({ url, body }) => [url, body])).toEqual(
        [1, 2, 3].map((id) => [
          `${BASE}/issue/${id}`,
          {
            update_data: {
              status: 'Resolved',
              status_resolution_reason: 'Resolved - False Positive',
            },
          },
        ])
      );
      expect(result).toEqual({
        results: [
          { issueId: 1, success: true },
          { issueId: 2, success: false, notFound: true, error: 'No Cortex XDR issue with id 2' },
          { issueId: 3, success: true },
        ],
        succeeded: 2,
        failed: 1,
      });
    });

    it('updateIssue stops at once on a permission error', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(httpError(403));
      await expect(
        runAction(ctx, 'updateIssue', { issueIds: [1, 2, 3], severity: 'LOW' })
      ).rejects.toThrow('HTTP 403');
      expect(request).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['no status or severity', { issueIds: [1], resolutionComment: 'x' }],
      ['Resolved without a reason', { issueIds: [1], status: 'Resolved' }],
      [
        'a reason without Resolved',
        { issueIds: [1], status: 'New', resolutionReason: 'Resolved - Other' },
      ],
      ['51 ids', { issueIds: Array.from({ length: 51 }, (_, i) => i + 1), severity: 'LOW' }],
    ])('updateIssue rejects %s', (_label, input) => {
      expect(CortexXdr.actions.updateIssue.input.safeParse(input).success).toBe(false);
    });
  });
});
