/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import {
  getApplyMigrationWithinObject,
  getIntraObjectMigrationMap,
  MigrateFunction,
  MigrateFunctionsObject,
} from '.';

describe('intra-object migration helpers', () => {
  it('should work together', () => {
    const originalMigrations: MigrateFunctionsObject = {
      1: (state) => ({ ...state, version: '1' }),
      2: (state) => ({ ...state, version: '2' }),
      3: (state) => ({ ...state, version: '3' }),
    };

    const intraObjectMigrations = getIntraObjectMigrationMap(originalMigrations, (migrate) =>
      getApplyMigrationWithinObject(migrate, 'foo.bar')
    );

    const object = {
      foo: { bar: { version: 0 } },
    };

    for (const version of Object.keys(intraObjectMigrations) as Array<
      keyof typeof intraObjectMigrations
    >) {
      expect(intraObjectMigrations[version](object).foo.bar.version).toBe(version);
    }
  });

  describe('getIntraObjectMigrationMap', () => {
    it('should create an object with new migrate functions', () => {
      const originalMigrations: MigrateFunctionsObject = {
        '1': (state) => ({ prop: 'foo' }),
        '2': (state) => ({ prop: 'foo' }),
        '3': (state) => ({ prop: 'foo' }),
      };

      const intraObjectMigrations = getIntraObjectMigrationMap(
        originalMigrations,
        (migrate) => () => ({ prop: 'bar' })
      );

      for (const version of Object.keys(intraObjectMigrations) as Array<
        keyof typeof intraObjectMigrations
      >) {
        expect(intraObjectMigrations[version]({}).prop).toBe('bar');
      }
    });
  });

  describe('getApplyMigrationWithinObject', () => {
    it('applies migration at specified property path', () => {
      const migrate: MigrateFunction<{ baz: string }, { baz: string }> = (state) => ({
        ...state,
        baz: 'beep',
      });

      const object = {
        foo: { bar: { baz: 'boop' } },
      };

      expect(getApplyMigrationWithinObject(migrate, 'foo.bar')(object)).toEqual({
        foo: { bar: { baz: 'beep' } },
      });

      const objectWithArray = {
        foo: { bar: [{ baz: 'boop' }, { baz: 'boop' }] },
      };

      expect(getApplyMigrationWithinObject(migrate, 'foo.bar')(objectWithArray)).toEqual({
        foo: { bar: [{ baz: 'beep' }, { baz: 'beep' }] },
      });
    });

    it('allows for serialization/deserialization', () => {
      const migrate = jest.fn((state) => ({ ...state, baz: 'beep' }));

      const { stringify: serialize, parse: deserialize } = JSON;

      const object = {
        foo: { bar: serialize({ baz: 'boop' }) },
      };

      const migrated = getApplyMigrationWithinObject(migrate, 'foo.bar', {
        serialize,
        deserialize,
      })(object);

      expect(migrate).toHaveBeenCalledWith(deserialize(object.foo.bar));
      expect(migrated).toEqual({
        foo: { bar: serialize({ baz: 'beep' }) },
      });
    });

    it('is robust to a non-existent property address', () => {
      const migrate = jest.fn();
      const object = {
        foo: { bar: { baz: 'boop' } },
      };

      expect(getApplyMigrationWithinObject(migrate, 'this.path.does.not.exist')(object)).toEqual(
        object
      );
    });

    it('leaves argument object alone', () => {
      const migrate = jest.fn();

      const object = {
        foo: { bar: { baz: 'boop' } },
      };

      const clone = cloneDeep(object);

      const result = getApplyMigrationWithinObject(migrate, 'this.path.does.not.exist')(object);

      expect(object).toEqual(clone); // object didn't change
      expect(result).not.toBe(object); // returned a new object
    });
  });
});
