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

import { mockGetConfigFromFiles } from './raw_config_service.test.mocks';

import { first } from 'rxjs/operators';
import { RawConfigService } from '.';

const configFile = '/config/kibana.yml';
const anotherConfigFile = '/config/kibana.dev.yml';

beforeEach(() => {
  mockGetConfigFromFiles.mockReset();
  mockGetConfigFromFiles.mockImplementation(() => ({}));
});

test('loads single raw config when started', () => {
  const configService = new RawConfigService([configFile]);

  configService.loadConfig();

  expect(mockGetConfigFromFiles).toHaveBeenCalledTimes(1);
  expect(mockGetConfigFromFiles).toHaveBeenLastCalledWith([configFile]);
});

test('loads multiple raw configs when started', () => {
  const configService = new RawConfigService([configFile, anotherConfigFile]);

  configService.loadConfig();

  expect(mockGetConfigFromFiles).toHaveBeenCalledTimes(1);
  expect(mockGetConfigFromFiles).toHaveBeenLastCalledWith([configFile, anotherConfigFile]);
});

test('re-reads single config when reloading', () => {
  const configService = new RawConfigService([configFile]);

  configService.loadConfig();

  mockGetConfigFromFiles.mockClear();
  mockGetConfigFromFiles.mockImplementation(() => ({ foo: 'bar' }));

  configService.reloadConfig();

  expect(mockGetConfigFromFiles).toHaveBeenCalledTimes(1);
  expect(mockGetConfigFromFiles).toHaveBeenLastCalledWith([configFile]);
});

test('re-reads multiple configs when reloading', () => {
  const configService = new RawConfigService([configFile, anotherConfigFile]);

  configService.loadConfig();

  mockGetConfigFromFiles.mockClear();
  mockGetConfigFromFiles.mockImplementation(() => ({ foo: 'bar' }));

  configService.reloadConfig();

  expect(mockGetConfigFromFiles).toHaveBeenCalledTimes(1);
  expect(mockGetConfigFromFiles).toHaveBeenLastCalledWith([configFile, anotherConfigFile]);
});

test('returns config at path as observable', async () => {
  mockGetConfigFromFiles.mockImplementation(() => ({ key: 'value' }));

  const configService = new RawConfigService([configFile]);

  configService.loadConfig();

  const exampleConfig = await configService
    .getConfig$()
    .pipe(first())
    .toPromise();

  expect(exampleConfig.key).toEqual('value');
  expect(Object.keys(exampleConfig)).toEqual(['key']);
});

test("pushes new configs when reloading even if config at path hasn't changed", async () => {
  mockGetConfigFromFiles.mockImplementation(() => ({ key: 'value' }));

  const configService = new RawConfigService([configFile]);

  configService.loadConfig();

  const valuesReceived: any[] = [];
  configService.getConfig$().subscribe(config => {
    valuesReceived.push(config);
  });

  mockGetConfigFromFiles.mockClear();
  mockGetConfigFromFiles.mockImplementation(() => ({ key: 'value' }));

  configService.reloadConfig();

  expect(valuesReceived).toMatchInlineSnapshot(`
    Array [
      Object {
        "key": "value",
      },
      Object {
        "key": "value",
      },
    ]
  `);
});

test('pushes new config when reloading and config at path has changed', async () => {
  mockGetConfigFromFiles.mockImplementation(() => ({ key: 'value' }));

  const configService = new RawConfigService([configFile]);

  configService.loadConfig();

  const valuesReceived: any[] = [];
  configService.getConfig$().subscribe(config => {
    valuesReceived.push(config);
  });

  mockGetConfigFromFiles.mockClear();
  mockGetConfigFromFiles.mockImplementation(() => ({ key: 'new value' }));

  configService.reloadConfig();

  expect(valuesReceived).toHaveLength(2);
  expect(valuesReceived[0].key).toEqual('value');
  expect(Object.keys(valuesReceived[0])).toEqual(['key']);
  expect(valuesReceived[1].key).toEqual('new value');
  expect(Object.keys(valuesReceived[1])).toEqual(['key']);
});

test('completes config observables when stopped', done => {
  expect.assertions(0);

  mockGetConfigFromFiles.mockImplementation(() => ({ key: 'value' }));

  const configService = new RawConfigService([configFile]);

  configService.loadConfig();

  configService.getConfig$().subscribe({
    complete: () => done(),
  });

  configService.stop();
});
