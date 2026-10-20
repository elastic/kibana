/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { UserStorageApi } from './user_storage_api';

describe('UserStorageApi', () => {
  const http = httpServiceMock.createSetupContract();
  let api: UserStorageApi;

  beforeEach(() => {
    http.get.mockReset();
    http.put.mockReset();
    http.delete.mockReset();
    api = new UserStorageApi(http);
  });

  it('GETs /internal/user_storage/{key} and unwraps the value field', async () => {
    http.get.mockResolvedValue({ value: { hidden: ['discover'] } });

    const result = await api.get('navigation:layout');

    expect(http.get).toHaveBeenCalledWith('/internal/user_storage/navigation%3Alayout');
    expect(result).toEqual({ hidden: ['discover'] });
  });

  it('PUTs /internal/user_storage/{key} with a value-wrapped body and returns the validated value', async () => {
    const stored = { hidden: ['discover'] };
    http.put.mockResolvedValue({ value: stored });

    const result = await api.set('navigation:layout', { hidden: ['discover'] });

    expect(http.put).toHaveBeenCalledWith('/internal/user_storage/navigation%3Alayout', {
      body: JSON.stringify({ value: { hidden: ['discover'] } }),
    });
    expect(result).toEqual(stored);
  });

  it('DELETEs /internal/user_storage/{key} for remove', async () => {
    http.delete.mockResolvedValue(undefined);

    await api.remove('navigation:layout');

    expect(http.delete).toHaveBeenCalledWith('/internal/user_storage/navigation%3Alayout');
  });

  it('encodes special characters in keys', async () => {
    http.put.mockResolvedValue({ value: 1 });

    await api.set('a/b c', 1);

    expect(http.put).toHaveBeenCalledWith('/internal/user_storage/a%2Fb%20c', expect.any(Object));
  });
});
