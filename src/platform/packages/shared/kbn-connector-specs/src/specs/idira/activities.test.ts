/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AccountActivityInputSchema, ACTIVITIES_DEFAULT_LIMIT } from './types';
import { BASE, httpError, createContext, run } from './test_helpers';

describe('Idira Privilege Cloud connector', () => {
  describe('getAccountActivity', () => {
    const activity = {
      Date: 1760000000,
      User: 'jsmith',
      Action: 'Retrieve Password',
      ActionID: 7,
      ClientID: 'PVWA',
      MoreInfo: '',
      Reason: 'INC-42',
      Alert: false,
    };
    /** Activities with the given Dates, in the order given; ActionID tells them apart. */
    const activities = (dates: unknown[]) =>
      dates.map((date, index) => ({ ...activity, Date: date, ActionID: index }));
    const actionIds = (result: unknown) =>
      (result as { Activities: Array<{ ActionID: number }> }).Activities.map((a) => a.ActionID);

    it('returns the activity with total, truncated and newestFirst, in one request', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { Activities: [activity], Total: 1 } });

      await expect(run('getAccountActivity', ctx, { accountId: '12_3' })).resolves.toEqual({
        Activities: [activity],
        total: 1,
        truncated: false,
        newestFirst: true,
      });
      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0][0].url).toBe(`${BASE}/Accounts/12_3/Activities`);
      // The limit is applied by the connector: the endpoint gets no paging parameter.
      expect(request.mock.calls[0][0].params).toBeUndefined();
    });

    it('sorts newest first by Date and keeps the API order for equal Dates', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({
        status: 200,
        data: { Activities: activities([100, 300, 200, 300]), Total: 4 },
      });

      const result = await run('getAccountActivity', ctx, { accountId: '12_3' });
      expect(actionIds(result)).toEqual([1, 3, 2, 0]);
      expect(result).toMatchObject({ total: 4, truncated: false, newestFirst: true });
    });

    it('keeps the newest 100 by default and sets truncated', async () => {
      const { ctx, request } = createContext();
      const dates = Array.from({ length: 101 }, (_, index) => 1000 + index);
      request.mockResolvedValue({
        status: 200,
        data: { Activities: activities(dates), Total: 101 },
      });

      const result = (await run('getAccountActivity', ctx, { accountId: '12_3' })) as {
        Activities: Array<{ Date: number }>;
      };
      expect(result.Activities).toHaveLength(ACTIVITIES_DEFAULT_LIMIT);
      expect(result.Activities[0].Date).toBe(1100);
      expect(result.Activities[99].Date).toBe(1001);
      expect(result).toMatchObject({ total: 101, truncated: true, newestFirst: true });
    });

    it.each([
      [1, 2, [1], true],
      [2, 2, [1, 0], false],
      [1000, 1000, undefined, false],
      [1000, 1001, undefined, true],
    ])(
      'limit %p with %p activities returns the newest ones, truncated %p',
      async (limit, count, ids, truncated) => {
        const { ctx, request } = createContext();
        const dates = Array.from({ length: count as number }, (_, index) => index);
        request.mockResolvedValue({ status: 200, data: { Activities: activities(dates) } });

        const result = await run('getAccountActivity', ctx, { accountId: '12_3', limit });
        const returned = actionIds(result);
        expect(returned).toHaveLength(Math.min(limit as number, count as number));
        expect(returned[0]).toBe((count as number) - 1);
        if (ids) expect(returned).toEqual(ids);
        // Without a vendor Total, total is the number of activities the API sent.
        expect(result).toMatchObject({ total: count, truncated: truncated as boolean });
      }
    );

    it.each([
      ['a non-numeric string', 'yesterday'],
      ['an impossible ISO date', '2026-13-45T10:00:00Z'],
      ['an ISO date with text after it', '2026-11-27T10:00:00Z x'],
      ['an empty string', ''],
      ['a missing Date', undefined],
      ['null', null],
      ['NaN', NaN],
      ['Infinity', Infinity],
      ['a 16-digit string', '1'.repeat(16)],
      ['non-ASCII digits', '١٧٦٠٠٠٠٠٠٠'],
      ['a negative number string', '-5'],
    ])('keeps the API order and says so when a Date is %s', async (_label, bad) => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({
        status: 200,
        data: { Activities: activities([100, bad, 300]), Total: 3 },
      });

      const result = await run('getAccountActivity', ctx, { accountId: '12_3', limit: 2 });
      expect(actionIds(result)).toEqual([0, 1]);
      expect(result).toMatchObject({ total: 3, truncated: true, newestFirst: false });
    });

    it.each([
      [
        'with Z',
        ['2026-11-27T10:00:00Z', '2026-11-27T12:00:00Z', '2026-11-27T11:00:00Z'],
        [1, 2, 0],
      ],
      [
        'without an offset, read as UTC',
        ['2026-11-27T10:00:00', '2026-11-27 12:00:00', '2026-11-27T11:00'],
        [1, 2, 0],
      ],
      [
        'with an offset',
        ['2026-11-27T10:00:00+01:00', '2026-11-27T10:00:00-01:00', '2026-11-27T10:00:00Z'],
        [1, 2, 0],
      ],
      [
        'with 7 fractional digits',
        [
          '2026-11-27T10:00:00.1000000Z',
          '2026-11-27T10:00:00.3000000Z',
          '2026-11-27T10:00:00.2000000Z',
        ],
        [1, 2, 0],
      ],
      ['date only', ['2026-11-25', '2026-11-27', '2026-11-26'], [1, 2, 0]],
      ['mixed with epoch seconds', [1764237600, '2026-11-27T12:00:00Z', '1764241200'], [1, 2, 0]],
    ])('sorts ISO 8601 Dates %s newest first', async (_label, dates, order) => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { Activities: activities(dates), Total: 3 } });

      const result = await run('getAccountActivity', ctx, { accountId: '12_3' });
      expect(actionIds(result)).toEqual(order);
      expect(result).toMatchObject({ newestFirst: true, truncated: false, total: 3 });
    });

    it('reads a Date sent as a string of digits, trimmed', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({
        status: 200,
        data: { Activities: activities(['100', ' 300 ', 200]), Total: 3 },
      });

      const result = await run('getAccountActivity', ctx, { accountId: '12_3' });
      expect(actionIds(result)).toEqual([1, 2, 0]);
      expect(result).toMatchObject({ newestFirst: true, truncated: false });
    });

    it('keeps the API order when an activity is not an object', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { Activities: ['x', activity], Total: 2 } });

      await expect(run('getAccountActivity', ctx, { accountId: '12_3' })).resolves.toEqual({
        Activities: ['x', activity],
        total: 2,
        truncated: false,
        newestFirst: false,
      });
    });

    it.each([
      [1, true],
      [1000, true],
      [1001, false],
      [0, false],
      [1.5, false],
      ['10', false],
    ])('accepts limit %p: %p', (limit, ok) => {
      expect(AccountActivityInputSchema.safeParse({ accountId: '12_3', limit }).success).toBe(ok);
    });

    it('accepts a call without limit', () => {
      expect(AccountActivityInputSchema.safeParse({ accountId: '12_3' }).success).toBe(true);
    });

    it('names View audit log on a 403', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(403));

      await expect(run('getAccountActivity', ctx, { accountId: '12_3' })).rejects.toThrow(
        'View audit log'
      );
    });

    it.each([
      ['<html><head><title>Sign In</title></head></html>', 'an HTML page titled "Sign In"'],
      ['', 'an empty body'],
      [{ count: 3 }, 'a JSON body without an Activities list'],
    ])('fails on HTTP 200 with %p instead of reporting no activity', async (data, what) => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data });

      await expect(run('getAccountActivity', ctx, { accountId: '12_3' })).rejects.toThrow(
        `answered GET /PasswordVault/API/Accounts/12_3/Activities with HTTP 200 and ${what} instead of the Activities list`
      );
    });

    it('returns an empty Activities list with the same keys', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { Activities: [], Total: 0 } });

      await expect(run('getAccountActivity', ctx, { accountId: '12_3' })).resolves.toEqual({
        Activities: [],
        total: 0,
        truncated: false,
        newestFirst: true,
      });
    });
  });
});
