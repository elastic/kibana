/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Chance from 'chance';
import { schema } from '@kbn/config-schema';

import { loggingSystemMock } from '../logging/logging_system.mock';
import { createOrUpgradeSavedConfigMock } from './create_or_upgrade_saved_config/create_or_upgrade_saved_config.test.mock';

import { SavedObjectsClient } from '../saved_objects';
import { savedObjectsClientMock } from '../saved_objects/service/saved_objects_client.mock';
import { UiSettingsClient } from './ui_settings_client';
import { CannotOverrideError } from './ui_settings_errors';

const logger = loggingSystemMock.create().get();

const TYPE = 'config';
const ID = 'kibana-version';
const BUILD_NUM = 1234;
const chance = new Chance();

interface SetupOptions {
  defaults?: Record<string, any>;
  esDocSource?: Record<string, any>;
  overrides?: Record<string, any>;
}

describe('ui settings', () => {
  function setup(options: SetupOptions = {}) {
    const { defaults = {}, overrides = {}, esDocSource = {} } = options;

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
    });

    const createOrUpgradeSavedConfig = createOrUpgradeSavedConfigMock;

    return {
      uiSettings,
      savedObjectsClient,
      createOrUpgradeSavedConfig,
    };
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('#setMany()', () => {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      expect(uiSettings.setMany({ a: 'b' })).toBeInstanceOf(Promise);
    });

    it('updates a single value in one operation', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.setMany({ one: 'value' });

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(TYPE, ID, { one: 'value' });
    });

    it('updates several values in one operation', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.setMany({ one: 'value', another: 'val' });

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(TYPE, ID, {
        one: 'value',
        another: 'val',
      });
    });

    it('automatically creates the savedConfig if it is missing', async () => {
      const { uiSettings, savedObjectsClient, createOrUpgradeSavedConfig } = setup();
      savedObjectsClient.update
        .mockRejectedValueOnce(SavedObjectsClient.errors.createGenericNotFoundError())
        .mockResolvedValueOnce({} as any);

      await uiSettings.setMany({ foo: 'bar' });

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(2);
      expect(createOrUpgradeSavedConfig).toHaveBeenCalledTimes(1);
      expect(createOrUpgradeSavedConfig).toHaveBeenCalledWith(
        expect.objectContaining({ handleWriteErrors: false })
      );
    });

    it('only tried to auto create once and throws NotFound', async () => {
      const { uiSettings, savedObjectsClient, createOrUpgradeSavedConfig } = setup();
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
      expect(createOrUpgradeSavedConfig).toHaveBeenCalledTimes(1);
      expect(createOrUpgradeSavedConfig).toHaveBeenCalledWith(
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
      expect(savedObjectsClient.update).toHaveBeenCalledWith(TYPE, ID, {
        one: 'value',
      });
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
      expect(savedObjectsClient.update).toHaveBeenCalledWith(TYPE, ID, { one: null });
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
      expect(savedObjectsClient.update).toHaveBeenCalledWith(TYPE, ID, { one: null });
    });

    it('updates several values in one operation', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.removeMany(['one', 'two', 'three']);

      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(TYPE, ID, {
        one: null,
        two: null,
        three: null,
      });
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
      const { uiSettings, savedObjectsClient, createOrUpgradeSavedConfig } = setup();
      savedObjectsClient.get = jest
        .fn()
        .mockRejectedValueOnce(SavedObjectsClient.errors.createGenericNotFoundError())
        .mockResolvedValueOnce({ attributes: {} });

      expect(await uiSettings.getUserProvided()).toStrictEqual({});

      expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);

      expect(createOrUpgradeSavedConfig).toHaveBeenCalledTimes(1);
      expect(createOrUpgradeSavedConfig).toHaveBeenCalledWith(
        expect.objectContaining({ handleWriteErrors: true })
      );
    });

    it('returns result of savedConfig creation in case of notFound error', async () => {
      const { uiSettings, savedObjectsClient, createOrUpgradeSavedConfig } = setup();
      createOrUpgradeSavedConfig.mockResolvedValue({ foo: 'bar ' });
      savedObjectsClient.get.mockRejectedValue(
        SavedObjectsClient.errors.createGenericNotFoundError()
      );

      expect(await uiSettings.getUserProvided()).toStrictEqual({ foo: { userValue: 'bar ' } });
    });

    it('returns an empty object on Forbidden responses', async () => {
      const { uiSettings, savedObjectsClient, createOrUpgradeSavedConfig } = setup();

      const error = SavedObjectsClient.errors.decorateForbiddenError(new Error());
      savedObjectsClient.get.mockRejectedValue(error);

      expect(await uiSettings.getUserProvided()).toStrictEqual({});
      expect(createOrUpgradeSavedConfig).toHaveBeenCalledTimes(0);
    });

    it('returns an empty object on EsUnavailable responses', async () => {
      const { uiSettings, savedObjectsClient, createOrUpgradeSavedConfig } = setup();

      const error = SavedObjectsClient.errors.decorateEsUnavailableError(new Error());
      savedObjectsClient.get.mockRejectedValue(error);

      expect(await uiSettings.getUserProvided()).toStrictEqual({});
      expect(createOrUpgradeSavedConfig).toHaveBeenCalledTimes(0);
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

  describe('caching', () => {
    describe('read operations cache user config', () => {
      it('get', async () => {
        const esDocSource = {};
        const { uiSettings, savedObjectsClient } = setup({ esDocSource });

        await uiSettings.get('any');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.get('foo');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(10000);
        await uiSettings.get('foo');
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });

      it('getAll', async () => {
        const esDocSource = {};
        const { uiSettings, savedObjectsClient } = setup({ esDocSource });

        await uiSettings.getAll();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.getAll();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(10000);
        await uiSettings.getAll();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });

      it('getUserProvided', async () => {
        const esDocSource = {};
        const { uiSettings, savedObjectsClient } = setup({ esDocSource });

        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(10000);
        await uiSettings.getUserProvided();
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });
    });

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
});
