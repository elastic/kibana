/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
import { SettingsService } from './settings_service';

const httpSetup = httpServiceMock.createSetupContract();

const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
injectedMetadata.getLegacyMetadata.mockReturnValue({
  app: {
    id: 'foo',
    title: 'Foo App',
  },
  nav: [],
  uiSettings: {
    defaults: { foo: { value: 'bar' }, bar: { value: 'baz' } },
    user: {},
  },
  globalUiSettings: {
    defaults: { baz: { value: 'eggs' }, laz: { value: 'has' } },
    user: { first: { value: 'second' } },
  },
} as any);

const defaultDeps = {
  http: httpSetup,
  injectedMetadata,
};

describe('#setup', () => {
  it('initializes two clients correctly', () => {
    const service = new SettingsService();
    const { client, globalClient } = service.setup(defaultDeps);
    expect(client.get('foo')).toEqual('bar');
    expect(client.get('bar')).toEqual('baz');
    expect(globalClient.get('baz')).toEqual('eggs');
    expect(globalClient.get('laz')).toEqual('has');
    expect(globalClient.get('first')).toEqual('second');
  });
});

describe('#start', () => {
  it('throws if called before #setup', () => {
    const service = new SettingsService();
    expect(() => service.start()).toThrow('#setup must be called before start');
  });
});

describe('#stop', () => {
  it('runs fine if service never set up', () => {
    const service = new SettingsService();
    expect(() => service.stop()).not.toThrowError();
  });

  it('stops the uiSettingsClient and uiSettingsApi', async () => {
    const service = new SettingsService();
    let loadingCount$: Rx.Observable<unknown>;
    defaultDeps.http.addLoadingCountSource.mockImplementation((obs$) => (loadingCount$ = obs$));
    const { client, globalClient } = service.setup(defaultDeps);

    service.stop();

    await expect(
      Rx.lastValueFrom(
        Rx.combineLatest([client!.getUpdate$(), client!.getUpdateErrors$(), loadingCount$!]),
        { defaultValue: undefined }
      )
    ).resolves.toBe(undefined);

    await expect(
      Rx.lastValueFrom(
        Rx.combineLatest([
          globalClient!.getUpdate$(),
          globalClient!.getUpdateErrors$(),
          loadingCount$!,
        ]),
        { defaultValue: undefined }
      )
    ).resolves.toBe(undefined);
  });
});
