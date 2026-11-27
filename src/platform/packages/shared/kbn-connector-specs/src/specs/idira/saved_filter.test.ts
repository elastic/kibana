/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ACCOUNT_SAVED_FILTERS,
  ListAccountsInputSchema,
  MIXED_FILTER_OPERATORS_MESSAGE,
  TOO_MANY_FILTER_CONDITIONS_MESSAGE,
} from './types';
import { createContext, run, sent, ACCOUNT } from './test_helpers';

describe('Idira Privilege Cloud connector', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listAccounts savedFilter', () => {
    it('sends a savedFilter alone as savedfilter, with sort and paging', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { value: [ACCOUNT], count: 1 } });

      await run('listAccounts', ctx, { savedFilter: 'Recently', sort: 'userName asc', limit: 10 });
      expect(sent(request).params).toEqual({
        search: undefined,
        searchType: undefined,
        filter: undefined,
        savedfilter: 'Recently',
        sort: 'userName asc',
        offset: 0,
        limit: 10,
      });
    });

    it('combines a savedFilter with search and filter conditions, as the API documents', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { value: [ACCOUNT], count: 1 } });

      await run('listAccounts', ctx, {
        savedFilter: 'FailedChange',
        search: 'svc-backup',
        safeName: 'SOC-Servers',
        platformId: 'WinServerLocal',
        filter: 'modificationTime gte 1700000000',
      });
      expect(sent(request).params).toMatchObject({
        search: 'svc-backup',
        filter:
          'safeName eq SOC-Servers AND platformId eq WinServerLocal AND modificationTime gte 1700000000',
        savedfilter: 'FailedChange',
      });
    });

    it.each(ACCOUNT_SAVED_FILTERS.map((name) => [name]))('accepts the documented %s', (name) => {
      expect(ListAccountsInputSchema.safeParse({ savedFilter: name }).success).toBe(true);
    });

    it.each([['Failed Change'], ['failedchange'], ['Unknown']])('rejects %p', (name) => {
      expect(ListAccountsInputSchema.safeParse({ savedFilter: name }).success).toBe(false);
    });
  });

  describe('listAccounts filter operators', () => {
    it.each([
      [{ filter: 'userName contains admin AND address contains 10.0.0' }],
      [{ filter: 'userName contains admin OR address contains 10.0.0' }],
      [{ filter: 'userName contains admin and address contains 10.0.0', safeName: 'S1' }],
      [{ filter: '   ', safeName: 'S1', platformId: 'P1' }],
      // Lower-case words inside values are not operators.
      [{ filter: 'name contains or', safeName: 'S1' }],
      [{ filter: 'a eq 1 or b eq 2', safeName: 'S1' }],
      [{ filter: 'userName contains and OR address contains 10.0.0' }],
      [
        {
          filter: 'a eq 1 AND b eq 2 AND c eq 3 AND d eq 4 AND e eq 5 AND f eq 6',
          safeName: 'S1',
          platformId: 'P1',
        },
      ],
    ])('accepts %j', (input) => {
      expect(ListAccountsInputSchema.safeParse(input).success).toBe(true);
    });

    it.each([
      [{ filter: 'a eq 1 AND b eq 2 OR c eq 3' }],
      [{ filter: 'a eq 1 OR b eq 2', platformId: 'P1' }],
    ])('rejects mixed AND and OR in %j', (input) => {
      const result = ListAccountsInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]).toMatchObject({
        path: ['filter'],
        message: MIXED_FILTER_OPERATORS_MESSAGE,
      });
    });

    it('rejects more than eight conditions, counting safeName and platformId', () => {
      const result = ListAccountsInputSchema.safeParse({
        filter: 'a eq 1 AND b eq 2 AND c eq 3 AND d eq 4 AND e eq 5 AND f eq 6 AND g eq 7',
        safeName: 'S1',
        platformId: 'P1',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]).toMatchObject({
        path: ['filter'],
        message: TOO_MANY_FILTER_CONDITIONS_MESSAGE,
      });
    });

    it('sends no request for a rejected filter', async () => {
      const { ctx, request } = createContext();

      await expect(async () =>
        run('listAccounts', ctx, { filter: 'a eq 1 OR b eq 2', safeName: 'S1' })
      ).rejects.toThrow(MIXED_FILTER_OPERATORS_MESSAGE);
      expect(request).not.toHaveBeenCalled();
    });
  });
});
