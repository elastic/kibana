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

import { MockUiSettingsApi, MockUiSettingsClient } from './ui_settings_service.test.mocks';

import { httpServiceMock } from '../http/http_service.mock';
import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { UiSettingsService } from './ui_settings_service';

const httpSetup = httpServiceMock.createSetupContract();

const defaultDeps = {
  http: httpSetup,
  injectedMetadata: injectedMetadataServiceMock.createSetupContract(),
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('#setup', () => {
  it('returns an instance of UiSettingsClient', () => {
    const setup = new UiSettingsService().setup(defaultDeps);
    expect(setup).toBeInstanceOf(MockUiSettingsClient);
  });

  it('constructs UiSettingsClient and UiSettingsApi', () => {
    new UiSettingsService().setup(defaultDeps);

    expect(MockUiSettingsApi).toMatchSnapshot('UiSettingsApi args');
    expect(MockUiSettingsClient).toMatchSnapshot('UiSettingsClient args');
  });

  it('passes the uiSettings loading count to the loading count api', () => {
    new UiSettingsService().setup(defaultDeps);

    expect(httpSetup.addLoadingCount).toMatchSnapshot('http.addLoadingCount calls');
  });
});

describe('#stop', () => {
  it('runs fine if service never set up', () => {
    const service = new UiSettingsService();
    expect(() => service.stop()).not.toThrowError();
  });

  it('stops the uiSettingsClient and uiSettingsApi', () => {
    const service = new UiSettingsService();
    const client = service.setup(defaultDeps);
    const [[{ api }]] = MockUiSettingsClient.mock.calls;
    jest.spyOn(client, 'stop');
    jest.spyOn(api, 'stop');
    service.stop();
    expect(api.stop).toHaveBeenCalledTimes(1);
    expect(client.stop).toHaveBeenCalledTimes(1);
  });
});
