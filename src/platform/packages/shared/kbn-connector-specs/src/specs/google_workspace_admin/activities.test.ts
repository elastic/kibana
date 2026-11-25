/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ACTIVITY_APPLICATIONS } from './types';
import { REPORTS, accepts, createContext, googleError, run, sent } from './test_helpers';

describe('Google Workspace Admin audit activities', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listActivities', () => {
    it('reads the events of all users by default with page size 100', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({
        status: 200,
        data: {
          kind: 'admin#reports#activities',
          items: [
            {
              kind: 'admin#reports#activity',
              etag: 'e',
              id: { time: '2026-11-20T08:15:00.000Z', applicationName: 'login' },
              actor: { email: 'jdoe@example.com' },
              events: [{ name: 'login_failure' }],
            },
          ],
          nextPageToken: 'A:1',
        },
      });
      const result = await run('listActivities', ctx, { applicationName: 'login' });
      expect(sent(request)).toEqual({
        method: 'GET',
        url: `${REPORTS}/activity/users/all/applications/login`,
        params: { maxResults: 100 },
        data: undefined,
      });
      expect(result).toEqual({
        items: [
          {
            id: { time: '2026-11-20T08:15:00.000Z', applicationName: 'login' },
            actor: { email: 'jdoe@example.com' },
            events: [{ name: 'login_failure' }],
          },
        ],
        nextPageToken: 'A:1',
      });
    });

    it('passes every filter and drops the blank ones', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: {} });
      const result = await run('listActivities', ctx, {
        applicationName: 'token',
        userKey: 'jdoe@example.com',
        startTime: '2026-11-01T00:00:00Z',
        endTime: '2026-11-02T00:00:00.000+05:30',
        eventName: 'authorize',
        filters: '   ',
        actorIpAddress: '203.0.113.7',
        maxResults: 1000,
        pageToken: 'A:2',
      });
      expect(sent(request)).toEqual({
        method: 'GET',
        url: `${REPORTS}/activity/users/jdoe%40example.com/applications/token`,
        params: {
          startTime: '2026-11-01T00:00:00Z',
          endTime: '2026-11-02T00:00:00.000+05:30',
          eventName: 'authorize',
          actorIpAddress: '203.0.113.7',
          maxResults: 1000,
          pageToken: 'A:2',
        },
        data: undefined,
      });
      expect(result).toEqual({ items: [] });
    });

    it('treats a blank userKey as all users', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: {} });
      await run('listActivities', ctx, { applicationName: 'admin', userKey: ' ' });
      expect(sent(request).url).toBe(`${REPORTS}/activity/users/all/applications/admin`);
    });

    it.each([
      [{ applicationName: 'login', startTime: '2026-11-01' }, false],
      [{ applicationName: 'login', startTime: '2026-11-01T00:00:00' }, false],
      [{ applicationName: 'login', endTime: 'yesterday' }, false],
      [{ applicationName: 'unknown_app' }, false],
      [{ applicationName: 'LOGIN' }, false],
      [{ applicationName: 'login', maxResults: 1001 }, false],
      [{ applicationName: 'login', filters: 'f'.repeat(1025) }, false],
      [{ applicationName: 'login', filters: 'login_type' }, false],
      [{ applicationName: 'login', filters: 'login_type==exchange,' }, false],
      [{ applicationName: 'login', filters: 'login_type==exchange,is_suspicious==true' }, true],
      [{ applicationName: 'login', filters: 'num_failures>=3' }, true],
      [{ applicationName: 'login', userKey: '..' }, false],
      [{ applicationName: 'user_accounts', maxResults: 1 }, true],
    ])('input %j is accepted: %s', (input, expected) => {
      expect(accepts('listActivities', input)).toBe(expected);
    });

    it.each([
      'access_transparency',
      'admin',
      'calendar',
      'chat',
      'drive',
      'gcp',
      'gmail',
      'gplus',
      'groups',
      'groups_enterprise',
      'jamboard',
      'login',
      'meet',
      'mobile',
      'rules',
      'saml',
      'token',
      'user_accounts',
      'context_aware_access',
      'chrome',
      'data_studio',
      'keep',
      'vault',
      'gemini_in_workspace_apps',
      'classroom',
      'assignments',
      'cloud_search',
      'tasks',
      'data_migration',
      'meet_hardware',
      'directory_sync',
      'ldap',
      'profile',
      'access_evaluation',
      'admin_data_action',
      'contacts',
      'takeout',
      'graduation',
      'voice',
      'chrome_sync',
      'workspace_studio',
      'gemini_notebook',
    ])('accepts the Reports API application %s', (applicationName) => {
      expect(accepts('listActivities', { applicationName })).toBe(true);
    });

    it('offers exactly the 42 applications of the Reports API, in their exact case', () => {
      expect(ACTIVITY_APPLICATIONS).toHaveLength(42);
      expect(new Set(ACTIVITY_APPLICATIONS).size).toBe(42);
    });

    it('checks a long filter that does not match in linear time', () => {
      const started = Date.now();
      expect(
        accepts('listActivities', { applicationName: 'login', filters: 'a>b,'.repeat(250) + '\n' })
      ).toBe(false);
      expect(Date.now() - started).toBeLessThan(500);
    });

    it('reports a rate limit at once, with its status, without retrying', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(googleError(403, 'Rate limit', 'userRateLimitExceeded'));
      const error = await run('listActivities', ctx, { applicationName: 'login' }).catch((e) => e);
      expect(error.message).toMatch(
        /^Google Workspace rate limit reached: Rate limit\. Wait and try again\.$/
      );
      expect(error.response).toEqual({ status: 403, headers: {} });
      expect(request).toHaveBeenCalledTimes(1);
    });
  });
});
