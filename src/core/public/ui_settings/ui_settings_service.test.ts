/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Mock the UiSettingsApi class
import { UiSettingsApi } from './ui_settings_api';
const MockUiSettingsApi = jest
  .fn<UiSettingsApi>(function(this: any) {
    this.stop = jest.fn();
    this.getLoadingCount$ = jest.fn().mockReturnValue({
      loadingCountObservable: true,
    });
  })
  .mockName('MockUiSettingsApi');
jest.mock('./ui_settings_api', () => ({
  UiSettingsApi: MockUiSettingsApi,
}));

// Mock the UiSettingsClient class
import { UiSettingsClient } from './ui_settings_client';
const MockUiSettingsClient = jest
  .fn<UiSettingsClient>(function(this: any) {
    this.stop = jest.fn();
  })
  .mockName('MockUiSettingsClient');
jest.mock('./ui_settings_client', () => ({
  UiSettingsClient: MockUiSettingsClient,
}));

// Load the service
import { UiSettingsService } from './ui_settings_service';

const loadingCountStartContract = {
  loadingCountStartContract: true,
  add: jest.fn(),
};

const defaultDeps: any = {
  notifications: {
    notificationsStartContract: true,
  },
  loadingCount: loadingCountStartContract,
  injectedMetadata: {
    injectedMetadataStartContract: true,
    getKibanaVersion: jest.fn().mockReturnValue('kibanaVersion'),
    getLegacyMetadata: jest.fn().mockReturnValue({
      uiSettings: {
        defaults: { legacyInjectedUiSettingDefaults: true },
        user: { legacyInjectedUiSettingUserValues: true },
      },
    }),
  },
  basePath: {
    basePathStartContract: true,
  },
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('#start', () => {
  it('returns an instance of UiSettingsClient', () => {
    const start = new UiSettingsService().start(defaultDeps);
    expect(start).toBeInstanceOf(MockUiSettingsClient);
  });

  it('contstructs UiSettingsClient and UiSettingsApi', () => {
    new UiSettingsService().start(defaultDeps);

    expect(MockUiSettingsApi).toMatchSnapshot('UiSettingsApi args');
    expect(MockUiSettingsClient).toMatchSnapshot('UiSettingsClient args');
  });

  it('passes the uiSettings loading count to the loading count api', () => {
    new UiSettingsService().start(defaultDeps);

    expect(loadingCountStartContract.add).toMatchSnapshot('loadingCount.add calls');
  });
});

describe('#stop', () => {
  it('runs fine if service never started', () => {
    const service = new UiSettingsService();
    expect(() => service.stop()).not.toThrowError();
  });

  it('stops the uiSettingsClient and uiSettingsApi', () => {
    const service = new UiSettingsService();
    const client = service.start(defaultDeps);
    const [[{ api }]] = MockUiSettingsClient.mock.calls;
    jest.spyOn(client, 'stop');
    jest.spyOn(api, 'stop');
    service.stop();
    expect(api.stop).toHaveBeenCalledTimes(1);
    expect(client.stop).toHaveBeenCalledTimes(1);
  });
});
