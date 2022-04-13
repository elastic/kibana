/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import semverGte from 'semver/functions/gte';
import { makeVisualizeEmbeddableFactory } from './make_visualize_embeddable_factory';
import { getAllMigrations } from '../migrations/visualization_saved_object_migrations';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SerializedSearchSourceFields } from 'src/plugins/data/public';
import { GetMigrationFunctionObjectFn } from 'src/plugins/kibana_utils/common';

describe('embeddable migrations', () => {
  test('should have same versions registered as saved object migrations versions (>7.13.0)', () => {
    const savedObjectMigrationVersions = Object.keys(getAllMigrations({})).filter((version) => {
      return semverGte(version, '7.13.1');
    });
    const embeddableMigrationVersions = (
      makeVisualizeEmbeddableFactory(() => ({}))()?.migrations as GetMigrationFunctionObjectFn
    )();
    if (embeddableMigrationVersions) {
      expect(savedObjectMigrationVersions.sort()).toEqual(
        Object.keys(embeddableMigrationVersions).sort()
      );
    }
  });

  test('should properly apply a filter migration within a legacy visualization', () => {
    const migrationVersion = 'some-version';

    const embeddedVisualizationDoc = {
      savedVis: {
        data: {
          searchSource: {
            type: 'some-type',
            migrated: false,
          },
        },
      },
    };

    const embeddableMigrationVersions = (
      makeVisualizeEmbeddableFactory(() => ({
        [migrationVersion]: (searchSource: SerializedSearchSourceFields) => {
          return {
            ...searchSource,
            migrated: true,
          };
        },
      }))()?.migrations as GetMigrationFunctionObjectFn
    )();

    const migratedVisualizationDoc =
      embeddableMigrationVersions?.[migrationVersion](embeddedVisualizationDoc);

    expect(migratedVisualizationDoc).toEqual({
      savedVis: {
        data: {
          searchSource: {
            type: 'some-type',
            migrated: true,
          },
        },
      },
    });
  });
});
