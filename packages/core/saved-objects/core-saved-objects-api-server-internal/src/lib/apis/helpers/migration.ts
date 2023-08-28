/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import type { IKibanaMigrator } from '@kbn/core-saved-objects-base-server-internal';

export type IMigrationHelper = PublicMethodsOf<MigrationHelper>;

/**
 * Repository helper for document migrations.
 */
export class MigrationHelper {
  private migrator: IKibanaMigrator;

  constructor({ migrator }: { migrator: IKibanaMigrator }) {
    this.migrator = migrator;
  }

  /**
   * Migrate the given SO document, throwing if a downgrade is required.
   * This function is meant to be used by write APIs (create, update) for documents provided as input.
   * before storing it in the index. It will therefore throw if the document is in a higher / unknown version.
   */
  migrateInputDocument(document: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc {
    return this.migrator.migrateDocument(document, { allowDowngrade: false });
  }

  /**
   * Migrate the given SO document, accepting downgrades.
   * This function is meant to be used by read APIs (get, find) for documents fetched from the index.
   * It will therefore accept downgrading the document before returning it from the API.
   *
   * Note: to opt out of downgrades, use the downwardConversion: 'forbid' API option in READ API operations:
   * get, resolve, find, bulk_get, bulk_resolve
   */
  migrateStorageDocument(
    document: SavedObjectUnsanitizedDoc,
    options: { downwardConversion?: 'allow' | 'forbid' }
  ): SavedObjectUnsanitizedDoc {
    return this.migrator.migrateDocument(document, {
      allowDowngrade:
        options?.downwardConversion && options.downwardConversion === 'forbid' ? false : true,
    }); // allowDowngrade conditional on downwardConversion
  }
}
