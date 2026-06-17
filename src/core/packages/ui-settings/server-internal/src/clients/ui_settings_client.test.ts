/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Chance from 'chance';
import { schema } from '@kbn/config-schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { mockCreateOrUpgradeSavedConfig } from './ui_settings_client.test.mock';
import { SavedObjectsClient } from '@kbn/core-saved-objects-api-server-internal';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { UiSettingsClient } from './ui_settings_client';
import {
  CannotOverrideError,
  ValidationBadValueError,
  ValidationSettingNotFoundError,
} from '../ui_settings_errors';
import { NAMESPACED_CACHE_TTL, NamespacedCache } from '../namespaced_cache';

const logger = loggingSystemMock.create().get();

const TYPE = 'config';
const ID = 'kibana-version';
const BUILD_NUM = 1234;
const chance = new Chance();

interface SetupOptions {
  defaults?: Record<string, any>;
  esDocSource?: Record<string, any>;
  overrides?: Record<string, any>;
  namespace?: string;
}

describe('ui settings', () => {
  function setup(options: SetupOptions = {}) {
    const { defaults = {}, overrides = {}, esDocSource = {}, namespace = 'default' } = options;

    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.get.mockReturnValue({ attributes: esDocSource } as any);

    const uiSettings = new UiSettingsClient({
      type: TYPE,
      id: ID,
      buildNum: BUILD_NUM,
      defaults,
      savedObjectsClient,
      overrides,
      log: logger,
      namespace,
    });

    return {
      uiSettings,
      savedObjectsClient,
    };
  }

  afterEach(() => jest.clearAllMocks());

  describe('#setMany()', () => {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      expect(uiSettings.setMany({ a: 'b' })).toBeInstanceOf(Promise);
    });

    it('updates a single value in one operation', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.setMany({ one: 'value' });

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        TYPE,
        ID,
        { one: 'value' },
        { refresh: false }
      );
    });

    it('updates several values in one operation', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.setMany({ one: 'value', another: 'val' });

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        TYPE,
        ID,
        {
          one: 'value',
          another: 'val',
        },
        { refresh: false }
      );
    });

    it('automatically creates the savedConfig if it is missing', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      savedObjectsClient.update
        .mockRejectedValueOnce(SavedObjectsClient.errors.createGenericNotFoundError())
        .mockResolvedValueOnce({} as any);

      await uiSettings.setMany({ foo: 'bar' });

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(2);
      expect(mockCreateOrUpgradeSavedConfig).toHaveBeenCalledTimes(1);
      expect(mockCreateOrUpgradeSavedConfig).toHaveBeenCalledWith(
        expect.objectContaining({ handleWriteErrors: false })
      );
    });

    it('only tried to auto create once and throws NotFound', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      savedObjectsClient.update.mockRejectedValue(
        SavedObjectsClient.errors.createGenericNotFoundError()
      );

      try {
        await uiSettings.setMany({ foo: 'bar' });
        throw new Error('expected setMany to throw a NotFound error');
      } catch (error) {
        expect(SavedObjectsClient.errors.isNotFoundError(error)).toBe(true);
      }

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(2);
      expect(mockCreateOrUpgradeSavedConfig).toHaveBeenCalledTimes(1);
      expect(mockCreateOrUpgradeSavedConfig).toHaveBeenCalledWith(
        expect.objectContaining({ handleWriteErrors: false })
      );
    });

    it('throws CannotOverrideError if the key is overridden', async () => {
      const { uiSettings } = setup({
        overrides: {
          foo: 'bar',
        },
      });

      try {
        await uiSettings.setMany({
          bar: 'box',
          foo: 'baz',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(CannotOverrideError);
        expect(error.message).toBe('Unable to update "foo" because it is overridden');
      }
    });

    it('validates value if a schema presents', async () => {
      const defaults = { foo: { schema: schema.string() } };
      const { uiSettings, savedObjectsClient } = setup({ defaults });

      await expect(
        uiSettings.setMany({
          bar: 2,
          foo: 1,
        })
      ).rejects.toMatchInlineSnapshot(
        `[Error: [validation [foo]]: expected value of type [string] but got [number]]`
      );

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(0);
    });
  });

  describe('#set()', () => {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      expect(uiSettings.set('a', 'b')).toBeInstanceOf(Promise);
    });

    it('updates single values by (key, value)', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.set('one', 'value');

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        TYPE,
        ID,
        {
          one: 'value',
        },
        { refresh: false }
      );
    });

    it('validates value if a schema presents', async () => {
      const defaults = { foo: { schema: schema.string() } };
      const { uiSettings, savedObjectsClient } = setup({ defaults });

      await expect(uiSettings.set('foo', 1)).rejects.toMatchInlineSnapshot(
        `[Error: [validation [foo]]: expected value of type [string] but got [number]]`
      );

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(0);
    });

    it('throws CannotOverrideError if the key is overridden', async () => {
      const { uiSettings } = setup({
        overrides: {
          foo: 'bar',
        },
      });

      try {
        await uiSettings.set('foo', 'baz');
      } catch (error) {
        expect(error).toBeInstanceOf(CannotOverrideError);
        expect(error.message).toBe('Unable to update "foo" because it is overridden');
      }
    });
  });

  describe('#remove()', () => {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      expect(uiSettings.remove('one')).toBeInstanceOf(Promise);
    });

    it('removes single values by key', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.remove('one');

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        TYPE,
        ID,
        { one: null },
        { refresh: false }
      );
    });

    it('does not fail validation', async () => {
      const defaults = {
        foo: {
          schema: schema.string(),
          value: '1',
        },
      };
      const { uiSettings, savedObjectsClient } = setup({ defaults });

      await uiSettings.remove('foo');

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
    });

    it('throws CannotOverrideError if the key is overridden', async () => {
      const { uiSettings } = setup({
        overrides: {
          foo: 'bar',
        },
      });

      try {
        await uiSettings.remove('foo');
      } catch (error) {
        expect(error).toBeInstanceOf(CannotOverrideError);
        expect(error.message).toBe('Unable to update "foo" because it is overridden');
      }
    });
  });

  describe('#removeMany()', () => {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      expect(uiSettings.removeMany(['one'])).toBeInstanceOf(Promise);
    });

    it('removes a single value', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.removeMany(['one']);

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        TYPE,
        ID,
        { one: null },
        { refresh: false }
      );
    });

    it('updates several values in one operation', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.removeMany(['one', 'two', 'three']);

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        TYPE,
        ID,
        {
          one: null,
          two: null,
          three: null,
        },
        { refresh: false }
      );
    });

    it('does not fail validation', async () => {
      const defaults = {
        foo: {
          schema: schema.string(),
          value: '1',
        },
      };
      const { uiSettings, savedObjectsClient } = setup({ defaults });

      await uiSettings.removeMany(['foo', 'bar']);

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
    });

    it('throws CannotOverrideError if any key is overridden', async () => {
      const { uiSettings } = setup({
        overrides: {
          foo: 'bar',
        },
      });

      try {
        await uiSettings.setMany({ baz: 'baz', foo: 'foo' });
      } catch (error) {
        expect(error).toBeInstanceOf(CannotOverrideError);
        expect(error.message).toBe('Unable to update "foo" because it is overridden');
      }
    });
  });

  describe('#getRegistered()', () => {
    it('returns the registered settings passed to the constructor', () => {
      const value = chance.word();
      const defaults = { key: { value } };
      const { uiSettings } = setup({ defaults });
      expect(uiSettings.getRegistered()).toEqual(defaults);
    });
    it('does not leak validation schema outside', () => {
      const value = chance.word();
      const defaults = { key: { value, schema: schema.string() } };
      const { uiSettings } = setup({ defaults });
      expect(uiSettings.getRegistered()).toStrictEqual({ key: { value } });
    });
  });

  describe('#getUserProvided()', () => {
    it('pulls user configuration from ES', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.getUserProvided();

      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.get).toHaveBeenCalledWith(TYPE, ID);
    });

    it('returns user configuration', async () => {
      const esDocSource = { user: 'customized' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.getUserProvided();

      expect(result).toStrictEqual({
        user: {
          userValue: 'customized',
        },
      });
    });

    it('ignores null user configuration (because default values)', async () => {
      const esDocSource = { user: 'customized', usingDefault: null, something: 'else' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.getUserProvided();

      expect(result).toStrictEqual({
        user: {
          userValue: 'customized',
        },
        something: {
          userValue: 'else',
        },
      });
    });

    it('ignores user-configured value if it fails validation', async () => {
      const esDocSource = { user: 'foo', id: 'bar' };
      const defaults = {
        id: {
          value: 42,
          schema: schema.number(),
        },
      };
      const { uiSettings } = setup({ esDocSource, defaults });
      const result = await uiSettings.getUserProvided();

      expect(result).toStrictEqual({
        user: {
          userValue: 'foo',
        },
      });

      expect(loggingSystemMock.collect(logger).warn).toMatchInlineSnapshot(`
        Array [
          Array [
            "Ignore invalid UiSettings value. Error: [validation [id]]: expected value of type [number] but got [string].",
          ],
        ]
      `);
    });

    it('automatically creates the savedConfig if it is missing and returns empty object', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      savedObjectsClient.get = jest
        .fn()
        .mockRejectedValueOnce(SavedObjectsClient.errors.createGenericNotFoundError())
        .mockResolvedValueOnce({ attributes: {} });

      expect(await uiSettings.getUserProvided()).toStrictEqual({});

      expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);

      expect(mockCreateOrUpgradeSavedConfig).toHaveBeenCalledTimes(1);
      expect(mockCreateOrUpgradeSavedConfig).toHaveBeenCalledWith(
        expect.objectContaining({ handleWriteErrors: true })
      );
    });

    it('returns result of savedConfig creation in case of notFound error', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      mockCreateOrUpgradeSavedConfig.mockResolvedValue({ foo: 'bar ' });
      savedObjectsClient.get.mockRejectedValue(
        SavedObjectsClient.errors.createGenericNotFoundError()
      );

      expect(await uiSettings.getUserProvided()).toStrictEqual({ foo: { userValue: 'bar ' } });
    });

    it('returns an empty object on Forbidden responses', async () => {
      const { uiSettings, savedObjectsClient } = setup();

      const error = SavedObjectsClient.errors.decorateForbiddenError(new Error());
      savedObjectsClient.get.mockRejectedValue(error);

      expect(await uiSettings.getUserProvided()).toStrictEqual({});
      expect(mockCreateOrUpgradeSavedConfig).toHaveBeenCalledTimes(0);
    });

    it('returns an empty object on EsUnavailable responses', async () => {
      const { uiSettings, savedObjectsClient } = setup();

      const error = SavedObjectsClient.errors.decorateEsUnavailableError(new Error());
      savedObjectsClient.get.mockRejectedValue(error);

      expect(await uiSettings.getUserProvided()).toStrictEqual({});
      expect(mockCreateOrUpgradeSavedConfig).toHaveBeenCalledTimes(0);
    });

    it('throws Unauthorized errors', async () => {
      const { uiSettings, savedObjectsClient } = setup();

      const error = SavedObjectsClient.errors.decorateNotAuthorizedError(new Error());
      savedObjectsClient.get.mockRejectedValue(error);

      try {
        await uiSettings.getUserProvided();
        throw new Error('expect getUserProvided() to throw');
      } catch (err) {
        expect(err).toBe(error);
      }
    });

    it('throw when SavedObjectsClient throws in some unexpected way', async () => {
      const { uiSettings, savedObjectsClient } = setup();

      const error = new Error('unexpected');
      savedObjectsClient.get.mockRejectedValue(error);

      try {
        await uiSettings.getUserProvided();
        throw new Error('expect getUserProvided() to throw');
      } catch (err) {
        expect(err).toBe(error);
      }
    });

    it('includes overridden values for overridden keys', async () => {
      const esDocSource = {
        user: 'customized',
      };

      const overrides = {
        foo: 'bar',
        baz: null,
      };

      const { uiSettings } = setup({ esDocSource, overrides });
      expect(await uiSettings.getUserProvided()).toStrictEqual({
        user: {
          userValue: 'customized',
        },
        foo: {
          userValue: 'bar',
          isOverridden: true,
        },
        baz: { isOverridden: true },
      });
    });
  });

  describe('#getAll()', () => {
    it('pulls user configuration from ES', async () => {
      const esDocSource = {};
      const { uiSettings, savedObjectsClient } = setup({ esDocSource });
      await uiSettings.getAll();
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.get).toHaveBeenCalledWith(TYPE, ID);
    });

    it('returns defaults when es doc is empty', async () => {
      const esDocSource = {};
      const defaults = { foo: { value: 'bar' } };
      const { uiSettings } = setup({ esDocSource, defaults });
      expect(await uiSettings.getAll()).toStrictEqual({
        foo: 'bar',
      });
    });

    it('ignores user-configured value if it fails validation', async () => {
      const esDocSource = { user: 'foo', id: 'bar' };
      const defaults = {
        id: {
          value: 42,
          schema: schema.number(),
        },
      };
      const { uiSettings } = setup({ esDocSource, defaults });
      const result = await uiSettings.getAll();

      expect(result).toStrictEqual({
        id: 42,
        user: 'foo',
      });

      expect(loggingSystemMock.collect(logger).warn).toMatchInlineSnapshot(`
        Array [
          Array [
            "Ignore invalid UiSettings value. Error: [validation [id]]: expected value of type [number] but got [string].",
          ],
        ]
      `);
    });

    it(`merges user values, including ones without defaults, into key value pairs`, async () => {
      const esDocSource = {
        foo: 'user-override',
        bar: 'user-provided',
      };

      const defaults = {
        foo: {
          value: 'default',
        },
      };

      const { uiSettings } = setup({ esDocSource, defaults });

      expect(await uiSettings.getAll()).toStrictEqual({
        foo: 'user-override',
        bar: 'user-provided',
      });
    });

    it('includes the values for overridden keys', async () => {
      const esDocSource = {
        foo: 'user-override',
        bar: 'user-provided',
      };

      const defaults = {
        foo: {
          value: 'default',
        },
      };

      const overrides = {
        foo: 'bax',
      };

      const { uiSettings } = setup({ esDocSource, defaults, overrides });

      expect(await uiSettings.getAll()).toStrictEqual({
        foo: 'bax',
        bar: 'user-provided',
      });
    });

    it('throws if mutates the result of getAll()', async () => {
      const { uiSettings } = setup({ esDocSource: {} });
      const result = await uiSettings.getAll();

      expect(() => {
        result.foo = 'bar';
      }).toThrow();
    });
  });

  describe('#get()', () => {
    it('pulls user configuration from ES', async () => {
      const esDocSource = {};
      const { uiSettings, savedObjectsClient } = setup({ esDocSource });
      await uiSettings.get('any');

      expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.get).toHaveBeenCalledWith(TYPE, ID);
    });

    it(`returns the promised value for a key`, async () => {
      const esDocSource = {};
      const defaults = { dateFormat: { value: chance.word() } };
      const { uiSettings } = setup({ esDocSource, defaults });
      const result = await uiSettings.get('dateFormat');

      expect(result).toBe(defaults.dateFormat.value);
    });

    it(`returns the user-configured value for a custom key`, async () => {
      const esDocSource = { custom: 'value' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.get('custom');

      expect(result).toBe('value');
    });

    it(`returns the user-configured value for a modified key`, async () => {
      const esDocSource = { dateFormat: 'YYYY-MM-DD' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.get('dateFormat');
      expect(result).toBe('YYYY-MM-DD');
    });

    it('returns the overridden value for an overriden key', async () => {
      const esDocSource = { dateFormat: 'YYYY-MM-DD' };
      const overrides = { dateFormat: 'foo' };
      const { uiSettings } = setup({ esDocSource, overrides });

      expect(await uiSettings.get('dateFormat')).toBe('foo');
    });

    it('returns the default value for an override with value null', async () => {
      const esDocSource = { dateFormat: 'YYYY-MM-DD' };
      const overrides = { dateFormat: null };
      const defaults = { dateFormat: { value: 'foo' } };
      const { uiSettings } = setup({ esDocSource, overrides, defaults });

      expect(await uiSettings.get('dateFormat')).toBe('foo');
    });

    it('returns the overridden value if the document does not exist', async () => {
      const overrides = { dateFormat: 'foo' };
      const { uiSettings, savedObjectsClient } = setup({ overrides });
      savedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsClient.errors.createGenericNotFoundError()
      );

      expect(await uiSettings.get('dateFormat')).toBe('foo');
    });

    it('returns the default value if user-configured value fails validation', async () => {
      const esDocSource = { id: 'bar' };
      const defaults = {
        id: {
          value: 42,
          schema: schema.number(),
        },
      };

      const { uiSettings } = setup({ esDocSource, defaults });

      expect(await uiSettings.get('id')).toBe(42);

      expect(loggingSystemMock.collect(logger).warn).toMatchInlineSnapshot(`
        Array [
          Array [
            "Ignore invalid UiSettings value. Error: [validation [id]]: expected value of type [number] but got [string].",
          ],
        ]
      `);
    });

    it('returns the fallback value if getValue() throws an error', async () => {
      const defaults = {
        dynamicSetting: {
          value: 'fallback-value',
          getValue: jest.fn().mockRejectedValue(new Error('getValue failed')),
        },
      };

      const { uiSettings } = setup({ defaults });
      const result = await uiSettings.get('dynamicSetting');

      expect(result).toBe('fallback-value');
      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            "[UiSettingsClient] Failed to get value for key \\"dynamicSetting\\": Error: getValue failed",
          ],
        ]
      `);
    });
  });

  describe('#isSensitive()', () => {
    it('returns false if sensitive config is not set', () => {
      const defaults = {
        foo: {
          schema: schema.string(),
          value: '1',
        },
      };

      const { uiSettings } = setup({ defaults });
      expect(uiSettings.isSensitive('foo')).toBe(false);
    });

    it('returns false if key is not in the settings', () => {
      const { uiSettings } = setup();
      expect(uiSettings.isSensitive('baz')).toBe(false);
    });

    it('returns true if overrides defined and key is overridden', () => {
      const defaults = {
        foo: {
          schema: schema.string(),
          sensitive: true,
          value: '1',
        },
      };

      const { uiSettings } = setup({ defaults });
      expect(uiSettings.isSensitive('foo')).toBe(true);
    });
  });

  describe('#isOverridden()', () => {
    it('returns false if no overrides defined', () => {
      const { uiSettings } = setup();
      expect(uiSettings.isOverridden('foo')).toBe(false);
    });

    it('returns false if overrides defined but key is not included', () => {
      const { uiSettings } = setup({ overrides: { foo: true, bar: true } });
      expect(uiSettings.isOverridden('baz')).toBe(false);
    });

    it('returns false for object prototype properties', () => {
      const { uiSettings } = setup({ overrides: { foo: true, bar: true } });
      expect(uiSettings.isOverridden('hasOwnProperty')).toBe(false);
    });

    it('returns true if overrides defined and key is overridden', () => {
      const { uiSettings } = setup({ overrides: { foo: true, bar: true } });
      expect(uiSettings.isOverridden('bar')).toBe(true);
    });
  });

  describe('#validate()', () => {
    it('returns a correct validation response for an existing setting key and an invalid value', async () => {
      const defaults = { foo: { schema: schema.number() } };
      const { uiSettings } = setup({ defaults });

      expect(await uiSettings.validate('foo', 'testValue')).toMatchObject({
        valid: false,
        errorMessage: 'expected value of type [number] but got [string]',
      });
    });

    it('returns a correct validation response for an existing setting key and a valid value', async () => {
      const defaults = { foo: { schema: schema.number() } };
      const { uiSettings } = setup({ defaults });

      expect(await uiSettings.validate('foo', 5)).toMatchObject({ valid: true });
    });

    it('throws for a non-existing setting key', async () => {
      const { uiSettings } = setup();

      try {
        await uiSettings.validate('bar', 5);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationSettingNotFoundError);
        expect(error.message).toBe('Setting with a key [bar] does not exist.');
      }
    });

    it('throws for a null value', async () => {
      const defaults = { foo: { schema: schema.number() } };
      const { uiSettings } = setup({ defaults });

      try {
        await uiSettings.validate('foo', null);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationBadValueError);
        expect(error.message).toBe('No value was specified.');
      }
    });
  });

  describe('caching', () => {
    describe('write operations invalidate user config cache', () => {
      it('set', async () => {
        const esDocSource = {};
        const { uiSettings, savedObjectsClient } = setup({ esDocSource });

        await uiSettings.get('any');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.set('foo', 'bar');
        await uiSettings.get('foo');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });

      it('setMany', async () => {
        const esDocSource = {};
        const { uiSettings, savedObjectsClient } = setup({ esDocSource });

        await uiSettings.get('any');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.setMany({ foo: 'bar' });
        await uiSettings.get('foo');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });

      it('remove', async () => {
        const esDocSource = {};
        const { uiSettings, savedObjectsClient } = setup({ esDocSource });

        await uiSettings.get('any');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.remove('foo');
        await uiSettings.get('foo');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });

      it('removeMany', async () => {
        const esDocSource = {};
        const { uiSettings, savedObjectsClient } = setup({ esDocSource });

        await uiSettings.get('any');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.removeMany(['foo', 'bar']);
        await uiSettings.get('foo');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('shared getUserProvided() cache', () => {
    function setupWithSharedCache(
      options: SetupOptions & { sharedCache?: NamespacedCache<Record<string, any>> } = {}
    ) {
      const {
        defaults = {},
        overrides = {},
        esDocSource = {},
        namespace = 'default',
        sharedCache,
      } = options;
      const sharedUserProvidedCache = sharedCache || new NamespacedCache<Record<string, any>>();

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.get.mockReturnValue({ attributes: esDocSource } as any);
      savedObjectsClient.update.mockResolvedValue({} as any);

      const uiSettings = new UiSettingsClient({
        type: TYPE,
        id: ID,
        buildNum: BUILD_NUM,
        defaults,
        savedObjectsClient,
        overrides,
        log: logger,
        namespace,
        sharedUserProvidedCache,
      });

      return {
        uiSettings,
        savedObjectsClient,
        sharedUserProvidedCache,
      };
    }

    afterEach(() => {
      jest.clearAllMocks();
      jest.useRealTimers();
    });

    describe('cross-request caching', () => {
      it('caches getUserProvided() results across multiple client instances', async () => {
        const sharedCache = new NamespacedCache<Record<string, any>>();

        const { uiSettings: client1, savedObjectsClient: soClient1 } = setupWithSharedCache({
          namespace: 'default',
          sharedCache,
          esDocSource: { foo: 'bar' },
        });

        const { uiSettings: client2, savedObjectsClient: soClient2 } = setupWithSharedCache({
          namespace: 'default',
          sharedCache,
          esDocSource: { foo: 'bar' },
        });

        await client1.getUserProvided();
        expect(soClient1.get).toHaveBeenCalledTimes(1);

        await client2.getUserProvided();
        expect(soClient2.get).toHaveBeenCalledTimes(0);
      });

      it('shares cache within same namespace', async () => {
        const sharedCache = new NamespacedCache<Record<string, any>>();

        const { uiSettings: client1, savedObjectsClient: soClient1 } = setupWithSharedCache({
          namespace: 'space-a',
          sharedCache,
          esDocSource: { setting1: 'value1' },
        });

        const { uiSettings: client2, savedObjectsClient: soClient2 } = setupWithSharedCache({
          namespace: 'space-a',
          sharedCache,
          esDocSource: { setting1: 'value1' },
        });

        await client1.getUserProvided();
        expect(soClient1.get).toHaveBeenCalledTimes(1);

        await client2.getUserProvided();
        expect(soClient2.get).toHaveBeenCalledTimes(0);
      });
    });

    describe('in-flight request deduplication', () => {
      it('deduplicates concurrent getUserProvided() calls', async () => {
        const sharedCache = new NamespacedCache<Record<string, any>>();
        const savedObjectsClient = savedObjectsClientMock.create();

        let resolvePromise: (value: any) => void;
        const delayedPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        savedObjectsClient.get.mockReturnValue(delayedPromise as any);

        const uiSettings = new UiSettingsClient({
          type: TYPE,
          id: ID,
          buildNum: BUILD_NUM,
          defaults: {},
          savedObjectsClient,
          overrides: {},
          log: logger,
          namespace: 'default',
          sharedUserProvidedCache: sharedCache,
        });

        const call1 = uiSettings.getUserProvided();
        const call2 = uiSettings.getUserProvided();
        const call3 = uiSettings.getUserProvided();

        resolvePromise!({ attributes: { foo: 'bar' } });

        const [result1, result2, result3] = await Promise.all([call1, call2, call3]);

        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
        expect(result1).toEqual(result2);
        expect(result2).toEqual(result3);
      });
    });

    describe('cache invalidation', () => {
      it('invalidates shared cache on set()', async () => {
        const { uiSettings, savedObjectsClient } = setupWithSharedCache({
          esDocSource: { foo: 'original' },
        });

        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.set('foo', 'updated');

        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });

      it('invalidates shared cache on setMany()', async () => {
        const { uiSettings, savedObjectsClient } = setupWithSharedCache({
          esDocSource: { foo: 'original', bar: 'original' },
        });

        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.setMany({ foo: 'updated', bar: 'updated' });

        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });

      it('invalidates shared cache on remove()', async () => {
        const { uiSettings, savedObjectsClient } = setupWithSharedCache({
          esDocSource: { foo: 'value' },
        });

        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.remove('foo');

        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });

      it('invalidates shared cache on removeMany()', async () => {
        const { uiSettings, savedObjectsClient } = setupWithSharedCache({
          esDocSource: { foo: 'value', bar: 'value' },
        });

        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.removeMany(['foo', 'bar']);

        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });
    });

    describe('namespace isolation', () => {
      it('isolates cache by namespace', async () => {
        const sharedCache = new NamespacedCache<Record<string, any>>();

        const { uiSettings: clientA, savedObjectsClient: soClientA } = setupWithSharedCache({
          namespace: 'space-a',
          sharedCache,
          esDocSource: { setting: 'value-a' },
        });

        const { uiSettings: clientB, savedObjectsClient: soClientB } = setupWithSharedCache({
          namespace: 'space-b',
          sharedCache,
          esDocSource: { setting: 'value-b' },
        });

        await clientA.getUserProvided();
        expect(soClientA.get).toHaveBeenCalledTimes(1);

        await clientB.getUserProvided();
        expect(soClientB.get).toHaveBeenCalledTimes(1);
      });
    });

    describe('TTL expiry', () => {
      it('expires shared cache after TTL', async () => {
        jest.useFakeTimers();

        const { uiSettings, savedObjectsClient } = setupWithSharedCache({
          esDocSource: { foo: 'bar' },
        });

        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(NAMESPACED_CACHE_TTL - 2_000);

        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(2_000);

        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });
    });

    describe('graceful degradation', () => {
      it('works without shared cache', async () => {
        const savedObjectsClient = savedObjectsClientMock.create();
        savedObjectsClient.get.mockReturnValue({ attributes: { foo: 'bar' } } as any);

        const uiSettings = new UiSettingsClient({
          type: TYPE,
          id: ID,
          buildNum: BUILD_NUM,
          defaults: {},
          savedObjectsClient,
          overrides: {},
          log: logger,
          namespace: 'default',
        });

        await uiSettings.getUserProvided();
        await uiSettings.getUserProvided();

        // Without shared cache, each call fetches from ES (no caching)
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });

      it('each client instance fetches independently without shared cache', async () => {
        const soClient1 = savedObjectsClientMock.create();
        soClient1.get.mockReturnValue({ attributes: { foo: 'bar' } } as any);

        const soClient2 = savedObjectsClientMock.create();
        soClient2.get.mockReturnValue({ attributes: { foo: 'bar' } } as any);

        const client1 = new UiSettingsClient({
          type: TYPE,
          id: ID,
          buildNum: BUILD_NUM,
          defaults: {},
          savedObjectsClient: soClient1,
          overrides: {},
          log: logger,
          namespace: 'default',
        });

        const client2 = new UiSettingsClient({
          type: TYPE,
          id: ID,
          buildNum: BUILD_NUM,
          defaults: {},
          savedObjectsClient: soClient2,
          overrides: {},
          log: logger,
          namespace: 'default',
        });

        await client1.getUserProvided();
        await client2.getUserProvided();

        expect(soClient1.get).toHaveBeenCalledTimes(1);
        expect(soClient2.get).toHaveBeenCalledTimes(1);
      });
    });

    describe('in-flight cleanup', () => {
      it('invalidates cache after setMany completes', async () => {
        const savedObjectsClient = savedObjectsClientMock.create();
        const sharedCache = new NamespacedCache<Record<string, any>>();

        savedObjectsClient.get.mockResolvedValueOnce({
          attributes: { foo: 'before-write' },
        } as any);
        savedObjectsClient.get.mockResolvedValueOnce({ attributes: { foo: 'after-write' } } as any);
        savedObjectsClient.update.mockResolvedValue({} as any);

        const uiSettings = new UiSettingsClient({
          type: TYPE,
          id: ID,
          buildNum: BUILD_NUM,
          defaults: {},
          savedObjectsClient,
          overrides: {},
          log: logger,
          namespace: 'default',
          sharedUserProvidedCache: sharedCache,
        });

        // First call caches data
        const firstResult = await uiSettings.getUserProvided();
        expect(firstResult.foo).toEqual({ userValue: 'before-write' });

        // setMany should invalidate cache
        await uiSettings.setMany({ foo: 'new-value' });

        // Next getUserProvided should fetch fresh data (not cached)
        const result = await uiSettings.getUserProvided();

        expect(result.foo).toEqual({ userValue: 'after-write' });
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });

      it('does not allow old promise cleanup to delete new promise', async () => {
        const sharedCache = new NamespacedCache<Record<string, any>>();

        let resolveOld: (value: any) => void;
        let resolveNew: (value: any) => void;

        const oldPromise = new Promise<Record<string, any>>((resolve) => {
          resolveOld = resolve;
        });

        const newPromise = new Promise<Record<string, any>>((resolve) => {
          resolveNew = resolve;
        });

        sharedCache.setInflightRead('test-namespace', oldPromise);
        expect(sharedCache.getInflightRead('test-namespace')).toBe(oldPromise);

        sharedCache.del('test-namespace');
        expect(sharedCache.getInflightRead('test-namespace')).toBeNull();

        sharedCache.setInflightRead('test-namespace', newPromise);
        expect(sharedCache.getInflightRead('test-namespace')).toBe(newPromise);

        resolveOld!('old-value');
        await oldPromise;

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(sharedCache.getInflightRead('test-namespace')).toBe(newPromise);

        resolveNew!('new-value');
        await newPromise;

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(sharedCache.getInflightRead('test-namespace')).toBeNull();
      });
    });

    describe('cache bypass', () => {
      it('bypasses shared cache when bypassCache=true', async () => {
        const { uiSettings, savedObjectsClient } = setupWithSharedCache({
          esDocSource: { foo: 'bar' },
        });

        // First call populates cache
        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        // Second call with bypass=true should fetch fresh data
        await uiSettings.getUserProvided(true);
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);

        // Third call with bypass=true should also fetch fresh data
        await uiSettings.getUserProvided(true);
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(3);
      });

      it('still updates cache even when bypassing', async () => {
        const sharedCache = new NamespacedCache<Record<string, any>>();

        const { uiSettings: clientA, savedObjectsClient: soClientA } = setupWithSharedCache({
          namespace: 'default',
          sharedCache,
          esDocSource: { foo: 'bar' },
        });

        const { uiSettings: clientB, savedObjectsClient: soClientB } = setupWithSharedCache({
          namespace: 'default',
          sharedCache,
          esDocSource: { foo: 'baz' },
        });

        // First client bypasses cache but still updates it
        await clientA.getUserProvided(true);
        expect(soClientA.get).toHaveBeenCalledTimes(1);

        // Second client benefits from updated cache
        await clientB.getUserProvided();
        expect(soClientB.get).toHaveBeenCalledTimes(0);
      });

      it('does not register in-flight promise when bypassing cache', async () => {
        const { uiSettings, sharedUserProvidedCache } = setupWithSharedCache({
          esDocSource: { foo: 'bar' },
        });

        // Start bypass operation but don't await
        const bypassPromise = uiSettings.getUserProvided(true);

        // In-flight read should be null during bypass
        expect(sharedUserProvidedCache.getInflightRead('default')).toBeNull();

        await bypassPromise;

        // Still null after bypass completes
        expect(sharedUserProvidedCache.getInflightRead('default')).toBeNull();
      });

      it('concurrent normal requests use cache while bypass is in progress', async () => {
        const sharedCache = new NamespacedCache<Record<string, any>>();

        const { uiSettings, sharedUserProvidedCache } = setupWithSharedCache({
          namespace: 'default',
          sharedCache,
          esDocSource: { foo: 'bar' },
        });

        // Manually set cache with initial value
        sharedUserProvidedCache.set('default', { initial: { userValue: 'cached-value' } });

        // Concurrent normal request should use existing cache (not wait for bypass)
        const normalResult = await uiSettings.getUserProvided();
        expect(normalResult.initial).toEqual({ userValue: 'cached-value' });

        // Bypass operation should fetch fresh data and update cache
        const bypassResult = await uiSettings.getUserProvided(true);
        expect(bypassResult.foo).toEqual({ userValue: 'bar' });
        expect(bypassResult.initial).toBeUndefined();
      });

      it('bypasses cache even if cached value exists', async () => {
        const { uiSettings, savedObjectsClient, sharedUserProvidedCache } = setupWithSharedCache({
          esDocSource: { foo: 'bar' },
        });

        // Manually populate cache
        sharedUserProvidedCache.set('default', { cached: { userValue: 'old-value' } });

        // Bypass should ignore cache and fetch fresh data
        const result = await uiSettings.getUserProvided(true);
        expect(result.foo).toEqual({ userValue: 'bar' });
        expect(result.cached).toBeUndefined();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
      });

      it('applies overrides correctly when bypassing cache', async () => {
        const { uiSettings, savedObjectsClient } = setupWithSharedCache({
          esDocSource: { foo: 'bar', overridden: 'original' },
          overrides: { overridden: 'override-value' },
        });

        const result = await uiSettings.getUserProvided(true);

        expect(result.foo).toEqual({ userValue: 'bar' });
        expect(result.overridden).toEqual({ isOverridden: true, userValue: 'override-value' });
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
      });
    });
  });
});
