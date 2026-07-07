/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAllMigrations } from './get_all_migrations';

describe('embeddable getAllMigratons', () => {
  const factories = [
    { migrations: { '7.11.0': (state: unknown) => state } },
    { migrations: () => ({ '7.13.0': (state: unknown) => state }) },
  ];
  const migrateFn = jest.fn();

  test('returns all migrations', () => {
    const migrations = getAllMigrations(factories, migrateFn);
    expect(migrations).toHaveProperty(['7.11.0']);
    expect(migrations).toHaveProperty(['7.13.0']);
  });
});
