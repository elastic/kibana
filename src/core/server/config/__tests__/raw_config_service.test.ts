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

const mockGetConfigFromFile = jest.fn();

jest.mock('../read_config', () => ({
  getConfigFromFile: mockGetConfigFromFile,
}));

import { first, k$, toPromise } from '../../../lib/kbn_observable';
import { RawConfigService } from '../raw_config_service';

const configFile = '/config/kibana.yml';

beforeEach(() => {
  mockGetConfigFromFile.mockReset();
  mockGetConfigFromFile.mockImplementation(() => ({}));
});

test('loads raw config when started', () => {
  const configService = new RawConfigService(configFile);

  configService.loadConfig();

  expect(mockGetConfigFromFile).toHaveBeenCalledTimes(1);
  expect(mockGetConfigFromFile).toHaveBeenLastCalledWith(configFile);
});

test('re-reads the config when reloading', () => {
  const configService = new RawConfigService(configFile);

  configService.loadConfig();

  mockGetConfigFromFile.mockClear();
  mockGetConfigFromFile.mockImplementation(() => ({ foo: 'bar' }));

  configService.reloadConfig();

  expect(mockGetConfigFromFile).toHaveBeenCalledTimes(1);
  expect(mockGetConfigFromFile).toHaveBeenLastCalledWith(configFile);
});

test('returns config at path as observable', async () => {
  mockGetConfigFromFile.mockImplementation(() => ({ key: 'value' }));

  const configService = new RawConfigService(configFile);

  configService.loadConfig();

  const exampleConfig = await k$(configService.getConfig$())(first(), toPromise());

  expect(exampleConfig.get('key')).toEqual('value');
  expect(exampleConfig.getFlattenedPaths()).toEqual(['key']);
});

test("does not push new configs when reloading if config at path hasn't changed", async () => {
  mockGetConfigFromFile.mockImplementation(() => ({ key: 'value' }));

  const configService = new RawConfigService(configFile);

  configService.loadConfig();

  const valuesReceived: any[] = [];
  configService.getConfig$().subscribe(config => {
    valuesReceived.push(config);
  });

  mockGetConfigFromFile.mockClear();
  mockGetConfigFromFile.mockImplementation(() => ({ key: 'value' }));

  configService.reloadConfig();

  expect(valuesReceived).toHaveLength(1);
  expect(valuesReceived[0].get('key')).toEqual('value');
  expect(valuesReceived[0].getFlattenedPaths()).toEqual(['key']);
});

test('pushes new config when reloading and config at path has changed', async () => {
  mockGetConfigFromFile.mockImplementation(() => ({ key: 'value' }));

  const configService = new RawConfigService(configFile);

  configService.loadConfig();

  const valuesReceived: any[] = [];
  configService.getConfig$().subscribe(config => {
    valuesReceived.push(config);
  });

  mockGetConfigFromFile.mockClear();
  mockGetConfigFromFile.mockImplementation(() => ({ key: 'new value' }));

  configService.reloadConfig();

  expect(valuesReceived).toHaveLength(2);
  expect(valuesReceived[0].get('key')).toEqual('value');
  expect(valuesReceived[0].getFlattenedPaths()).toEqual(['key']);
  expect(valuesReceived[1].get('key')).toEqual('new value');
  expect(valuesReceived[1].getFlattenedPaths()).toEqual(['key']);
});

test('completes config observables when stopped', done => {
  expect.assertions(0);

  mockGetConfigFromFile.mockImplementation(() => ({ key: 'value' }));

  const configService = new RawConfigService(configFile);

  configService.loadConfig();

  configService.getConfig$().subscribe({
    complete: () => done(),
  });

  configService.stop();
});
