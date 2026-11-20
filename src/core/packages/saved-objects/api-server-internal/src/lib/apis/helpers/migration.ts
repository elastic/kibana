/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import {
  SavedObjectsErrorHelpers,
  type SavedObjectUnsanitizedDoc,
  type AuthorizationTypeMap,
  type SavedObject,
} from '@kbn/core-saved-objects-server';
import type { StoredAcl } from '@kbn/ols';
import type { IKibanaMigrator } from '@kbn/core-saved-objects-base-server-internal';
import type { IEncryptionHelper } from './encryption';
import { projectAcl } from '../utils/acl';

export type IMigrationHelper = PublicMethodsOf<MigrationHelper>;

/**
 * Repository helper for document migrations.
 */
export class MigrationHelper {
  private migrator: IKibanaMigrator;
  private encryptionHelper: IEncryptionHelper;

  constructor({
    migrator,
    encryptionHelper,
  }: {
    migrator: IKibanaMigrator;
    encryptionHelper: IEncryptionHelper;
  }) {
    this.migrator = migrator;
    this.encryptionHelper = encryptionHelper;
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
   */
  migrateStorageDocument(document: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc {
    // The caller hands over ownership of this document fetched from Elasticsearch, so cloning is unnecessary.
    return this.migrator.migrateDocument(document, { allowDowngrade: true, allowSkipClone: true });
  }

  /**
   * Migrate and decrypt the given SO document fetched from the index. A model version can set an
   * ACL, so the result leaves it out again unless `includeAcl` is set.
   */
  async migrateAndDecryptStorageDocument<T, A extends string>({
    document,
    typeMap,
    originalAttributes,
    includeAcl = false,
  }: {
    document: SavedObjectUnsanitizedDoc<T> | SavedObject<T>;
    typeMap: AuthorizationTypeMap<A> | undefined;
    originalAttributes?: T;
    includeAcl?: boolean;
  }): Promise<SavedObject<T>> {
    const downgrade = this.migrator.getDocumentMigrator().isDowngradeRequired(document);

    const migrate = (doc: SavedObjectUnsanitizedDoc | SavedObject) => {
      try {
        // The caller hands over ownership of this document fetched from Elasticsearch, so cloning is unnecessary.
        return this.migrator.migrateDocument(doc, {
          allowDowngrade: true,
          allowSkipClone: true,
        }) as SavedObject<T>;
      } catch (error) {
        throw SavedObjectsErrorHelpers.decorateGeneralError(
          error,
          'Failed to migrate document to the latest version.'
        );
      }
    };

    const decrypt = (doc: SavedObjectUnsanitizedDoc | SavedObject) => {
      return this.encryptionHelper.optionallyDecryptAndRedactSingleResult(
        doc as SavedObject<T>,
        typeMap,
        originalAttributes
      );
    };

    const result = downgrade ? migrate(await decrypt(document)) : await decrypt(migrate(document));
    return projectAcl<SavedObject<T> & { acl?: StoredAcl }>(result, includeAcl);
  }
}
