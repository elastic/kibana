const mockGetRawConfig = jest.fn();

jest.mock('../readConfig', () => ({
  getRawConfig: mockGetRawConfig
}));

import { ConfigService } from '../ConfigService';
import { Env } from '../Env';
import { logger } from '../../logger/__mocks__'
import { Schema } from '../../types';
import * as schemaLib from '../../lib/schema'

beforeEach(() => {
  mockGetRawConfig.mockReset();
  mockGetRawConfig.mockImplementation(() => ({}));
});

test('loads raw config when started', () => {
  const argv = {};
  const env = new Env('/kibana');
  const configService = new ConfigService(argv, env, logger);

  configService.start();

  expect(mockGetRawConfig).toHaveBeenCalledTimes(1);
  expect(mockGetRawConfig).toHaveBeenLastCalledWith(undefined, '/kibana/config/kibana.yml');
});

test('specifies additional config files if in argv when started', () => {
  const argv = {
    config: '/my/special/kibana/config.yml'
  };
  const env = new Env('/kibana');
  const configService = new ConfigService(argv, env, logger);

  configService.start();

  expect(mockGetRawConfig).toHaveBeenCalledTimes(1);
  expect(mockGetRawConfig).toHaveBeenLastCalledWith(
    '/my/special/kibana/config.yml',
    '/kibana/config/kibana.yml'
  );
});

test('re-reads the config when reloading', () => {
  const argv = {
    config: '/my/special/kibana/config.yml'
  };
  const env = new Env('/kibana');
  const configService = new ConfigService(argv, env, logger);

  configService.start();

  mockGetRawConfig.mockClear();
  mockGetRawConfig.mockImplementation(() => ({ foo: 'bar' }));

  configService.reloadConfig();

  expect(mockGetRawConfig).toHaveBeenCalledTimes(1);
  expect(mockGetRawConfig).toHaveBeenLastCalledWith(
    '/my/special/kibana/config.yml',
    '/kibana/config/kibana.yml'
  );
});

test('returns config at path as observable', async () => {
  mockGetRawConfig.mockImplementation(() => ({ key: 'value' }));

  const argv = {};
  const env = new Env('/kibana');
  const configService = new ConfigService(argv, env, logger);

  configService.start();

  const configs = configService.atPath('key', ExampleClassWithStringSchema);

  const exampleConfig = await configs.first().toPromise();

  expect(exampleConfig.value).toBe('value');
});

test('throws if config at path does not match schema', async () => {
  expect.assertions(1);

  mockGetRawConfig.mockImplementation(() => ({ key: 123 }));

  const argv = {};
  const env = new Env('/kibana');
  const configService = new ConfigService(argv, env, logger);

  configService.start();

  const configs = configService.atPath('key', ExampleClassWithStringSchema);

  try {
    await configs.first().toPromise();
  } catch (e) {
    expect(e.message).toMatchSnapshot();
  }
});

test("returns undefined if fetching optional config at a path that doesn't exist", async () => {
  mockGetRawConfig.mockImplementation(() => ({ foo: 'bar' }));

  const argv = {};
  const env = new Env('/kibana');
  const configService = new ConfigService(argv, env, logger);

  configService.start();

  const configs = configService.optionalAtPath('unique-name', ExampleClassWithStringSchema);

  const exampleConfig = await configs.first().toPromise();

  expect(exampleConfig).toBeUndefined();
});

test("returns observable config at optional path if it exists", async () => {
  mockGetRawConfig.mockImplementation(() => ({ value: 'bar' }));

  const argv = {};
  const env = new Env('/kibana');
  const configService = new ConfigService(argv, env, logger);

  configService.start();

  const configs = configService.optionalAtPath('value', ExampleClassWithStringSchema);

  const exampleConfig: any = await configs.first().toPromise();

  expect(exampleConfig).toBeDefined();
  expect(exampleConfig.value).toBe('bar');
});

test("does not push new configs when reloading if config at path hasn't changed", async () => {
  mockGetRawConfig.mockImplementation(() => ({ key: 'value' }));

  const argv = {};
  const env = new Env('/kibana');
  const configService = new ConfigService(argv, env, logger);

  configService.start();

  const valuesReceived: any[] = [];
  configService.atPath('key', ExampleClassWithStringSchema)
    .subscribe(config => {
      valuesReceived.push(config.value);
    });

  mockGetRawConfig.mockClear();
  mockGetRawConfig.mockImplementation(() => ({ key: 'value' }));

  configService.reloadConfig();

  expect(valuesReceived).toEqual(['value']);
});

test("pushes new config when reloading and config at path has changed", async () => {
  mockGetRawConfig.mockImplementation(() => ({ key: 'value' }));

  const argv = {};
  const env = new Env('/kibana');
  const configService = new ConfigService(argv, env, logger);

  configService.start();

  const valuesReceived: any[] = [];
  configService.atPath('key', ExampleClassWithStringSchema)
    .subscribe(config => {
      valuesReceived.push(config.value);
    });

  mockGetRawConfig.mockClear();
  mockGetRawConfig.mockImplementation(() => ({ key: 'new value' }));

  configService.reloadConfig();

  expect(valuesReceived).toEqual(['value', 'new value']);
});

test("throws error if config class does not implement 'createSchema'", async () => {
  expect.assertions(1);

  class ExampleClass {
  }

  const argv = {};
  const env = new Env('/kibana');
  const configService = new ConfigService(argv, env, logger);

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

  mockGetRawConfig.mockImplementation(() => ({ key: 'value' }));

  const argv = {};
  const env = new Env('/kibana');
  const configService = new ConfigService(argv, env, logger);

  configService.start();

  configService.atPath('key', ExampleClassWithStringSchema)
    .subscribe({
      complete: () => done()
    });

  configService.stop();
});

test("tracks unhandled paths", async () => {
  mockGetRawConfig.mockImplementation(() => ({
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

  const argv = {};
  const env = new Env('/kibana');
  const configService = new ConfigService(argv, env, logger);

  configService.start();

  configService.atPath('foo', createClassWithSchema(schemaLib.string()));
  configService.atPath(['bar', 'deep2'], createClassWithSchema(schemaLib.object({
    key: schemaLib.string()
  })));

  const unused = await configService.getUnusedPaths();

  expect(unused).toEqual(["bar.deep1.key", "quux.deep1.key", "quux.deep2.key"]);
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
