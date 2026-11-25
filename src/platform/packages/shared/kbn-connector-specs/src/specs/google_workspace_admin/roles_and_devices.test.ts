/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DIRECTORY, accepts, createContext, googleError, run, sent } from './test_helpers';

describe('Google Workspace Admin role assignments and mobile devices', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listRoleAssignments', () => {
    it('reads the assignments of my_customer by default', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({
        status: 200,
        data: {
          items: [
            {
              kind: 'admin#directory#roleAssignment',
              etag: 'e',
              roleAssignmentId: '1',
              roleId: '9170516996784129',
              assignedTo: '104512345678901234567',
              assigneeType: 'user',
              scopeType: 'CUSTOMER',
            },
          ],
          nextPageToken: 'r2',
        },
      });
      const result = await run('listRoleAssignments', ctx, {});
      expect(sent(request)).toEqual({
        method: 'GET',
        url: `${DIRECTORY}/customer/my_customer/roleassignments`,
        params: { maxResults: 100 },
        data: undefined,
      });
      expect(result).toEqual({
        items: [
          {
            roleAssignmentId: '1',
            roleId: '9170516996784129',
            assignedTo: '104512345678901234567',
            assigneeType: 'user',
            scopeType: 'CUSTOMER',
          },
        ],
        nextPageToken: 'r2',
      });
    });

    it('passes the user and indirect flag', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: {} });
      expect(
        await run('listRoleAssignments', ctx, {
          customer: 'C01abc23d',
          userKey: 'jdoe@example.com',
          includeIndirectRoleAssignments: true,
          maxResults: 200,
        })
      ).toEqual({ items: [] });
      expect(sent(request)).toEqual({
        method: 'GET',
        url: `${DIRECTORY}/customer/C01abc23d/roleassignments`,
        params: {
          userKey: 'jdoe@example.com',
          includeIndirectRoleAssignments: true,
          maxResults: 200,
        },
        data: undefined,
      });
    });

    it('passes the role', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: {} });
      await run('listRoleAssignments', ctx, { roleId: '9170516996784129' });
      expect(sent(request).params).toEqual({ roleId: '9170516996784129', maxResults: 100 });
    });

    it('explains a userKey that is no user of the account', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(googleError(400, 'Invalid user id', 'invalid'));
      await expect(
        run('listRoleAssignments', ctx, { userKey: 'nobody@example.com' })
      ).rejects.toThrow(
        'User nobody@example.com is not a user of this Google Workspace account (Google answered "Invalid user id").'
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('keeps any other 400 as Google sent it', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(googleError(400, 'Invalid Input: maxResults', 'invalid'));
      await expect(
        run('listRoleAssignments', ctx, { userKey: 'jdoe@example.com' })
      ).rejects.toThrow('Google rejected the request: Invalid Input: maxResults (invalid).');
    });

    it.each([
      [{ includeIndirectRoleAssignments: true }, false],
      [{ includeIndirectRoleAssignments: true, userKey: ' ' }, false],
      [{ roleId: 'super-admin' }, false],
      [{ customer: 'my-customer' }, false],
      [{ maxResults: 201 }, false],
      [{ userKey: 'jdoe@example.com', roleId: '9170516996784129' }, false],
      [{ userKey: ' ', roleId: '9170516996784129' }, true],
      [{ userKey: 'jdoe@example.com', roleId: ' ' }, true],
    ])('input %j is accepted: %s', (input, expected) => {
      expect(accepts('listRoleAssignments', input)).toBe(expected);
    });
  });

  describe('listMobileDevices', () => {
    it('reads devices of my_customer with BASIC projection and returns short records', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({
        status: 200,
        data: {
          mobiledevices: [
            {
              kind: 'admin#directory#mobiledevice',
              etag: 'e',
              resourceId: 'AFiQxQ8abc',
              deviceId: 'dev-1',
              email: ['jdoe@example.com'],
              name: ['Jane'],
              model: 'Pixel 8',
              os: 'Android 15',
              type: 'ANDROID',
              status: 'APPROVED',
              lastSync: '2026-11-20T08:00:00.000Z',
              serialNumber: 'SN1',
              imei: '35',
            },
          ],
        },
      });
      const result = await run('listMobileDevices', ctx, {});
      expect(sent(request)).toEqual({
        method: 'GET',
        url: `${DIRECTORY}/customer/my_customer/devices/mobile`,
        params: { projection: 'BASIC', maxResults: 100 },
        data: undefined,
      });
      expect(result).toEqual({
        mobiledevices: [
          {
            resourceId: 'AFiQxQ8abc',
            deviceId: 'dev-1',
            email: ['jdoe@example.com'],
            name: ['Jane'],
            model: 'Pixel 8',
            os: 'Android 15',
            type: 'ANDROID',
            status: 'APPROVED',
            lastSync: '2026-11-20T08:00:00.000Z',
          },
        ],
      });
    });

    it('passes the query and sort', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { nextPageToken: 'd2' } });
      expect(
        await run('listMobileDevices', ctx, {
          customerId: 'C01abc23d',
          query: 'email:jdoe@example.com',
          orderBy: 'lastSync',
          sortOrder: 'DESCENDING',
          pageToken: 'd1',
        })
      ).toEqual({ mobiledevices: [], nextPageToken: 'd2' });
      expect(sent(request).url).toBe(`${DIRECTORY}/customer/C01abc23d/devices/mobile`);
      expect(sent(request).params).toEqual({
        query: 'email:jdoe@example.com',
        orderBy: 'lastSync',
        sortOrder: 'DESCENDING',
        projection: 'BASIC',
        maxResults: 100,
        pageToken: 'd1',
      });
    });

    it.each([
      [{ sortOrder: 'ASCENDING' }, false],
      [{ orderBy: 'lastsync' }, false],
      [{ maxResults: 101 }, false],
      [{ orderBy: 'status', sortOrder: 'ASCENDING', maxResults: 100 }, true],
    ])('input %j is accepted: %s', (input, expected) => {
      expect(accepts('listMobileDevices', input)).toBe(expected);
    });
  });

  describe('actionMobileDevice', () => {
    it.each([
      ['block', 'block'],
      ['wipe', 'admin_remote_wipe'],
      ['account_wipe', 'admin_account_wipe'],
    ])('sends %s as the Directory API action %s', async (action, sentAction) => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 204, data: '' });
      expect(await run('actionMobileDevice', ctx, { resourceId: 'AFiQxQ8abc', action })).toEqual({
        resourceId: 'AFiQxQ8abc',
        action,
        status: 'requested',
      });
      expect(sent(request)).toEqual({
        method: 'POST',
        url: `${DIRECTORY}/customer/my_customer/devices/mobile/AFiQxQ8abc/action`,
        params: undefined,
        data: { action: sentAction },
      });
    });

    it('reports requested again for a device that is already blocked', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 204, data: '' });
      const input = { resourceId: 'AFiQxQ8abc', action: 'block' };
      await run('actionMobileDevice', ctx, input);
      expect(await run('actionMobileDevice', ctx, input)).toEqual({
        resourceId: 'AFiQxQ8abc',
        action: 'block',
        status: 'requested',
      });
      expect(request).toHaveBeenCalledTimes(2);
    });

    it('fails for an unknown device without retrying', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(googleError(404, 'Resource Not Found: resourceId', 'notFound'));
      await expect(
        run('actionMobileDevice', ctx, { resourceId: 'nope', action: 'block' })
      ).rejects.toThrow('Mobile device nope not found');
      expect(request).toHaveBeenCalledTimes(1);
    });

    it.each([
      [{ resourceId: 'a', action: 'approve' }, false],
      [{ resourceId: 'a', action: 'admin_remote_wipe' }, false],
      [{ resourceId: 'a/b', action: 'block' }, false],
    ])('input %j is accepted: %s', (input, expected) => {
      expect(accepts('actionMobileDevice', input)).toBe(expected);
    });
  });
});
