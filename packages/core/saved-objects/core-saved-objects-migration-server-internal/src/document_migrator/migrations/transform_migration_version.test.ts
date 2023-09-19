/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { unary } from 'lodash';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { transformMigrationVersion } from './transform_migration_version';

const transform = unary(SavedObjectsUtils.getMigrationFunction(transformMigrationVersion));

describe('transformMigrationVersion', () => {
  it('should extract the correct version from the `migrationVersion` property', () => {
    expect(
      transform({
        id: 'a',
        attributes: {},
        type: 'something',
        migrationVersion: {
          something: '1.0.0',
          previous: '2.0.0',
        },
      })
    ).toHaveProperty('typeMigrationVersion', '1.0.0');
  });

  it('should remove the original `migrationVersion` property', () => {
    expect(
      transform({
        id: 'a',
        attributes: {},
        type: 'something',
        migrationVersion: {
          something: '1.0.0',
          previous: '2.0.0',
        },
      })
    ).not.toHaveProperty('migrationVersion');
  });

  it('should not add `typeMigrationVersion` if there is no `migrationVersion`', () => {
    expect(
      transform({
        id: 'a',
        attributes: {},
        type: 'something',
      })
    ).not.toHaveProperty('typeMigrationVersion');
  });

  it('should add empty `typeMigrationVersion` if there is no related value in `migrationVersion`', () => {
    expect(
      transform({
        id: 'a',
        attributes: {},
        type: 'something',
        migrationVersion: {},
      })
    ).toHaveProperty('typeMigrationVersion', '');
  });
});
