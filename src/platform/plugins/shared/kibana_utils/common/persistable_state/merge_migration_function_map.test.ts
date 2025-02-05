/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mergeMigrationFunctionMaps } from './merge_migration_function_map';

describe('mergeSavedObjectMigrationMaps', () => {
  const obj1 = {
    '7.12.1': (state: number) => state + 1,
    '7.12.2': (state: number) => state + 2,
  };

  const obj2 = {
    '7.12.0': (state: number) => state - 2,
    '7.12.2': (state: number) => state + 2,
  };

  test('correctly merges two saved object migration maps', () => {
    const result = mergeMigrationFunctionMaps(obj1, obj2);
    expect(result['7.12.0'](5)).toEqual(3);
    expect(result['7.12.1'](5)).toEqual(6);
    expect(result['7.12.2'](5)).toEqual(9);
  });
});
