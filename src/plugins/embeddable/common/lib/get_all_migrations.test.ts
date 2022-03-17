/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAllMigrations } from './get_all_migrations';

describe('embeddable getAllMigratons', () => {
  const factories = [
    { migrations: { '7.11.0': (state: unknown) => state } },
    { migrations: () => ({ '7.13.0': (state: unknown) => state }) },
  ];
  const enhacements = [
    { migrations: { '7.12.0': (state: unknown) => state } },
    { migrations: () => ({ '7.14.0': (state: unknown) => state }) },
  ];
  const migrateFn = jest.fn();

  test('returns base migrations', () => {
    expect(getAllMigrations([], [], migrateFn)).toEqual({});
  });

  test('returns embeddable factory migrations', () => {
    expect(getAllMigrations(factories, [], migrateFn)).toHaveProperty(['7.11.0']);
    expect(getAllMigrations(factories, [], migrateFn)).toHaveProperty(['7.13.0']);
  });

  test('returns enhancement migrations', () => {
    const migrations = getAllMigrations([], enhacements, migrateFn);
    expect(migrations).toHaveProperty(['7.12.0']);
    expect(migrations).toHaveProperty(['7.14.0']);
  });

  test('returns all migrations', () => {
    const migrations = getAllMigrations(factories, enhacements, migrateFn);
    expect(migrations).toHaveProperty(['7.11.0']);
    expect(migrations).toHaveProperty(['7.12.0']);
    expect(migrations).toHaveProperty(['7.13.0']);
    expect(migrations).toHaveProperty(['7.14.0']);
  });
});
