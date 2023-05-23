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
 * Helper for document migrations.
 */
export class MigrationHelper {
  private migrator: IKibanaMigrator;

  constructor({ migrator }: { migrator: IKibanaMigrator }) {
    this.migrator = migrator;
  }

  /**
   * Migrate the given SO document, throwing if a downgrade if required.
   * This function is meant to be used by write-access APIs (create...) for documents provided as input.
   * before storing it in the index. It will therefor throw if the document is in a higher / unknown version.
   */
  migrateInputDocument(document: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc {
    return this.migrator.migrateDocument(document, { allowDowngrade: false });
  }

  /**
   * Migrate the given SO document, accepting downgrades.
   * This function is meant to be used by read-access APIs (get, search...) for documents fetched from the index.
   * before returning it from the API. It will therefor accept downgrading the document.
   */
  migrateStorageDocument(document: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc {
    return this.migrator.migrateDocument(document, { allowDowngrade: true });
  }
}
