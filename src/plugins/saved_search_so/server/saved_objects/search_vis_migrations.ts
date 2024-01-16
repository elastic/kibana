/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isFunction, mapValues } from 'lodash';
import type { SavedObjectMigrationMap } from '@kbn/core-saved-objects-server';
import type { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import { LogMeta } from '@kbn/logging';
import { MigrateFunction, MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import {
  SavedObjectMigrationContext,
  SavedObjectMigrationParams,
  SavedObjectSanitizedDoc,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';
import type { SavedSearchAttributes } from '@kbn/saved-search/types';

export const getLensVisContextMigrations = (
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory']
): SavedObjectMigrationMap => {
  return getLensMigrations({
    lensEmbeddableFactory,
    migratorFactory: migrateByValueLensVisualizations,
  });
};

function migrateByValueLensVisualizations(
  migrate: MigrateFunction
): SavedObjectMigrationParams<SavedSearchAttributes, SavedSearchAttributes> {
  return {
    deferred: false,
    transform: (
      doc: SavedObjectUnsanitizedDoc<SavedSearchAttributes>,
      context: SavedObjectMigrationContext
    ): SavedObjectSanitizedDoc<SavedSearchAttributes> => {
      if (doc.attributes.visContextJSON) {
        return migrateLensVisContext({ migrate, doc, context });
      }

      return Object.assign(doc, { references: doc.references ?? [] });
    },
  };
}

interface MigrationLogMeta extends LogMeta {
  migrations: {
    [x: string]: {
      id: string;
    };
  };
}

function migrateLensVisContext({
  migrate,
  doc,
  context,
}: {
  migrate: MigrateFunction;
  doc: SavedObjectUnsanitizedDoc<SavedSearchAttributes>;
  context: SavedObjectMigrationContext;
}): SavedObjectSanitizedDoc<SavedSearchAttributes> {
  try {
    const { visContextJSON } = doc.attributes;
    const parsedVisContext = visContextJSON ? JSON.parse(visContextJSON) : undefined;

    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        visContextJSON:
          parsedVisContext && parsedVisContext.attributes
            ? JSON.stringify({
                ...parsedVisContext,
                attributes: migrate(parsedVisContext.attributes),
              })
            : undefined,
      },
      references: doc.references ?? [],
    };
  } catch (error) {
    context.log.error<MigrationLogMeta>(
      `Failed to migrate "search" with doc id: ${doc.id} version: ${context.migrationVersion} error: ${error.message}`,
      {
        migrations: {
          visContextJSON: {
            id: doc.id,
          },
        },
      }
    );

    return Object.assign(doc, { references: doc.references ?? [] });
  }
}

interface GetLensMigrationsArgs<T> {
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
  migratorFactory: (
    migrate: MigrateFunction,
    migrationVersion: string
  ) => SavedObjectMigrationParams<T, T>;
}

function getLensMigrations<T>({
  lensEmbeddableFactory,
  migratorFactory,
}: GetLensMigrationsArgs<T>) {
  const lensMigrations = lensEmbeddableFactory().migrations;
  const lensMigrationObject = isFunction(lensMigrations) ? lensMigrations() : lensMigrations || {};

  const embeddableMigrations = mapValues<MigrateFunctionsObject, SavedObjectMigrationParams<T, T>>(
    lensMigrationObject,
    migratorFactory
  );

  return embeddableMigrations;
}
