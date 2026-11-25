/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { withoutBookkeeping } from './client';
import {
  DIRECTORY,
  USER,
  accepts,
  createContext,
  googleError,
  httpError,
  run,
  sent,
} from './test_helpers';

describe('Google Workspace Admin user actions', () => {
  beforeEach(() => {});

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listUsers', () => {
    it('sends my_customer, basic projection and page size 100 by default and returns short records', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({
        status: 200,
        data: { kind: 'admin#directory#users', users: [USER], nextPageToken: 'next-1' },
      });
      const result = await run('listUsers', ctx, {});
      expect(sent(request)).toEqual({
        method: 'GET',
        url: `${DIRECTORY}/users`,
        params: { customer: 'my_customer', projection: 'basic', maxResults: 100 },
        data: undefined,
      });
      expect(result).toEqual({
        users: [
          {
            id: USER.id,
            primaryEmail: 'jdoe@example.com',
            fullName: 'Jane Doe',
            suspended: false,
            archived: false,
            orgUnitPath: '/Sales',
            isAdmin: false,
            isDelegatedAdmin: false,
            isEnrolledIn2Sv: true,
            isEnforcedIn2Sv: false,
            lastLoginTime: '2026-11-20T08:15:00.000Z',
            creationTime: '2024-01-10T10:00:00.000Z',
          },
        ],
        nextPageToken: 'next-1',
      });
    });

    it('passes the filters, and leaves customer out when only a domain is given', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: {} });
      const result = await run('listUsers', ctx, {
        domain: 'example.com',
        query: 'isSuspended=true',
        orderBy: 'email',
        maxResults: 500,
        pageToken: 'tok',
      });
      expect(sent(request).params).toEqual({
        domain: 'example.com',
        query: 'isSuspended=true',
        orderBy: 'email',
        projection: 'basic',
        maxResults: 500,
        pageToken: 'tok',
      });
      expect(result).toEqual({ users: [] });
    });

    it('treats a whitespace-only query, customer and page token as not set', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { users: [] } });
      await run('listUsers', ctx, { query: '   ', customer: ' ', pageToken: ' ' });
      expect(sent(request).params).toEqual({
        customer: 'my_customer',
        projection: 'basic',
        maxResults: 100,
      });
    });

    it.each([
      [{ maxResults: 0 }, false],
      [{ maxResults: 501 }, false],
      [{ maxResults: 500 }, true],
      [{ customer: 'C01abc23d' }, true],
      [{ customer: 'acme' }, false],
      [{ orderBy: 'lastLoginTime' }, false],
      [{ query: 'q'.repeat(1025) }, false],
    ])('input %j is accepted: %s', (input, expected) => {
      expect(accepts('listUsers', input)).toBe(expected);
    });
  });

  describe('getUser', () => {
    it('returns the full record without kind and etag', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: USER });
      const result = await run('getUser', ctx, {
        userKey: 'jdoe@example.com',
        projection: 'full',
        viewType: 'admin_view',
      });
      expect(sent(request)).toEqual({
        method: 'GET',
        url: `${DIRECTORY}/users/jdoe%40example.com`,
        params: { projection: 'full', viewType: 'admin_view' },
        data: undefined,
      });
      const expected = withoutBookkeeping(USER);
      expect(result).toEqual(expected);
    });

    it('reports an unknown user', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(googleError(404, 'Resource Not Found: userKey', 'notFound'));
      await expect(run('getUser', ctx, { userKey: 'nobody@example.com' })).rejects.toThrow(
        'User nobody@example.com not found: Resource Not Found: userKey.'
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['basic', true],
      ['full', true],
      ['custom', false],
    ])('getUser projection %s is accepted: %s', (projection, expected) => {
      expect(accepts('getUser', { userKey: 'jdoe@example.com', projection })).toBe(expected);
    });

    it.each(['', 'two words@example.com', 'a/b', 'x'.repeat(321)])(
      'rejects the user key %j before any request',
      (userKey) => {
        expect(accepts('getUser', { userKey })).toBe(false);
      }
    );
  });

  describe('suspendUser and unsuspendUser', () => {
    it('suspendUser sends only suspended true and returns the state', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({
        status: 200,
        data: { ...USER, suspended: true, suspensionReason: 'ADMIN' },
      });
      const result = await run('suspendUser', ctx, { userKey: 'jdoe@example.com' });
      expect(sent(request)).toEqual({
        method: 'PUT',
        url: `${DIRECTORY}/users/jdoe%40example.com`,
        params: undefined,
        data: { suspended: true },
      });
      expect(result).toEqual({
        id: USER.id,
        primaryEmail: 'jdoe@example.com',
        suspended: true,
        suspensionReason: 'ADMIN',
      });
    });

    it('suspendUser succeeds with the same keys on an account that is already suspended', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { ...USER, suspended: true } });
      const result = await run('suspendUser', ctx, { userKey: 'jdoe@example.com' });
      expect(result).toEqual({
        id: USER.id,
        primaryEmail: 'jdoe@example.com',
        suspended: true,
        suspensionReason: null,
      });
    });

    it('unsuspendUser sends only suspended false and returns the state', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: USER });
      const result = await run('unsuspendUser', ctx, { userKey: USER.id });
      expect(sent(request).data).toEqual({ suspended: false });
      expect(sent(request).url).toBe(`${DIRECTORY}/users/${USER.id}`);
      expect(result).toEqual({ id: USER.id, primaryEmail: 'jdoe@example.com', suspended: false });
    });

    it('suspendUser returns the same result on a repeated call', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({
        status: 200,
        data: { ...USER, suspended: true, suspensionReason: 'ADMIN' },
      });
      const first = await run('suspendUser', ctx, { userKey: 'jdoe@example.com' });
      const second = await run('suspendUser', ctx, { userKey: 'jdoe@example.com' });
      expect(second).toEqual(first);
      expect(request).toHaveBeenCalledTimes(2);
    });

    it('unsuspendUser succeeds with the same keys on an account that is not suspended', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { ...USER, suspended: false } });
      expect(await run('unsuspendUser', ctx, { userKey: 'jdoe@example.com' })).toEqual({
        id: USER.id,
        primaryEmail: 'jdoe@example.com',
        suspended: false,
      });
    });

    it('does not retry a suspend that hits a rate limit', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(429));
      await expect(run('suspendUser', ctx, { userKey: 'jdoe@example.com' })).rejects.toThrow(
        'Google Workspace rate limit reached'
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('reports an unknown user on unsuspend', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(googleError(404, 'Resource Not Found: userKey', 'notFound'));
      await expect(run('unsuspendUser', ctx, { userKey: 'nobody@example.com' })).rejects.toThrow(
        'User nobody@example.com not found'
      );
    });
  });

  describe('signOutUser', () => {
    it('posts an empty sign-out and reports signedOut', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 204, data: '' });
      const result = await run('signOutUser', ctx, { userKey: 'jdoe@example.com' });
      expect(sent(request)).toEqual({
        method: 'POST',
        url: `${DIRECTORY}/users/jdoe%40example.com/signOut`,
        params: undefined,
        data: undefined,
      });
      expect(result).toEqual({ userKey: 'jdoe@example.com', signedOut: true });
    });

    it('succeeds again on a repeated sign-out when the user has no active session', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 204, data: '' });
      await run('signOutUser', ctx, { userKey: 'jdoe@example.com' });
      expect(await run('signOutUser', ctx, { userKey: 'jdoe@example.com' })).toEqual({
        userKey: 'jdoe@example.com',
        signedOut: true,
      });
      expect(request).toHaveBeenCalledTimes(2);
    });

    it('reports a missing security scope as a privilege error', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(
        googleError(
          403,
          'Request had insufficient authentication scopes.',
          'insufficientPermissions'
        )
      );
      await expect(run('signOutUser', ctx, { userKey: 'jdoe@example.com' })).rejects.toThrow(
        'The authorized account lacks the scope or admin privilege for this action'
      );
    });
  });

  describe('updateUser', () => {
    it('sends only the given fields and keeps every other field of the user', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { ...USER, orgUnitPath: '/Quarantine' } });
      const result = await run('updateUser', ctx, {
        userKey: 'jdoe@example.com',
        orgUnitPath: '/Quarantine',
      });
      expect(sent(request)).toEqual({
        method: 'PUT',
        url: `${DIRECTORY}/users/jdoe%40example.com`,
        params: undefined,
        data: { orgUnitPath: '/Quarantine' },
      });
      expect(result).toEqual({
        id: USER.id,
        primaryEmail: 'jdoe@example.com',
        orgUnitPath: '/Quarantine',
        changePasswordAtNextLogin: false,
        recoveryEmail: 'jane.personal@example.net',
        recoveryPhone: '+16505550100',
        updatedFields: ['orgUnitPath'],
      });
    });

    it('sends every field that is set, including false', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: USER });
      await run('updateUser', ctx, {
        userKey: 'jdoe@example.com',
        changePasswordAtNextLogin: false,
        recoveryEmail: 'new@example.net',
        recoveryPhone: '+442071234567',
      });
      expect(sent(request).data).toEqual({
        changePasswordAtNextLogin: false,
        recoveryEmail: 'new@example.net',
        recoveryPhone: '+442071234567',
      });
    });

    it.each([
      [{ userKey: 'jdoe@example.com' }, false],
      [{ userKey: 'jdoe@example.com', orgUnitPath: 'Quarantine' }, false],
      [{ userKey: 'jdoe@example.com', recoveryPhone: '16505550100' }, false],
      [{ userKey: 'jdoe@example.com', recoveryPhone: '+0123' }, false],
      [{ userKey: 'jdoe@example.com', recoveryEmail: 'not-an-email' }, false],
      [{ userKey: 'jdoe@example.com', changePasswordAtNextLogin: true }, true],
    ])('input %j is accepted: %s', (input, expected) => {
      expect(accepts('updateUser', input)).toBe(expected);
    });

    it('succeeds with the same keys when the fields already hold the values, also on a repeat', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: USER });
      const input = { userKey: 'jdoe@example.com', orgUnitPath: '/Sales' };
      const first = await run('updateUser', ctx, input);
      expect(await run('updateUser', ctx, input)).toEqual(first);
      expect(first).toMatchObject({ orgUnitPath: '/Sales', updatedFields: ['orgUnitPath'] });
    });

    it('reports an unknown org unit from Google', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(googleError(400, 'Invalid Input: OrgUnit', 'invalid'));
      await expect(
        run('updateUser', ctx, { userKey: 'jdoe@example.com', orgUnitPath: '/Nope' })
      ).rejects.toThrow('Google rejected the request: Invalid Input: OrgUnit (invalid).');
    });
  });
});
