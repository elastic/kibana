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

/* eslint-disable max-classes-per-file */

import { BehaviorSubject, Observable } from 'rxjs';
import { first } from 'rxjs/operators';

import { mockPackage } from './config_service.test.mocks';

import { schema } from '@kbn/config-schema';

import { ConfigService, Env, ObjectToConfigAdapter } from '.';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { getEnvOptions } from './__mocks__/env';

const emptyArgv = getEnvOptions();
const defaultEnv = new Env('/kibana', emptyArgv);
const logger = loggingServiceMock.create();

test('returns config at path as observable', async () => {
  const config$ = new BehaviorSubject(new ObjectToConfigAdapter({ key: 'foo' }));
  const configService = new ConfigService(config$, defaultEnv, logger);
  const stringSchema = schema.string();
  await configService.setSchema('key', stringSchema);

  const value$ = configService.atPath('key');
  expect(value$).toBeInstanceOf(Observable);

  const value = await value$.pipe(first()).toPromise();
  expect(value).toBe('foo');
});

test('throws if config at path does not match schema', async () => {
  const config$ = new BehaviorSubject(new ObjectToConfigAdapter({ key: 123 }));

  const configService = new ConfigService(config$, defaultEnv, logger);

  await expect(
    configService.setSchema('key', schema.string())
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"[key]: expected value of type [string] but got [number]"`
  );
});

test('re-validate config when updated', async () => {
  const config$ = new BehaviorSubject(new ObjectToConfigAdapter({ key: 'value' }));

  const configService = new ConfigService(config$, defaultEnv, logger);
  configService.setSchema('key', schema.string());

  const valuesReceived: any[] = [];
  await configService.atPath('key').subscribe(
    value => {
      valuesReceived.push(value);
    },
    error => {
      valuesReceived.push(error);
    }
  );

  config$.next(new ObjectToConfigAdapter({ key: 123 }));

  await expect(valuesReceived).toMatchInlineSnapshot(`
Array [
  "value",
  [Error: [key]: expected value of type [string] but got [number]],
]
`);
});

test("returns undefined if fetching optional config at a path that doesn't exist", async () => {
  const config$ = new BehaviorSubject(new ObjectToConfigAdapter({}));
  const configService = new ConfigService(config$, defaultEnv, logger);

  const value$ = configService.optionalAtPath('unique-name');
  const value = await value$.pipe(first()).toPromise();

  expect(value).toBeUndefined();
});

test('returns observable config at optional path if it exists', async () => {
  const config$ = new BehaviorSubject(new ObjectToConfigAdapter({ value: 'bar' }));
  const configService = new ConfigService(config$, defaultEnv, logger);
  await configService.setSchema('value', schema.string());

  const value$ = configService.optionalAtPath('value');
  const value: any = await value$.pipe(first()).toPromise();

  expect(value).toBe('bar');
});

test("does not push new configs when reloading if config at path hasn't changed", async () => {
  const config$ = new BehaviorSubject(new ObjectToConfigAdapter({ key: 'value' }));
  const configService = new ConfigService(config$, defaultEnv, logger);
  await configService.setSchema('key', schema.string());

  const valuesReceived: any[] = [];
  configService.atPath('key').subscribe(value => {
    valuesReceived.push(value);
  });

  config$.next(new ObjectToConfigAdapter({ key: 'value' }));

  expect(valuesReceived).toEqual(['value']);
});

test('pushes new config when reloading and config at path has changed', async () => {
  const config$ = new BehaviorSubject(new ObjectToConfigAdapter({ key: 'value' }));
  const configService = new ConfigService(config$, defaultEnv, logger);
  await configService.setSchema('key', schema.string());

  const valuesReceived: any[] = [];
  configService.atPath('key').subscribe(value => {
    valuesReceived.push(value);
  });

  config$.next(new ObjectToConfigAdapter({ key: 'new value' }));

  expect(valuesReceived).toEqual(['value', 'new value']);
});

test("throws error if 'schema' is not defined for a key", async () => {
  const config$ = new BehaviorSubject(new ObjectToConfigAdapter({ key: 'value' }));
  const configService = new ConfigService(config$, defaultEnv, logger);

  const configs = configService.atPath('key');

  await expect(configs.pipe(first()).toPromise()).rejects.toMatchInlineSnapshot(
    `[Error: No validation schema has been defined for key]`
  );
});

test("throws error if 'setSchema' called several times for the same key", async () => {
  const config$ = new BehaviorSubject(new ObjectToConfigAdapter({ key: 'value' }));
  const configService = new ConfigService(config$, defaultEnv, logger);
  const addSchema = async () => await configService.setSchema('key', schema.string());
  await addSchema();
  await expect(addSchema()).rejects.toMatchInlineSnapshot(
    `[Error: Validation schema for key was already registered.]`
  );
});

test('tracks unhandled paths', async () => {
  const initialConfig = {
    bar: {
      deep1: {
        key: '123',
      },
      deep2: {
        key: '321',
      },
    },
    foo: 'value',
    quux: {
      deep1: {
        key: 'hello',
      },
      deep2: {
        key: 'world',
      },
    },
  };

  const config$ = new BehaviorSubject(new ObjectToConfigAdapter(initialConfig));
  const configService = new ConfigService(config$, defaultEnv, logger);

  configService.atPath('foo');
  configService.atPath(['bar', 'deep2']);

  const unused = await configService.getUnusedPaths();

  expect(unused).toEqual(['bar.deep1.key', 'quux.deep1.key', 'quux.deep2.key']);
});

test('correctly passes context', async () => {
  mockPackage.raw = {
    branch: 'feature-v1',
    version: 'v1',
    build: {
      distributable: true,
      number: 100,
      sha: 'feature-v1-build-sha',
    },
  };

  const env = new Env('/kibana', getEnvOptions());

  const config$ = new BehaviorSubject(new ObjectToConfigAdapter({ foo: {} }));
  const schemaDefinition = schema.object({
    branchRef: schema.string({
      defaultValue: schema.contextRef('branch'),
    }),
    buildNumRef: schema.number({
      defaultValue: schema.contextRef('buildNum'),
    }),
    buildShaRef: schema.string({
      defaultValue: schema.contextRef('buildSha'),
    }),
    devRef: schema.boolean({ defaultValue: schema.contextRef('dev') }),
    prodRef: schema.boolean({ defaultValue: schema.contextRef('prod') }),
    versionRef: schema.string({
      defaultValue: schema.contextRef('version'),
    }),
  });
  const configService = new ConfigService(config$, env, logger);
  await configService.setSchema('foo', schemaDefinition);
  const value$ = configService.atPath('foo');

  expect(await value$.pipe(first()).toPromise()).toMatchSnapshot();
});

test('handles enabled path, but only marks the enabled path as used', async () => {
  const initialConfig = {
    pid: {
      enabled: true,
      file: '/some/file.pid',
    },
  };

  const config$ = new BehaviorSubject(new ObjectToConfigAdapter(initialConfig));
  const configService = new ConfigService(config$, defaultEnv, logger);

  const isEnabled = await configService.isEnabledAtPath('pid');
  expect(isEnabled).toBe(true);

  const unusedPaths = await configService.getUnusedPaths();
  expect(unusedPaths).toEqual(['pid.file']);
});

test('handles enabled path when path is array', async () => {
  const initialConfig = {
    pid: {
      enabled: true,
      file: '/some/file.pid',
    },
  };

  const config$ = new BehaviorSubject(new ObjectToConfigAdapter(initialConfig));
  const configService = new ConfigService(config$, defaultEnv, logger);

  const isEnabled = await configService.isEnabledAtPath(['pid']);
  expect(isEnabled).toBe(true);

  const unusedPaths = await configService.getUnusedPaths();
  expect(unusedPaths).toEqual(['pid.file']);
});

test('handles disabled path and marks config as used', async () => {
  const initialConfig = {
    pid: {
      enabled: false,
      file: '/some/file.pid',
    },
  };

  const config$ = new BehaviorSubject(new ObjectToConfigAdapter(initialConfig));
  const configService = new ConfigService(config$, defaultEnv, logger);

  const isEnabled = await configService.isEnabledAtPath('pid');
  expect(isEnabled).toBe(false);

  const unusedPaths = await configService.getUnusedPaths();
  expect(unusedPaths).toEqual([]);
});

test('treats config as enabled if config path is not present in config', async () => {
  const initialConfig = {};

  const config$ = new BehaviorSubject(new ObjectToConfigAdapter(initialConfig));
  const configService = new ConfigService(config$, defaultEnv, logger);

  const isEnabled = await configService.isEnabledAtPath('pid');
  expect(isEnabled).toBe(true);

  const unusedPaths = await configService.getUnusedPaths();
  expect(unusedPaths).toEqual([]);
});
