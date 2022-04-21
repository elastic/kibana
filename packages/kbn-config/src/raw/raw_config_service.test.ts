/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockGetConfigFromFiles } from './raw_config_service.test.mocks';

import { firstValueFrom } from 'rxjs';
import { RawConfigService } from './raw_config_service';

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

  const exampleConfig = await firstValueFrom(configService.getConfig$());

  expect(exampleConfig.key).toEqual('value');
  expect(Object.keys(exampleConfig)).toEqual(['key']);
});

test("pushes new configs when reloading even if config at path hasn't changed", async () => {
  mockGetConfigFromFiles.mockImplementation(() => ({ key: 'value' }));

  const configService = new RawConfigService([configFile]);

  configService.loadConfig();

  const valuesReceived: any[] = [];
  configService.getConfig$().subscribe((config) => {
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
  configService.getConfig$().subscribe((config) => {
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

test('completes config observables when stopped', (done) => {
  expect.assertions(0);

  mockGetConfigFromFiles.mockImplementation(() => ({ key: 'value' }));

  const configService = new RawConfigService([configFile]);

  configService.loadConfig();

  configService.getConfig$().subscribe({
    complete: () => done(),
  });

  configService.stop();
});
