/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import semverGte from 'semver/functions/gte';
import { legacyVisualizeEmbeddableMigrations } from './legacy_visualizations_embeddable_migrations';
import { legacyVisualizationSavedObjectMigrations } from './legacy_visualizations_saved_object_migrations';

describe('embeddable migrations', () => {
  test('should have same versions registered as saved object migrations versions (>7.13.0)', () => {
    const savedObjectMigrationVersions = Object.keys(
      legacyVisualizationSavedObjectMigrations
    ).filter((version) => {
      return semverGte(version, '7.13.1');
    });
    const embeddableMigrationVersions = legacyVisualizeEmbeddableMigrations;
    if (embeddableMigrationVersions) {
      expect(savedObjectMigrationVersions.sort()).toEqual(
        Object.keys(embeddableMigrationVersions).sort()
      );
    }
  });
});
