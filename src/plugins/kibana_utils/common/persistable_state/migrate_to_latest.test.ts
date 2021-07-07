/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableState, MigrateFunction } from './types';
import { migrateToLatest } from './migrate_to_latest';

interface StateV1 extends SerializableState {
  name: string;
}

interface StateV2 extends SerializableState {
  firstName: string;
  lastName: string;
}

interface StateV3 extends SerializableState {
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  age: number;
}

const migrationV2: MigrateFunction<StateV1, StateV2> = ({ name }) => {
  return {
    firstName: name,
    lastName: '',
  };
};

const migrationV3: MigrateFunction<StateV2, StateV3> = ({ firstName, lastName }) => {
  return {
    firstName,
    lastName,
    isAdmin: false,
    age: 0,
  };
};

test('returns the same object if there are no migrations to be applied', () => {
  const migrated = migrateToLatest(
    {},
    {
      state: { name: 'Foo' },
      version: '0.0.1',
    }
  );

  expect(migrated).toEqual({
    state: { name: 'Foo' },
    version: '0.0.1',
  });
});

test('applies a single migration', () => {
  const { state: newState, version: newVersion } = migrateToLatest(
    {
      '0.0.2': (migrationV2 as unknown) as MigrateFunction,
    },
    {
      state: { name: 'Foo' },
      version: '0.0.1',
    }
  );

  expect(newState).toEqual({
    firstName: 'Foo',
    lastName: '',
  });
  expect(newVersion).toEqual('0.0.2');
});

test('does not apply migration if it has the same version as state', () => {
  const { state: newState, version: newVersion } = migrateToLatest(
    {
      '0.0.54': (migrationV2 as unknown) as MigrateFunction,
    },
    {
      state: { name: 'Foo' },
      version: '0.0.54',
    }
  );

  expect(newState).toEqual({
    name: 'Foo',
  });
  expect(newVersion).toEqual('0.0.54');
});

test('does not apply migration if it has lower version', () => {
  const { state: newState, version: newVersion } = migrateToLatest(
    {
      '0.2.2': (migrationV2 as unknown) as MigrateFunction,
    },
    {
      state: { name: 'Foo' },
      version: '0.3.1',
    }
  );

  expect(newState).toEqual({
    name: 'Foo',
  });
  expect(newVersion).toEqual('0.3.1');
});

test('applies two migrations consecutively', () => {
  const { state: newState, version: newVersion } = migrateToLatest(
    {
      '7.14.0': (migrationV2 as unknown) as MigrateFunction,
      '7.14.2': (migrationV3 as unknown) as MigrateFunction,
    },
    {
      state: { name: 'Foo' },
      version: '7.13.4',
    }
  );

  expect(newState).toEqual({
    firstName: 'Foo',
    lastName: '',
    isAdmin: false,
    age: 0,
  });
  expect(newVersion).toEqual('7.14.2');
});

test('applies only migrations which are have higher semver version', () => {
  const { state: newState, version: newVersion } = migrateToLatest(
    {
      '7.14.0': (migrationV2 as unknown) as MigrateFunction, // not applied
      '7.14.1': (() => ({})) as MigrateFunction, // not applied
      '7.14.2': (migrationV3 as unknown) as MigrateFunction,
    },
    {
      state: { firstName: 'FooBar', lastName: 'Baz' },
      version: '7.14.1',
    }
  );

  expect(newState).toEqual({
    firstName: 'FooBar',
    lastName: 'Baz',
    isAdmin: false,
    age: 0,
  });
  expect(newVersion).toEqual('7.14.2');
});
