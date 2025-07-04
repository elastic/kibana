/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rolesConfig } from './node_config';

describe('rolesConfig', () => {
  test('default', () => {
    expect(rolesConfig.validate(undefined)).toEqual(['*']);
  });
  test('empty', () => {
    expect(() => rolesConfig.validate([])).toThrow();
  });
  test('"ui" and "background_tasks" roles are allowed and can be combined', () => {
    expect(() => rolesConfig.validate(['ui', 'background_tasks'])).not.toThrow();
    expect(() => rolesConfig.validate(['ui'])).not.toThrow();
    expect(() => rolesConfig.validate(['background_tasks'])).not.toThrow();
  });
  test('exlcusive "*"', () => {
    const wildcardError = `wildcard ("*") cannot be used with other roles or specified more than once`;
    expect(() => rolesConfig.validate(['*'])).not.toThrow();

    expect(() => rolesConfig.validate(['*', 'ui'])).toThrow(wildcardError);
    expect(() => rolesConfig.validate(['*', '*'])).toThrow(wildcardError);

    expect(() => rolesConfig.validate(['*', 'unknown'])).toThrow();
  });
  test('exlcusive "migrator"', () => {
    const migratorError = `"migrator" cannot be used with other roles or specified more than once`;
    expect(() => rolesConfig.validate(['migrator'])).not.toThrow();

    expect(() => rolesConfig.validate(['migrator', 'ui'])).toThrow(migratorError);
    expect(() => rolesConfig.validate(['migrator', 'migrator'])).toThrow(migratorError);

    expect(() => rolesConfig.validate(['migrator', 'unknown'])).toThrow();
  });
});
