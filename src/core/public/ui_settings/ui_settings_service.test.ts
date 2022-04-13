/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';

import { httpServiceMock } from '../http/http_service.mock';
import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { UiSettingsService } from './ui_settings_service';

const httpSetup = httpServiceMock.createSetupContract();

const defaultDeps = {
  http: httpSetup,
  injectedMetadata: injectedMetadataServiceMock.createSetupContract(),
};

describe('#stop', () => {
  it('runs fine if service never set up', () => {
    const service = new UiSettingsService();
    expect(() => service.stop()).not.toThrowError();
  });

  it('stops the uiSettingsClient and uiSettingsApi', async () => {
    const service = new UiSettingsService();
    let loadingCount$: Rx.Observable<unknown>;
    defaultDeps.http.addLoadingCountSource.mockImplementation((obs$) => (loadingCount$ = obs$));
    const client = service.setup(defaultDeps);

    service.stop();

    await expect(
      Rx.lastValueFrom(
        Rx.combineLatest([client.getUpdate$(), client.getUpdateErrors$(), loadingCount$!]),
        { defaultValue: undefined }
      )
    ).resolves.toBe(undefined);
  });
});
