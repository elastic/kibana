/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { fromRoot } from '@kbn/utils';
import { rawConfigServiceMock } from './config_service.test.mocks';
import { rawConfigServiceMock as rawMock } from '@kbn/config-mocks';
import { ConfigService } from './config_service';

const DEFAULT_CONFIG_PATH = fromRoot('config/gateway.yml');

describe('ConfigService', () => {
  afterEach(() => {
    rawConfigServiceMock.mockClear();
  });

  describe('constructor', () => {
    test('instantiates RawConfigService with the default config path', () => {
      new ConfigService();
      expect(rawConfigServiceMock).toHaveBeenCalledTimes(1);
      expect(rawConfigServiceMock).toHaveBeenCalledWith([DEFAULT_CONFIG_PATH]);
    });

    test('instantiates RawConfigService with a custom config path provided via -c flag', () => {
      const oldArgv = process.argv;
      process.argv = ['-a', 'bc', '-c', 'a/b/c.yml', '-x', 'yz'];

      new ConfigService();

      expect(rawConfigServiceMock).toHaveBeenCalledTimes(1);
      expect(rawConfigServiceMock).toHaveBeenCalledWith(['a/b/c.yml']);

      process.argv = oldArgv;
    });

    test('instantiates RawConfigService with a custom config path provided via --config flag', () => {
      const oldArgv = process.argv;
      process.argv = ['-a', 'bc', '--config', 'a/b/c.yml', '-x', 'yz'];

      new ConfigService();

      expect(rawConfigServiceMock).toHaveBeenCalledTimes(1);
      expect(rawConfigServiceMock).toHaveBeenCalledWith(['a/b/c.yml']);

      process.argv = oldArgv;
    });
  });

  describe('setSchema', () => {
    test('accepts string-based paths', () => {
      const configService = new ConfigService();
      expect(() => {
        configService.setSchema('foo', schema.string());
      }).not.toThrowError();
    });

    test('accepts array-based paths', () => {
      const configService = new ConfigService();
      expect(() => {
        configService.setSchema(['foo'], schema.string());
      }).not.toThrowError();
    });

    test('does not allow setting two schemas for the same namespace', () => {
      const configService = new ConfigService();
      expect(() => {
        configService.setSchema('foo', schema.string());
        configService.setSchema('foo', schema.number());
      }).toThrowErrorMatchingInlineSnapshot(`"Validation schema for [foo] was already registered"`);
    });
  });

  describe('start', () => {
    test('returns the expected contract', async () => {
      const configService = new ConfigService();
      const configStart = await configService.start();
      expect(Object.keys(configStart)).toMatchInlineSnapshot(`
        Array [
          "atPathSync",
        ]
      `);
    });

    test('attempts to load the config', () => {
      const mock = rawMock.create();
      rawConfigServiceMock.mockImplementationOnce(() => mock);
      const configService = new ConfigService();
      configService.start();
      expect(mock.loadConfig).toHaveBeenCalledTimes(1);
    });

    test('validates the config against each registered schema', async () => {
      const mock = rawMock.create({ rawConfig: { a: { c: true }, b: { d: false } } });
      rawConfigServiceMock.mockImplementationOnce(() => mock);

      const configService = new ConfigService();
      configService.setSchema('a', schema.object({ c: schema.boolean() }));
      configService.setSchema('b', schema.object({ d: schema.boolean() }));

      expect(async () => {
        await configService.start();
      }).not.toThrowError();
    });

    test('throws an error if config validation fails', async () => {
      const mock = rawMock.create({ rawConfig: { a: { c: 'oops' }, b: { d: false } } });
      rawConfigServiceMock.mockImplementationOnce(() => mock);

      const configService = new ConfigService();
      configService.setSchema('a', schema.object({ c: schema.boolean() }));
      configService.setSchema('b', schema.object({ d: schema.boolean() }));

      expect(async () => {
        await configService.start();
      }).rejects.toThrowErrorMatchingInlineSnapshot(
        `"[c]: expected value of type [boolean] but got [string]"`
      );
    });

    describe('atPathSync', () => {
      test('returns config at the given path', async () => {
        const mock = rawMock.create({ rawConfig: { foo: { bar: 100 } } });
        rawConfigServiceMock.mockImplementationOnce(() => mock);

        const configService = new ConfigService();
        configService.setSchema('foo', schema.object({ bar: schema.number() }));
        const { atPathSync } = await configService.start();

        expect(atPathSync('foo')).toEqual({ bar: 100 });
      });

      test('returns an error if no validated config exists for a schema', async () => {
        const mock = rawMock.create({ rawConfig: { foo: { bar: 100 } } });
        rawConfigServiceMock.mockImplementationOnce(() => mock);

        const configService = new ConfigService();
        configService.setSchema('foo', schema.object({ bar: schema.number() }));
        const { atPathSync } = await configService.start();

        expect(() => {
          atPathSync('oops');
        }).toThrowErrorMatchingInlineSnapshot(`"Validated config at path [oops] does not exist"`);
      });
    });
  });

  describe('stop', () => {
    test('stops the underlying RawConfigService', () => {
      const mock = rawMock.create();
      rawConfigServiceMock.mockImplementationOnce(() => mock);
      const configService = new ConfigService();
      configService.stop();
      expect(mock.stop).toHaveBeenCalledTimes(1);
    });
  });
});
