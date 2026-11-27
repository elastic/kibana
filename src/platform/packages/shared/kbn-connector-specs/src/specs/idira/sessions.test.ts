/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { nextOffsetFromTotal } from './client';
import {
  ListRiskySessionsInputSchema,
  LIVE_SESSIONS_DEFAULT_LIMIT,
  LIVE_SESSIONS_DEFAULT_SORT,
} from './types';
import { BASE, httpError, createContext, run, sent } from './test_helpers';

describe('Idira Privilege Cloud connector', () => {
  describe('listRiskySessions', () => {
    const session = {
      SessionGuid: '7c1e7d6e-1111-2222-3333-444455556666',
      SessionID: '12_45',
      RiskScore: 87.5,
      IsLive: true,
      SafeName: 'SOC-Servers',
      User: 'jsmith',
      AccountUsername: 'svc-backup',
      AccountAddress: '10.0.0.5',
      Start: 1767225600,
    };

    it('sends the default sort and page size and returns value, count and nextOffset', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { LiveSessions: [session], Total: 30 } });

      await expect(run('listRiskySessions', ctx, {})).resolves.toEqual({
        value: [session],
        count: 30,
        nextOffset: 1,
      });
      expect(sent(request)).toEqual({
        method: 'GET',
        url: `${BASE}/LiveSessions`,
        params: {
          FromTime: undefined,
          ToTime: undefined,
          Safe: undefined,
          Search: undefined,
          Activities: undefined,
          Sort: LIVE_SESSIONS_DEFAULT_SORT,
          offset: 0,
          Limit: LIVE_SESSIONS_DEFAULT_LIMIT,
        },
        data: undefined,
      });
    });

    it('passes every filter, the sort, the offset and the limit', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { LiveSessions: [], Total: 0 } });

      await run('listRiskySessions', ctx, {
        fromTime: 1767225600,
        toTime: 1767229200,
        safeName: 'SOC-Servers',
        search: '  svc-backup  ',
        activities: 'Connect',
        sort: '-PSMStartTime',
        offset: 50,
        limit: 10,
      });
      expect(request.mock.calls[0][0].params).toEqual({
        FromTime: 1767225600,
        ToTime: 1767229200,
        Safe: 'SOC-Servers',
        Search: 'svc-backup',
        Activities: 'Connect',
        Sort: '-PSMStartTime',
        offset: 50,
        Limit: 10,
      });
    });

    it('leaves out nextOffset on the last page', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({
        status: 200,
        data: { LiveSessions: [session, session], Total: 12 },
      });

      await expect(run('listRiskySessions', ctx, { offset: 10, limit: 5 })).resolves.toEqual({
        value: [session, session],
        count: 12,
      });
    });

    it('returns an empty page without an error', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { LiveSessions: [], Total: 0 } });

      await expect(run('listRiskySessions', ctx, {})).resolves.toEqual({ value: [], count: 0 });
    });

    it('fails when the answer is not a LiveSessions list', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: '<html><title>Sign in</title></html>' });

      await expect(run('listRiskySessions', ctx, {})).rejects.toThrow(
        /HTTP 200 and an HTML page titled "Sign in" instead of the LiveSessions list/
      );
    });

    it('names the permission on 403', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(403, { ErrorCode: 'PASWS013E', ErrorMessage: 'denied' }));

      await expect(run('listRiskySessions', ctx, {})).rejects.toThrow(
        'The service user lacks the permission to view the sessions of the safe.'
      );
    });

    it.each([
      [{ fromTime: 20, toTime: 10 }, 'fromTime must not be later than toTime'],
      [{ sort: 'Password' }, 'Invalid option'],
      [{ limit: 0 }, ''],
      [{ limit: 1001 }, ''],
      [{ fromTime: -1 }, ''],
      [{ fromTime: 1.5 }, ''],
      [{ safeName: 'a/b' }, 'Safe names cannot contain'],
    ])('rejects %j', (input, message) => {
      const result = ListRiskySessionsInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(JSON.stringify(result.error?.issues)).toContain(message);
    });

    it('accepts equal fromTime and toTime', () => {
      expect(ListRiskySessionsInputSchema.safeParse({ fromTime: 10, toTime: 10 }).success).toBe(
        true
      );
    });
  });

  describe('nextOffsetFromTotal', () => {
    it.each([
      // total, offset, pageLength, limit, expected
      [30, 0, 25, 25, 25],
      [25, 0, 25, 25, undefined],
      [26, 25, 1, 25, undefined],
      [100, 10, 0, 25, undefined],
      [undefined, 0, 25, 25, 25],
      [undefined, 0, 24, 25, undefined],
      ['30', 0, 25, 25, 25],
    ])('Total %p, offset %p, %p items, limit %p gives %p', (total, offset, length, limit, next) => {
      expect(nextOffsetFromTotal(total, offset, length, limit)).toBe(next);
    });
  });
});
