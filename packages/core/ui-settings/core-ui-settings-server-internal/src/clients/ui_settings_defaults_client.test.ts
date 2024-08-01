/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Chance from 'chance';
import { schema } from '@kbn/config-schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { UiSettingsDefaultsClient } from './ui_settings_defaults_client';

const logger = loggingSystemMock.create().get();

const chance = new Chance();

describe('ui settings defaults', () => {
  afterEach(() => jest.clearAllMocks());

  describe('#getUserProvided()', () => {
    it('only returns overridden values', async () => {
      const defaults = { foo: { schema: schema.string(), value: 'default foo' } };
      const overrides = { bar: 'overridden bar', baz: null };

      const uiSettings = new UiSettingsDefaultsClient({ defaults, overrides, log: logger });
      await expect(uiSettings.getUserProvided()).resolves.toStrictEqual({
        bar: { userValue: 'overridden bar', isOverridden: true },
        baz: { isOverridden: true },
      });
    });
  });

  describe('#getAll()', () => {
    it('returns defaults and overridden values', async () => {
      const defaults = {
        foo: { schema: schema.string(), value: 'default foo' },
        bar: { schema: schema.string() },
        baz: { schema: schema.string(), value: 'default baz' },
      };
      const overrides = { foo: 'overridden foo', zab: 'overridden zab', baz: null };

      const uiSettings = new UiSettingsDefaultsClient({ defaults, overrides, log: logger });

      await expect(uiSettings.getAll()).resolves.toStrictEqual({
        foo: 'overridden foo',
        bar: undefined,
        baz: 'default baz',
        zab: 'overridden zab',
      });
    });

    it('throws if mutates the result of getAll()', async () => {
      const defaults = {
        foo: { schema: schema.string(), value: 'default foo' },
      };
      const uiSettings = new UiSettingsDefaultsClient({ defaults, log: logger });
      const result = await uiSettings.getAll();

      expect(() => {
        result.foo = 'bar';
      }).toThrow();
    });

    it('returns default values from async getValue() handler', async () => {
      const defaults = {
        foo: {
          schema: schema.string(),
          getValue: async () => {
            // simulate async operation
            await new Promise((resolve) => setTimeout(resolve, 200));
            return 'default foo';
          },
        },
        baz: { schema: schema.string(), value: 'default baz' },
      };

      const uiSettings = new UiSettingsDefaultsClient({ defaults, log: logger });

      await expect(uiSettings.getAll()).resolves.toStrictEqual({
        foo: 'default foo',
        baz: 'default baz',
      });
    });

    it('pass down the context object to the getValue() handler', async () => {
      const getValue = jest.fn().mockResolvedValue('default foo');
      const defaults = {
        foo: {
          schema: schema.string(),
          getValue,
        },
      };

      const uiSettings = new UiSettingsDefaultsClient({ defaults, log: logger });

      const context = { foo: 'bar' };
      await uiSettings.getAll(context as any);
      expect(getValue).toHaveBeenCalledWith(context);
    });
  });

  describe('#get()', () => {
    it('returns the overridden value for an overridden key', async () => {
      const defaults = {
        foo: { schema: schema.string(), value: 'default foo' },
      };
      const overrides = { foo: 'overridden foo' };
      const uiSettings = new UiSettingsDefaultsClient({ defaults, overrides, log: logger });

      await expect(uiSettings.get('foo')).resolves.toBe('overridden foo');
    });

    it('returns the default value for an override with value null', async () => {
      const defaults = {
        foo: { schema: schema.string(), value: 'default foo' },
      };
      const overrides = { foo: null };
      const uiSettings = new UiSettingsDefaultsClient({ defaults, overrides, log: logger });

      await expect(uiSettings.get('foo')).resolves.toBe('default foo');
    });

    it('returns the default value if there is no override', async () => {
      const defaults = {
        foo: { schema: schema.string(), value: 'default foo' },
      };
      const overrides = {};
      const uiSettings = new UiSettingsDefaultsClient({ defaults, overrides, log: logger });

      await expect(uiSettings.get('foo')).resolves.toBe('default foo');
    });

    it('returns default values from async getValue() handler', async () => {
      const defaults = {
        foo: {
          schema: schema.string(),
          getValue: async () => {
            // simulate async operation
            await new Promise((resolve) => setTimeout(resolve, 200));
            return 'default foo';
          },
        },
      };

      const uiSettings = new UiSettingsDefaultsClient({ defaults, log: logger });
      await expect(uiSettings.get('foo')).resolves.toBe('default foo');
    });

    it('pass down the context object to the getValue() handler', async () => {
      const getValue = jest.fn().mockResolvedValue('default foo');
      const defaults = {
        foo: {
          schema: schema.string(),
          getValue,
        },
      };

      const uiSettings = new UiSettingsDefaultsClient({ defaults, log: logger });

      const context = { foo: 'bar' };
      await uiSettings.get('foo', context as any);
      expect(getValue).toHaveBeenCalledWith(context);
    });
  });

  describe('#setMany()', () => {
    it('does not throw', async () => {
      const uiSettings = new UiSettingsDefaultsClient({ log: logger });
      await expect(uiSettings.setMany()).resolves.not.toThrow();
    });
  });

  describe('#set()', () => {
    it('does not throw', async () => {
      const uiSettings = new UiSettingsDefaultsClient({ log: logger });
      await expect(uiSettings.set()).resolves.not.toThrow();
    });
  });

  describe('#remove()', () => {
    it('does not throw', async () => {
      const uiSettings = new UiSettingsDefaultsClient({ log: logger });
      await expect(uiSettings.remove()).resolves.not.toThrow();
    });
  });

  describe('#removeMany()', () => {
    it('does not throw', async () => {
      const uiSettings = new UiSettingsDefaultsClient({ log: logger });
      await expect(uiSettings.removeMany()).resolves.not.toThrow();
    });
  });

  describe('#getRegistered()', () => {
    it('returns the registered settings passed to the constructor and does not leak validation schema outside', () => {
      const value = chance.word();
      const defaults = { key: { schema: schema.string(), value } };
      const uiSettings = new UiSettingsDefaultsClient({ defaults, log: logger });
      expect(uiSettings.getRegistered()).toStrictEqual({ key: { value } });
    });
  });

  describe('#isSensitive()', () => {
    it('returns false if sensitive config is not set', () => {
      const defaults = { foo: { schema: schema.string(), value: '1' } };

      const uiSettings = new UiSettingsDefaultsClient({ defaults, log: logger });
      expect(uiSettings.isSensitive('foo')).toBe(false);
    });

    it('returns false if key is not in the settings', () => {
      const uiSettings = new UiSettingsDefaultsClient({ log: logger });
      expect(uiSettings.isSensitive('baz')).toBe(false);
    });

    it('returns true if `sensitive` is set', () => {
      const defaults = { foo: { schema: schema.string(), sensitive: true, value: '1' } };

      const uiSettings = new UiSettingsDefaultsClient({ defaults, log: logger });
      expect(uiSettings.isSensitive('foo')).toBe(true);
    });
  });

  describe('#isOverridden()', () => {
    it('returns false if no overrides defined', () => {
      const uiSettings = new UiSettingsDefaultsClient({ log: logger });
      expect(uiSettings.isOverridden('foo')).toBe(false);
    });

    it('returns false if overrides defined but key is not included', () => {
      const uiSettings = new UiSettingsDefaultsClient({
        overrides: { foo: true, bar: true },
        log: logger,
      });
      expect(uiSettings.isOverridden('baz')).toBe(false);
    });

    it('returns false for object prototype properties', () => {
      const uiSettings = new UiSettingsDefaultsClient({
        overrides: { foo: true, bar: true },
        log: logger,
      });
      expect(uiSettings.isOverridden('hasOwnProperty')).toBe(false);
    });

    it('returns true if overrides defined and key is overridden', () => {
      const uiSettings = new UiSettingsDefaultsClient({
        overrides: { foo: true, bar: true },
        log: logger,
      });
      expect(uiSettings.isOverridden('bar')).toBe(true);
    });
  });
});
