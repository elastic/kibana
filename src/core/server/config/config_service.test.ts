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
import { first, take } from 'rxjs/operators';

import { mockPackage, mockApplyDeprecations } from './config_service.test.mocks';
import { rawConfigServiceMock } from './raw_config_service.mock';

import { schema } from '@kbn/config-schema';

import { ConfigService, Env } from '.';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { getEnvOptions } from './__mocks__/env';

const emptyArgv = getEnvOptions();
const defaultEnv = new Env('/kibana', emptyArgv);
const logger = loggingServiceMock.create();

const getRawConfigProvider = (rawConfig: Record<string, any>) =>
  rawConfigServiceMock.create({ rawConfig });

test('returns config at path as observable', async () => {
  const rawConfig = getRawConfigProvider({ key: 'foo' });
  const configService = new ConfigService(rawConfig, defaultEnv, logger);
  const stringSchema = schema.string();
  await configService.setSchema('key', stringSchema);

  const value$ = configService.atPath('key');
  expect(value$).toBeInstanceOf(Observable);

  const value = await value$.pipe(first()).toPromise();
  expect(value).toBe('foo');
});

test('throws if config at path does not match schema', async () => {
  const rawConfig = getRawConfigProvider({ key: 123 });

  const configService = new ConfigService(rawConfig, defaultEnv, logger);
  await configService.setSchema('key', schema.string());

  const valuesReceived: any[] = [];
  await configService
    .atPath('key')
    .pipe(take(1))
    .subscribe(
      value => {
        valuesReceived.push(value);
      },
      error => {
        valuesReceived.push(error);
      }
    );

  await expect(valuesReceived).toMatchInlineSnapshot(`
      Array [
        [Error: [config validation of [key]]: expected value of type [string] but got [number]],
      ]
  `);
});

test('re-validate config when updated', async () => {
  const rawConfig$ = new BehaviorSubject<Record<string, any>>({ key: 'value' });
  const rawConfigProvider = rawConfigServiceMock.create({ rawConfig$ });

  const configService = new ConfigService(rawConfigProvider, defaultEnv, logger);
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

  rawConfig$.next({ key: 123 });

  await expect(valuesReceived).toMatchInlineSnapshot(`
        Array [
          "value",
          [Error: [config validation of [key]]: expected value of type [string] but got [number]],
        ]
  `);
});

test("returns undefined if fetching optional config at a path that doesn't exist", async () => {
  const rawConfig = getRawConfigProvider({});
  const configService = new ConfigService(rawConfig, defaultEnv, logger);

  const value$ = configService.optionalAtPath('unique-name');
  const value = await value$.pipe(first()).toPromise();

  expect(value).toBeUndefined();
});

test('returns observable config at optional path if it exists', async () => {
  const rawConfig = getRawConfigProvider({ value: 'bar' });
  const configService = new ConfigService(rawConfig, defaultEnv, logger);
  await configService.setSchema('value', schema.string());

  const value$ = configService.optionalAtPath('value');
  const value: any = await value$.pipe(first()).toPromise();

  expect(value).toBe('bar');
});

test("does not push new configs when reloading if config at path hasn't changed", async () => {
  const rawConfig$ = new BehaviorSubject<Record<string, any>>({ key: 'value' });
  const rawConfigProvider = rawConfigServiceMock.create({ rawConfig$ });

  const configService = new ConfigService(rawConfigProvider, defaultEnv, logger);
  await configService.setSchema('key', schema.string());

  const valuesReceived: any[] = [];
  configService.atPath('key').subscribe(value => {
    valuesReceived.push(value);
  });

  rawConfig$.next({ key: 'value' });

  expect(valuesReceived).toEqual(['value']);
});

test('pushes new config when reloading and config at path has changed', async () => {
  const rawConfig$ = new BehaviorSubject<Record<string, any>>({ key: 'value' });
  const rawConfigProvider = rawConfigServiceMock.create({ rawConfig$ });

  const configService = new ConfigService(rawConfigProvider, defaultEnv, logger);
  await configService.setSchema('key', schema.string());

  const valuesReceived: any[] = [];
  configService.atPath('key').subscribe(value => {
    valuesReceived.push(value);
  });

  rawConfig$.next({ key: 'new value' });

  expect(valuesReceived).toEqual(['value', 'new value']);
});

test("throws error if 'schema' is not defined for a key", async () => {
  const rawConfigProvider = rawConfigServiceMock.create({ rawConfig: { key: 'value' } });
  const configService = new ConfigService(rawConfigProvider, defaultEnv, logger);

  const configs = configService.atPath('key');

  await expect(configs.pipe(first()).toPromise()).rejects.toMatchInlineSnapshot(
    `[Error: No validation schema has been defined for [key]]`
  );
});

test("throws error if 'setSchema' called several times for the same key", async () => {
  const rawConfigProvider = rawConfigServiceMock.create({ rawConfig: { key: 'value' } });
  const configService = new ConfigService(rawConfigProvider, defaultEnv, logger);
  const addSchema = async () => await configService.setSchema('key', schema.string());
  await addSchema();
  await expect(addSchema()).rejects.toMatchInlineSnapshot(
    `[Error: Validation schema for [key] was already registered.]`
  );
});

test('flags schema paths as handled when registering a schema', async () => {
  const rawConfigProvider = rawConfigServiceMock.create({
    rawConfig: {
      service: {
        string: 'str',
        number: 42,
      },
    },
  });
  const configService = new ConfigService(rawConfigProvider, defaultEnv, logger);
  await configService.setSchema(
    'service',
    schema.object({
      string: schema.string(),
      number: schema.number(),
    })
  );

  expect(await configService.getUsedPaths()).toMatchInlineSnapshot(`
    Array [
      "service.string",
      "service.number",
    ]
  `);
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

  const rawConfigProvider = rawConfigServiceMock.create({ rawConfig: initialConfig });
  const configService = new ConfigService(rawConfigProvider, defaultEnv, logger);

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
  const rawConfigProvider = rawConfigServiceMock.create({ rawConfig: { foo: {} } });

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
  const configService = new ConfigService(rawConfigProvider, env, logger);
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

  const rawConfigProvider = rawConfigServiceMock.create({ rawConfig: initialConfig });
  const configService = new ConfigService(rawConfigProvider, defaultEnv, logger);

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

  const rawConfigProvider = rawConfigServiceMock.create({ rawConfig: initialConfig });
  const configService = new ConfigService(rawConfigProvider, defaultEnv, logger);

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

  const rawConfigProvider = rawConfigServiceMock.create({ rawConfig: initialConfig });
  const configService = new ConfigService(rawConfigProvider, defaultEnv, logger);

  const isEnabled = await configService.isEnabledAtPath('pid');
  expect(isEnabled).toBe(false);

  const unusedPaths = await configService.getUnusedPaths();
  expect(unusedPaths).toEqual([]);
});

test('does not throw if schema does not define "enabled" schema', async () => {
  const initialConfig = {
    pid: {
      file: '/some/file.pid',
    },
  };

  const rawConfigProvider = rawConfigServiceMock.create({ rawConfig: initialConfig });
  const configService = new ConfigService(rawConfigProvider, defaultEnv, logger);
  await expect(
    configService.setSchema(
      'pid',
      schema.object({
        file: schema.string(),
      })
    )
  ).resolves.toBeUndefined();

  const value$ = configService.atPath('pid');
  const value: any = await value$.pipe(first()).toPromise();
  expect(value.enabled).toBe(undefined);

  const valueOptional$ = configService.optionalAtPath('pid');
  const valueOptional: any = await valueOptional$.pipe(first()).toPromise();
  expect(valueOptional.enabled).toBe(undefined);
});

test('treats config as enabled if config path is not present in config', async () => {
  const initialConfig = {};

  const rawConfigProvider = rawConfigServiceMock.create({ rawConfig: initialConfig });
  const configService = new ConfigService(rawConfigProvider, defaultEnv, logger);

  const isEnabled = await configService.isEnabledAtPath('pid');
  expect(isEnabled).toBe(true);

  const unusedPaths = await configService.getUnusedPaths();
  expect(unusedPaths).toEqual([]);
});

test('read "enabled" even if its schema is not present', async () => {
  const initialConfig = {
    foo: {
      enabled: true,
    },
  };

  const rawConfigProvider = rawConfigServiceMock.create({ rawConfig: initialConfig });
  const configService = new ConfigService(rawConfigProvider, defaultEnv, logger);

  const isEnabled = await configService.isEnabledAtPath('foo');
  expect(isEnabled).toBe(true);
});

test('allows plugins to specify "enabled" flag via validation schema', async () => {
  const initialConfig = {};

  const rawConfigProvider = rawConfigServiceMock.create({ rawConfig: initialConfig });
  const configService = new ConfigService(rawConfigProvider, defaultEnv, logger);

  await configService.setSchema(
    'foo',
    schema.object({ enabled: schema.boolean({ defaultValue: false }) })
  );

  expect(await configService.isEnabledAtPath('foo')).toBe(false);

  await configService.setSchema(
    'bar',
    schema.object({ enabled: schema.boolean({ defaultValue: true }) })
  );

  expect(await configService.isEnabledAtPath('bar')).toBe(true);

  await configService.setSchema(
    'baz',
    schema.object({ different: schema.boolean({ defaultValue: true }) })
  );

  expect(await configService.isEnabledAtPath('baz')).toBe(true);
});

test('does not throw during validation is every schema is valid', async () => {
  const rawConfig = getRawConfigProvider({ stringKey: 'foo', numberKey: 42 });

  const configService = new ConfigService(rawConfig, defaultEnv, logger);
  await configService.setSchema('stringKey', schema.string());
  await configService.setSchema('numberKey', schema.number());

  await expect(configService.validate()).resolves.toBeUndefined();
});

test('throws during validation is any schema is invalid', async () => {
  const rawConfig = getRawConfigProvider({ stringKey: 123, numberKey: 42 });

  const configService = new ConfigService(rawConfig, defaultEnv, logger);
  await configService.setSchema('stringKey', schema.string());
  await configService.setSchema('numberKey', schema.number());

  await expect(configService.validate()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"[config validation of [stringKey]]: expected value of type [string] but got [number]"`
  );
});

test('logs deprecation warning during validation', async () => {
  const rawConfig = getRawConfigProvider({});
  const configService = new ConfigService(rawConfig, defaultEnv, logger);

  mockApplyDeprecations.mockImplementationOnce((config, deprecations, log) => {
    log('some deprecation message');
    log('another deprecation message');
    return config;
  });

  loggingServiceMock.clear(logger);
  await configService.validate();
  expect(loggingServiceMock.collect(logger).warn).toMatchInlineSnapshot(`
    Array [
      Array [
        "some deprecation message",
      ],
      Array [
        "another deprecation message",
      ],
    ]
  `);
});
