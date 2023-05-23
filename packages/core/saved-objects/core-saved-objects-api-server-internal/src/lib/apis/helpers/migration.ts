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
   * Migrate the document to the latest know version by this instance,
   * allowing potentially downgrading from higher versions.
   */
  migrateToLatestKnownVersion(document: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc {
    return this.migrator.migrateDocument(document, { allowDowngrade: true });
  }
}
