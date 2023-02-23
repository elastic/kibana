/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { rolesConfig } from './node_config';

describe('rolesConfig', () => {
  test('"ui" and "background_tasks" roles are allowed and can be combined', () => {
    expect(() => rolesConfig.validate(['ui', 'background_tasks'])).not.toThrow();
    expect(() => rolesConfig.validate(['ui'])).not.toThrow();
    expect(() => rolesConfig.validate(['background_tasks'])).not.toThrow();
  });
  test('exlcusive "*"', () => {
    expect(() => rolesConfig.validate(['*'])).not.toThrow();
    expect(() => rolesConfig.validate(['*', 'ui'])).toThrow();
    expect(() => rolesConfig.validate(['*', 'background_tasks'])).toThrow();
    expect(() => rolesConfig.validate(['*', 'unknown'])).toThrow();
  });
  test('exlcusive "migrator"', () => {
    expect(() => rolesConfig.validate(['migrator'])).not.toThrow();
    expect(() => rolesConfig.validate(['migrator', 'ui'])).toThrow();
    expect(() => rolesConfig.validate(['migrator', 'unknown'])).toThrow();
  });
});
