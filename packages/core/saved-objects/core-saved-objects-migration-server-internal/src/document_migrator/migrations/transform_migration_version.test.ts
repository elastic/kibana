/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { transformMigrationVersion } from './transform_migration_version';

describe('transformMigrationVersion', () => {
  it('should extract the correct version from the `migrationVersion` property', () => {
    expect(
      transformMigrationVersion({
        id: 'a',
        attributes: {},
        type: 'something',
        migrationVersion: {
          something: '1.0.0',
          previous: '2.0.0',
        },
      })
    ).toHaveProperty('transformedDoc.typeMigrationVersion', '1.0.0');
  });

  it('should remove the original `migrationVersion` property', () => {
    expect(
      transformMigrationVersion({
        id: 'a',
        attributes: {},
        type: 'something',
        migrationVersion: {
          something: '1.0.0',
          previous: '2.0.0',
        },
      })
    ).not.toHaveProperty('transformedDoc.migrationVersion');
  });

  it('should not add `typeMigrationVersion` if there is no `migrationVersion`', () => {
    expect(
      transformMigrationVersion({
        id: 'a',
        attributes: {},
        type: 'something',
      })
    ).not.toHaveProperty('transformedDoc.typeMigrationVersion');
  });

  it('should add empty `typeMigrationVersion` if there is no related value in `migrationVersion`', () => {
    expect(
      transformMigrationVersion({
        id: 'a',
        attributes: {},
        type: 'something',
        migrationVersion: {},
      })
    ).toHaveProperty('transformedDoc.typeMigrationVersion', '');
  });
});
