const mockGetConfigFromFile = jest.fn();

jest.mock('../readConfig', () => ({
  getConfigFromFile: mockGetConfigFromFile
}));

import { ConfigService } from '../ConfigService';
import { Env } from '../Env';
import { logger } from '../../logger/__mocks__'
import { Schema } from '../../types';
import * as schemaLib from '../../lib/schema'

const emptyArgv = {};
const noOverrides = {};

beforeEach(() => {
  mockGetConfigFromFile.mockReset();
  mockGetConfigFromFile.mockImplementation(() => ({}));
});

test('loads raw config when started', () => {
  const env = new Env('/kibana', emptyArgv);
  const configService = new ConfigService(noOverrides, env, logger);

  configService.start();

  expect(mockGetConfigFromFile).toHaveBeenCalledTimes(1);
  expect(mockGetConfigFromFile).toHaveBeenLastCalledWith('/kibana/config/kibana.yml');
});

test('specifies additional config files if in argv when started', () => {
  const argv = {
    config: '/my/special/kibana/config.yml'
  };
  const env = new Env('/kibana', argv);
  const configService = new ConfigService(noOverrides, env, logger);

  configService.start();

  expect(mockGetConfigFromFile).toHaveBeenCalledTimes(1);
  expect(mockGetConfigFromFile).toHaveBeenLastCalledWith(
    '/my/special/kibana/config.yml'
  );
});

test('re-reads the config when reloading', () => {
  const argv = {
    config: '/my/special/kibana/config.yml'
  };
  const env = new Env('/kibana', argv);
  const configService = new ConfigService(noOverrides, env, logger);

  configService.start();

  mockGetConfigFromFile.mockClear();
  mockGetConfigFromFile.mockImplementation(() => ({ foo: 'bar' }));

  configService.reloadConfig();

  expect(mockGetConfigFromFile).toHaveBeenCalledTimes(1);
  expect(mockGetConfigFromFile).toHaveBeenLastCalledWith(
    '/my/special/kibana/config.yml'
  );
});

test('returns config at path as observable', async () => {
  mockGetConfigFromFile.mockImplementation(() => ({ key: 'value' }));

  const env = new Env('/kibana', emptyArgv);
  const configService = new ConfigService(noOverrides, env, logger);

  configService.start();

  const configs = configService.atPath('key', ExampleClassWithStringSchema);

  const exampleConfig = await configs.first().toPromise();

  expect(exampleConfig.value).toBe('value');
});

test('can specify config overrides', async () => {
  mockGetConfigFromFile.mockImplementation(() => ({ key: 'value' }));

  const env = new Env('/kibana', emptyArgv);
  const overrides = {
    key: 'override!'
  }
  const configService = new ConfigService(overrides, env, logger);

  configService.start();

  const configs = configService.atPath('key', ExampleClassWithStringSchema);

  const exampleConfig = await configs.first().toPromise();

  expect(exampleConfig.value).toBe('override!');
});

test('throws if config at path does not match schema', async () => {
  expect.assertions(1);

  mockGetConfigFromFile.mockImplementation(() => ({ key: 123 }));

  const env = new Env('/kibana', emptyArgv);
  const configService = new ConfigService(noOverrides, env, logger);

  configService.start();

  const configs = configService.atPath('key', ExampleClassWithStringSchema);

  try {
    await configs.first().toPromise();
  } catch (e) {
    expect(e.message).toMatchSnapshot();
  }
});

test("returns undefined if fetching optional config at a path that doesn't exist", async () => {
  mockGetConfigFromFile.mockImplementation(() => ({ foo: 'bar' }));

  const env = new Env('/kibana', emptyArgv);
  const configService = new ConfigService(noOverrides, env, logger);

  configService.start();

  const configs = configService.optionalAtPath('unique-name', ExampleClassWithStringSchema);

  const exampleConfig = await configs.first().toPromise();

  expect(exampleConfig).toBeUndefined();
});

test("returns observable config at optional path if it exists", async () => {
  mockGetConfigFromFile.mockImplementation(() => ({ value: 'bar' }));

  const env = new Env('/kibana', emptyArgv);
  const configService = new ConfigService(noOverrides, env, logger);

  configService.start();

  const configs = configService.optionalAtPath('value', ExampleClassWithStringSchema);

  const exampleConfig: any = await configs.first().toPromise();

  expect(exampleConfig).toBeDefined();
  expect(exampleConfig.value).toBe('bar');
});

test("does not push new configs when reloading if config at path hasn't changed", async () => {
  mockGetConfigFromFile.mockImplementation(() => ({ key: 'value' }));

  const env = new Env('/kibana', emptyArgv);
  const configService = new ConfigService(noOverrides, env, logger);

  configService.start();

  const valuesReceived: any[] = [];
  configService.atPath('key', ExampleClassWithStringSchema)
    .subscribe(config => {
      valuesReceived.push(config.value);
    });

  mockGetConfigFromFile.mockClear();
  mockGetConfigFromFile.mockImplementation(() => ({ key: 'value' }));

  configService.reloadConfig();

  expect(valuesReceived).toEqual(['value']);
});

test("pushes new config when reloading and config at path has changed", async () => {
  mockGetConfigFromFile.mockImplementation(() => ({ key: 'value' }));

  const env = new Env('/kibana', emptyArgv);
  const configService = new ConfigService(noOverrides, env, logger);

  configService.start();

  const valuesReceived: any[] = [];
  configService.atPath('key', ExampleClassWithStringSchema)
    .subscribe(config => {
      valuesReceived.push(config.value);
    });

  mockGetConfigFromFile.mockClear();
  mockGetConfigFromFile.mockImplementation(() => ({ key: 'new value' }));

  configService.reloadConfig();

  expect(valuesReceived).toEqual(['value', 'new value']);
});

test("throws error if config class does not implement 'createSchema'", async () => {
  expect.assertions(1);

  class ExampleClass {
  }

  const env = new Env('/kibana', emptyArgv);
  const configService = new ConfigService(noOverrides, env, logger);

  configService.start();

  const configs = configService.atPath('key', ExampleClass as any);

  try {
    await configs.first().toPromise();
  } catch(e) {
    expect(e).toMatchSnapshot();
  }
});

test('completes config observables when stopped', (done) => {
  expect.assertions(0);

  mockGetConfigFromFile.mockImplementation(() => ({ key: 'value' }));

  const env = new Env('/kibana', emptyArgv);
  const configService = new ConfigService(noOverrides, env, logger);

  configService.start();

  configService.atPath('key', ExampleClassWithStringSchema)
    .subscribe({
      complete: () => done()
    });

  configService.stop();
});

test("tracks unhandled paths", async () => {
  mockGetConfigFromFile.mockImplementation(() => ({
    foo: 'value',
    bar: {
      deep1: {
        key: '123'
      },
      deep2: {
        key: '321'
      }
    },
    quux: {
      deep1: {
        key: 'hello'
      },
      deep2: {
        key: 'world'
      }
    }
  }));

  const env = new Env('/kibana', emptyArgv);
  const configService = new ConfigService(noOverrides, env, logger);

  configService.start();

  configService.atPath('foo', createClassWithSchema(schemaLib.string()));
  configService.atPath(['bar', 'deep2'], createClassWithSchema(schemaLib.object({
    key: schemaLib.string()
  })));

  const unused = await configService.getUnusedPaths();

  expect(unused).toEqual(["bar.deep1.key", "quux.deep1.key", "quux.deep2.key"]);
});

test('handles enabled path, but only marks the enabled path as used', async () => {
  mockGetConfigFromFile.mockImplementation(() => ({
    pid: {
      enabled: true,
      file: '/some/file.pid'
    }
  }));

  const env = new Env('/kibana', emptyArgv);
  const configService = new ConfigService(noOverrides, env, logger);

  configService.start();

  const isEnabled = await configService.isEnabledAtPath('pid');
  expect(isEnabled).toBe(true);

  const unusedPaths = await configService.getUnusedPaths();
  expect(unusedPaths).toEqual(['pid.file']);
});

test('handles enabled path when path is array', async () => {
  mockGetConfigFromFile.mockImplementation(() => ({
    pid: {
      enabled: true,
      file: '/some/file.pid'
    }
  }));

  const env = new Env('/kibana', emptyArgv);
  const configService = new ConfigService(noOverrides, env, logger);

  configService.start();

  const isEnabled = await configService.isEnabledAtPath(['pid']);
  expect(isEnabled).toBe(true);

  const unusedPaths = await configService.getUnusedPaths();
  expect(unusedPaths).toEqual(['pid.file']);
});

test('handles disabled path and marks config as used', async () => {
  mockGetConfigFromFile.mockImplementation(() => ({
    pid: {
      enabled: false,
      file: '/some/file.pid'
    }
  }));

  const env = new Env('/kibana', emptyArgv);
  const configService = new ConfigService(noOverrides, env, logger);

  configService.start();

  const isEnabled = await configService.isEnabledAtPath('pid');
  expect(isEnabled).toBe(false);

  const unusedPaths = await configService.getUnusedPaths();
  expect(unusedPaths).toEqual([]);
});

function createClassWithSchema(schema: schemaLib.Any) {
  return class ExampleClassWithSchema {
    static createSchema = () => {
      return schema;
    }

    constructor(readonly value: schemaLib.TypeOf<typeof schema>) {
    }
  }
}

class ExampleClassWithStringSchema {
  static createSchema = (schema: Schema) => {
    return schema.string();
  }

  constructor(readonly value: string) {
  }
}
