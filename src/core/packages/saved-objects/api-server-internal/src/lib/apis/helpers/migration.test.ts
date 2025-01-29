/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObject, AuthorizationTypeMap } from '@kbn/core-saved-objects-server';
import {
  createMigratorMock,
  createDocumentMigratorMock,
  createEncryptionHelperMock,
} from '../../../mocks';
import { MigrationHelper } from './migration';

const createSavedObject = (id = 'foo'): SavedObject => {
  return {
    id,
    type: 'bar',
    attributes: {},
    references: [],
  };
};

const createTypeMap = (): AuthorizationTypeMap<string> => {
  return new Map();
};

describe('MigrationHelper', () => {
  let documentMigrator: ReturnType<typeof createDocumentMigratorMock>;
  let migrator: ReturnType<typeof createMigratorMock>;
  let encryptionHelper: ReturnType<typeof createEncryptionHelperMock>;

  let migrationHelper: MigrationHelper;

  beforeEach(() => {
    documentMigrator = createDocumentMigratorMock();
    migrator = createMigratorMock();
    migrator.getDocumentMigrator.mockReturnValue(documentMigrator);
    encryptionHelper = createEncryptionHelperMock();

    migrator.migrateDocument.mockImplementation((doc: unknown) => doc as any);
    encryptionHelper.optionallyDecryptAndRedactSingleResult.mockImplementation(
      (doc: unknown) => doc as any
    );

    migrationHelper = new MigrationHelper({
      encryptionHelper,
      migrator,
    });
  });

  describe('migrateAndDecryptStorageDocument', () => {
    it('calls documentMigrator.isDowngradeRequired with the correct parameters', async () => {
      const doc = createSavedObject();

      await migrationHelper.migrateAndDecryptStorageDocument({
        document: doc,
        typeMap: undefined,
      });

      expect(documentMigrator.isDowngradeRequired).toHaveBeenCalledTimes(1);
      expect(documentMigrator.isDowngradeRequired).toHaveBeenCalledWith(doc);
    });

    it('calls migrator.migrateDocument with the correct parameters', async () => {
      const doc = createSavedObject();

      await migrationHelper.migrateAndDecryptStorageDocument({
        document: doc,
        typeMap: undefined,
      });

      expect(migrator.migrateDocument).toHaveBeenCalledTimes(1);
      expect(migrator.migrateDocument).toHaveBeenCalledWith(doc, { allowDowngrade: true });
    });

    it('calls encryptionHelper.optionallyDecryptAndRedactSingleResult with the correct parameters', async () => {
      const doc = createSavedObject();
      const typeMap = createTypeMap();
      const originalAttributes = { unknown: true };

      await migrationHelper.migrateAndDecryptStorageDocument({
        document: doc,
        typeMap,
        originalAttributes,
      });

      expect(encryptionHelper.optionallyDecryptAndRedactSingleResult).toHaveBeenCalledTimes(1);
      expect(encryptionHelper.optionallyDecryptAndRedactSingleResult).toHaveBeenCalledWith(
        doc,
        typeMap,
        originalAttributes
      );
    });

    it('performs the calls in the correct order when isDowngradeRequired returns false', async () => {
      documentMigrator.isDowngradeRequired.mockReturnValue(false);

      const doc = createSavedObject();
      const typeMap = createTypeMap();
      const originalAttributes = { unknown: true };

      const migratedDoc = createSavedObject('another_id');
      migrator.migrateDocument.mockReturnValue(migratedDoc);

      await migrationHelper.migrateAndDecryptStorageDocument({
        document: doc,
        typeMap,
        originalAttributes,
      });

      expect(migrator.migrateDocument).toHaveBeenCalledTimes(1);
      expect(encryptionHelper.optionallyDecryptAndRedactSingleResult).toHaveBeenCalledTimes(1);

      const migrateCallOrder = migrator.migrateDocument.mock.invocationCallOrder[0];
      const encryptionCallOrder =
        encryptionHelper.optionallyDecryptAndRedactSingleResult.mock.invocationCallOrder[0];

      expect(migrateCallOrder).toBeLessThan(encryptionCallOrder);

      expect(encryptionHelper.optionallyDecryptAndRedactSingleResult).toHaveBeenCalledWith(
        migratedDoc,
        typeMap,
        originalAttributes
      );
    });

    it('performs the calls in the correct order when isDowngradeRequired returns true', async () => {
      documentMigrator.isDowngradeRequired.mockReturnValue(true);

      const doc = createSavedObject();
      const typeMap = createTypeMap();
      const originalAttributes = { unknown: true };

      const decryptedDoc = createSavedObject('another_id');
      encryptionHelper.optionallyDecryptAndRedactSingleResult.mockReturnValue(decryptedDoc as any);

      await migrationHelper.migrateAndDecryptStorageDocument({
        document: doc,
        typeMap,
        originalAttributes,
      });

      expect(migrator.migrateDocument).toHaveBeenCalledTimes(1);
      expect(encryptionHelper.optionallyDecryptAndRedactSingleResult).toHaveBeenCalledTimes(1);

      const migrateCallOrder = migrator.migrateDocument.mock.invocationCallOrder[0];
      const encryptionCallOrder =
        encryptionHelper.optionallyDecryptAndRedactSingleResult.mock.invocationCallOrder[0];

      expect(encryptionCallOrder).toBeLessThan(migrateCallOrder);

      expect(migrator.migrateDocument).toHaveBeenCalledWith(decryptedDoc, { allowDowngrade: true });
    });
  });
});
