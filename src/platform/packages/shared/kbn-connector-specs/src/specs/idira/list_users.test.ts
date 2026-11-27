/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildUsersFilter } from './client';
import { ListUsersInputSchema, USERS_DEFAULT_LIMIT } from './types';
import { BASE, httpError, createContext, run, sent } from './test_helpers';

describe('Idira Privilege Cloud connector', () => {
  describe('listUsers', () => {
    const user = (id: number) => ({
      id,
      username: `user${id}`,
      source: 'CyberArk',
      userType: 'EPVUser',
      componentUser: false,
      location: '\\',
    });

    it('sends the exact user name as a filter and pages with pageOffset and pageSize', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { Users: [user(42)], Total: 1 } });

      await expect(
        run('listUsers', ctx, { userName: ' jsmith@corp.example.com ' })
      ).resolves.toEqual({ value: [user(42)], count: 1 });
      expect(sent(request)).toEqual({
        method: 'GET',
        url: `${BASE}/Users`,
        params: {
          search: undefined,
          filter: 'userName eq jsmith@corp.example.com',
          sort: undefined,
          ExtendedDetails: undefined,
          pageOffset: 0,
          pageSize: USERS_DEFAULT_LIMIT,
        },
        data: undefined,
      });
    });

    it('sends search keywords, and a whitespace-only search counts as not set', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { Users: [], Total: 0 } });

      await run('listUsers', ctx, { search: '  jsmith  ' });
      expect(request.mock.calls[0][0].params).toMatchObject({
        search: 'jsmith',
        filter: undefined,
      });

      await run('listUsers', ctx, { search: '   ' });
      expect(request.mock.calls[1][0].params).toMatchObject({ search: undefined });
    });

    it('joins userType, componentUser and userName with AND, as the vendor SDK does', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { Users: [], Total: 0 } });

      await run('listUsers', ctx, {
        userType: 'EPVUser',
        componentUser: false,
        userName: 'jsmith',
        offset: 200,
        limit: 50,
      });
      expect(request.mock.calls[0][0].params).toEqual({
        search: undefined,
        filter: 'userType eq EPVUser AND componentUser eq false AND userName eq jsmith',
        sort: undefined,
        ExtendedDetails: undefined,
        pageOffset: 200,
        pageSize: 50,
      });
    });

    it('sends sort and ExtendedDetails', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { Users: [], Total: 0 } });

      await run('listUsers', ctx, { sort: ' lastname asc, firstname ', extendedDetails: true });
      expect(request.mock.calls[0][0].params).toMatchObject({
        sort: 'lastname asc, firstname',
        ExtendedDetails: true,
      });
    });

    it.each([
      ['username'],
      ['lastname desc'],
      ['lastname asc, firstname'],
      ['userType DESC,source,location asc'],
    ])('accepts the sort %p', (sort) => {
      expect(ListUsersInputSchema.safeParse({ sort }).success).toBe(true);
    });

    it.each([
      ['password'],
      ['username up'],
      ['username, source, location, lastname'],
      ['username;source'],
    ])('rejects the sort %p', (sort) => {
      expect(ListUsersInputSchema.safeParse({ sort }).success).toBe(false);
    });

    describe('when the tenant ignores pageOffset and pageSize', () => {
      const all = Array.from({ length: 5 }, (_, index) => user(index + 1));

      it('returns the first page of the whole list and the next offset', async () => {
        const { ctx, request } = createContext();
        request.mockResolvedValue({ status: 200, data: { Users: all, Total: 5 } });

        await expect(run('listUsers', ctx, { limit: 2 })).resolves.toEqual({
          value: [user(1), user(2)],
          count: 5,
          nextOffset: 2,
        });
      });

      it('returns the page at offset, and no next offset on the last page', async () => {
        const { ctx, request } = createContext();
        request.mockResolvedValue({ status: 200, data: { Users: all, Total: 5 } });

        await expect(run('listUsers', ctx, { offset: 2, limit: 2 })).resolves.toEqual({
          value: [user(3), user(4)],
          count: 5,
          nextOffset: 4,
        });
        await expect(run('listUsers', ctx, { offset: 4, limit: 2 })).resolves.toEqual({
          value: [user(5)],
          count: 5,
        });
      });

      it('counts the list when Total is missing', async () => {
        const { ctx, request } = createContext();
        request.mockResolvedValue({ status: 200, data: { Users: all } });

        await expect(run('listUsers', ctx, { limit: 3 })).resolves.toEqual({
          value: [user(1), user(2), user(3)],
          count: 5,
          nextOffset: 3,
        });
      });
    });

    it('returns nextOffset while fewer than Total users have been read', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { Users: [user(1), user(2)], Total: 5 } });

      await expect(run('listUsers', ctx, { limit: 2 })).resolves.toEqual({
        value: [user(1), user(2)],
        count: 5,
        nextOffset: 2,
      });
    });

    it('leaves out nextOffset on the last page', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { Users: [user(5)], Total: 5 } });

      await expect(run('listUsers', ctx, { offset: 4, limit: 2 })).resolves.toEqual({
        value: [user(5)],
        count: 5,
      });
    });

    it.each([
      ['an HTML page', '<html><title>Sign in</title></html>', /an HTML page titled "Sign in"/],
      ['an empty body', '', /an empty body/],
      ['an object without Users', { Total: 3 }, /a JSON body without a Users list/],
    ])('fails on %s instead of the Users list', async (_label, data, message) => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data });

      await expect(run('listUsers', ctx, {})).rejects.toThrow(message);
    });

    it('names the Audit users authorization on 403', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(403, { ErrorCode: 'PASWS041E', ErrorMessage: 'denied' }));

      await expect(run('listUsers', ctx, {})).rejects.toThrow(
        'The service user lacks the Audit users vault authorization.'
      );
    });

    it.each([
      [{ limit: 0 }],
      [{ limit: 1001 }],
      [{ offset: -1 }],
      [{ userName: '' }],
      [{ userName: 'x'.repeat(129) }],
      [{ userName: 'a\tb' }],
      [{ userType: 'EPV User' }],
    ])('rejects %j', (input) => {
      expect(ListUsersInputSchema.safeParse(input).success).toBe(false);
    });
  });

  describe('buildUsersFilter', () => {
    it.each([
      [{}, undefined],
      [{ componentUser: true }, 'componentUser eq true'],
      [{ userType: 'AppProvider' }, 'userType eq AppProvider'],
      [
        { userName: 'jsmith', componentUser: false },
        'componentUser eq false AND userName eq jsmith',
      ],
    ])('%j gives %p', (conditions, filter) => {
      expect(buildUsersFilter(conditions)).toBe(filter);
    });
  });
});
