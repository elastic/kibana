/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import semverGte from 'semver/functions/gte';
import { visualizeEmbeddableFactory } from './visualize_embeddable_factory';
import { visualizationSavedObjectTypeMigrations } from '../migrations/visualization_saved_object_migrations';

describe('saved object migrations and embeddable migrations', () => {
  test('should have same versions registered (>7.13.0)', () => {
    const savedObjectMigrationVersions = Object.keys(visualizationSavedObjectTypeMigrations).filter(
      (version) => {
        return semverGte(version, '7.13.1');
      }
    );
    const embeddableMigrationVersions = visualizeEmbeddableFactory()?.migrations;
    if (embeddableMigrationVersions) {
      expect(savedObjectMigrationVersions.sort()).toEqual(
        Object.keys(embeddableMigrationVersions).sort()
      );
    }
  });
});
