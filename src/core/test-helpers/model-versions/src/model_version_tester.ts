/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { getEnvOptions } from '@kbn/config-mocks';
import { Env } from '@kbn/config';
import { REPO_ROOT } from '@kbn/repo-info';
import type { SavedObjectsType, SavedObject } from '@kbn/core-saved-objects-server';
import {
  modelVersionToVirtualVersion,
  SavedObjectTypeRegistry,
  globalSwitchToModelVersionAt,
} from '@kbn/core-saved-objects-base-server-internal';
import { DocumentMigrator } from '@kbn/core-saved-objects-migration-server-internal';

const env = Env.createDefault(REPO_ROOT, getEnvOptions());
const currentVersion = env.packageInfo.version;
const lastCoreVersion = '8.8.0';

/**
 * Options for {@link ModelVersionTestMigrator.migrate}
 */
interface ModelVersionTestMigrateOptions<T = unknown> {
  /**
   * The document to migrate.
   */
  document: SavedObject<T>;
  /**
   * The model version the input document should be considered in.
   */
  fromVersion: number;
  /**
   * The model version the document should be migrated to.
   */
  toVersion: number;
}

/**
 * Test utility allowing to test model version changes between versions.
 */
export interface ModelVersionTestMigrator {
  /**
   * Migrate the document from the provided source to destination model version.
   *
   * @see {@link ModelVersionTestMigrateOptions}
   */
  migrate<In = unknown, Out = unknown>(
    options: ModelVersionTestMigrateOptions<In>
  ): SavedObject<Out>;
}

/**
 * Create a {@link ModelVersionTestMigrator | test migrator} that can be used
 * to test model version changes between versions.
 *
 * @example
 * ```ts
 * const mySoType = someSoType();
 * const migrator = createModelVersionTestMigrator({ type: mySoType });
 *
 * const obj = createSomeSavedObject();
 *
 * const migrated = migrator.migrate({
 *    document: obj,
 *    fromVersion: 1,
 *    toVersion: 2,
 * });
 *
 * expect(migrated.properties).toEqual(myExpectedProperties);
 * ```
 */
export const createModelVersionTestMigrator = ({
  type,
}: {
  type: SavedObjectsType;
}): ModelVersionTestMigrator => {
  const typeRegistry = new SavedObjectTypeRegistry();
  typeRegistry.registerType({
    switchToModelVersionAt: globalSwitchToModelVersionAt,
    ...type,
  });

  const logger = loggerMock.create();

  const migrator = new DocumentMigrator({
    typeRegistry,
    log: logger,
    kibanaVersion: currentVersion,
  });
  migrator.prepareMigrations();

  return {
    migrate: ({ document, fromVersion, toVersion }) => {
      const docCopy: SavedObject = {
        ...document,
        coreMigrationVersion: lastCoreVersion,
        typeMigrationVersion: modelVersionToVirtualVersion(fromVersion),
      };

      const migratedDoc = migrator.migrate(docCopy, {
        allowDowngrade: true,
        targetTypeVersion: modelVersionToVirtualVersion(toVersion),
      });

      return migratedDoc as SavedObject<any>;
    },
  };
};
