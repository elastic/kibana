/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { createAccessControlApi } from './api';

const BASE_PATH = '/internal/security/access_control';

describe('createAccessControlApi', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let api: ReturnType<typeof createAccessControlApi>;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
    api = createAccessControlApi(http);
  });

  it('loads the policy of a type', async () => {
    http.get.mockResolvedValue({ enabled: true });

    await expect(api.getPolicy('action')).resolves.toEqual({ enabled: true });
    expect(http.get).toHaveBeenCalledWith(`${BASE_PATH}/action/_policy`);
  });

  it('loads the access state of an object', async () => {
    await api.get('action', 'my-connector');

    expect(http.get).toHaveBeenCalledWith(`${BASE_PATH}/action/my-connector`);
  });

  it('URI-encodes the type and the ID', async () => {
    await api.getPolicy('a/b');
    await api.get('a/b', 'id with/slash?');

    expect(http.get).toHaveBeenNthCalledWith(1, `${BASE_PATH}/a%2Fb/_policy`);
    expect(http.get).toHaveBeenNthCalledWith(2, `${BASE_PATH}/a%2Fb/id%20with%2Fslash%3F`);
  });

  it('replaces access with a PUT carrying the version and the draft', async () => {
    await api.replace('action', 'c/1', 'v1', {
      general_access: 'none',
      entries: [{ type: 'user', id: 'u_alice', access: 'use' }],
    });

    expect(http.put).toHaveBeenCalledWith(`${BASE_PATH}/action/c%2F1`, {
      body: JSON.stringify({
        version: 'v1',
        general_access: 'none',
        entries: [{ type: 'user', id: 'u_alice', access: 'use' }],
      }),
    });
  });

  it('claims an object with and without general access', async () => {
    await api.claim('action', 'c/1', 'v1', 'none');
    await api.claim('action', 'c/1', 'v2');

    expect(http.post).toHaveBeenNthCalledWith(1, `${BASE_PATH}/action/c%2F1/_claim`, {
      body: JSON.stringify({ version: 'v1', general_access: 'none' }),
    });
    expect(http.post).toHaveBeenNthCalledWith(2, `${BASE_PATH}/action/c%2F1/_claim`, {
      body: JSON.stringify({ version: 'v2' }),
    });
  });

  it('transfers ownership', async () => {
    await api.transfer('action', 'c/1', 'v1', { type: 'service_account', id: 'kibana/svc' });

    expect(http.post).toHaveBeenCalledWith(`${BASE_PATH}/action/c%2F1/_transfer`, {
      body: JSON.stringify({ version: 'v1', owner: { type: 'service_account', id: 'kibana/svc' } }),
    });
  });

  it('suggests principals and returns the users', async () => {
    const users = [{ uid: 'u_alice', eligible_levels: ['use'] }];
    http.post.mockResolvedValue({ users });
    const { signal } = new AbortController();

    await expect(api.suggest('a/b', 'ali', signal)).resolves.toBe(users);
    expect(http.post).toHaveBeenCalledWith(`${BASE_PATH}/a%2Fb/_suggest_principals`, {
      body: JSON.stringify({ name: 'ali', size: 20 }),
      signal,
    });
  });
});
