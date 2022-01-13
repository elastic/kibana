/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import { getApplyMigrationWithinObject, MigrateFunction } from '.';

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
