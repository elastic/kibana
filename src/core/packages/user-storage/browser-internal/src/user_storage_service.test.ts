/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, lastValueFrom } from 'rxjs';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
import { UserStorageService } from './user_storage_service';

const buildDeps = (initialValues: Record<string, unknown> = {}, available = true) => {
  const http = httpServiceMock.createSetupContract();
  const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
  injectedMetadata.getUserStorage.mockReturnValue({ available, values: initialValues });
  return { http, injectedMetadata };
};

describe('UserStorageService', () => {
  it('seeds the client cache from injected metadata at setup', () => {
    const service = new UserStorageService();
    const client = service.setup(buildDeps({ key: 42 }));

    expect(client.peek('key')).toBe(42);
  });

  it('threads the injected `available` flag into the client', () => {
    const service = new UserStorageService();

    expect(service.setup(buildDeps({}, true)).isAvailable()).toBe(true);
    expect(new UserStorageService().setup(buildDeps({}, false)).isAvailable()).toBe(false);
  });

  it('returns the same client from start as setup', () => {
    const service = new UserStorageService();
    const setupClient = service.setup(buildDeps());

    expect(service.start()).toBe(setupClient);
  });

  it('writes through to http.put on set', async () => {
    const service = new UserStorageService();
    const deps = buildDeps();
    deps.http.put.mockResolvedValue({ value: { hidden: ['discover'] } });

    const client = service.setup(deps);

    await client.set('navigation:layout', { hidden: ['discover'] });

    expect(deps.http.put).toHaveBeenCalledWith(
      '/internal/user_storage/navigation%3Alayout',
      expect.objectContaining({
        body: JSON.stringify({ value: { hidden: ['discover'] } }),
      })
    );
    expect(client.peek('navigation:layout')).toEqual({ hidden: ['discover'] });
  });

  it('completes the client observables on stop', async () => {
    const service = new UserStorageService();
    const client = service.setup(buildDeps());

    const errors$ = client.getHttpError$();
    const completed = jest.fn();
    client.get$('key').subscribe({ complete: completed });

    service.stop();

    await expect(lastValueFrom(errors$, { defaultValue: 'done' })).resolves.toBe('done');
    expect(completed).toHaveBeenCalled();
  });

  it('emits the seeded value as the first observable emission', async () => {
    const service = new UserStorageService();
    const client = service.setup(buildDeps({ key: 'seed' }));

    await expect(firstValueFrom(client.get$<string>('key'))).resolves.toBe('seed');
  });
});
