/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { QueryClient } from '@kbn/react-query';
import { createServiceAccountDirectory } from './service_account_directory';

describe('service account directory', () => {
  const http = httpServiceMock.createStartContract();
  const isEnabled = jest.fn();
  let queryClient: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();
    isEnabled.mockReturnValue(true);
  });
  afterEach(() => queryClient.clear());

  it('encodes opaque IDs and deduplicates lookups', async () => {
    const account = { id: 'kibana/a/b', name: 'Readable account', enabled: true, assumable: true };
    http.get.mockResolvedValue(account);
    const directory = createServiceAccountDirectory(http, queryClient, isEnabled);
    expect(await Promise.all([directory.get(account.id), directory.get(account.id)])).toEqual([
      account,
      account,
    ]);
    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledWith('/internal/security/service_account/kibana%2Fa%2Fb');
  });

  it.each([403, 404, 500])('returns no name on HTTP %s without retrying', async (statusCode) => {
    http.get.mockRejectedValue({ response: { status: statusCode } });
    const directory = createServiceAccountDirectory(http, queryClient, isEnabled);
    expect(await directory.get('missing')).toBeNull();
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('does not query or expose cached values with the feature disabled', async () => {
    http.get.mockResolvedValue({ id: 'a', name: 'Cached' });
    const directory = createServiceAccountDirectory(http, queryClient, isEnabled);
    await directory.get('a');
    isEnabled.mockReturnValue(false);
    expect(await directory.get('a')).toBeNull();
    expect(await directory.list()).toBeNull();
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('requests subsequent directory pages using the opaque cursor', async () => {
    http.get.mockResolvedValue({ serviceAccounts: [], nextPage: 'opaque-page' });
    const directory = createServiceAccountDirectory(http, queryClient, isEnabled);
    const page = await directory.list();
    await directory.list(page?.nextPage);
    expect(http.get).toHaveBeenLastCalledWith('/internal/security/service_account', {
      query: { limit: 100, after: 'opaque-page' },
    });
  });

  it('uses a separate cache for a separate authenticated app context', async () => {
    http.get
      .mockResolvedValueOnce({ id: 'a', name: 'Visible' })
      .mockRejectedValueOnce({ status: 403 });
    const first = createServiceAccountDirectory(http, queryClient, isEnabled);
    expect(await first.get('a')).toMatchObject({ name: 'Visible' });
    const otherClient = new QueryClient();
    const other = createServiceAccountDirectory(http, otherClient, isEnabled);
    expect(await other.get('a')).toBeNull();
    otherClient.clear();
  });
});
