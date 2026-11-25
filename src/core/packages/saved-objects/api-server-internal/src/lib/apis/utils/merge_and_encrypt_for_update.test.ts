/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type {
  SavedObjectsTypeMappingDefinition,
  SavedObjectsUpdateEncryptionRequirements,
} from '@kbn/core-saved-objects-server';
import { apiHelperMocks, type EncryptionHelperMock } from '../../../mocks/api_helpers.mocks';
import { mergeAndEncryptForUpdate } from './merge_and_encrypt_for_update';

const TYPE = 'encrypted-type';
const ID = 'some-id';
const NAMESPACE = 'some-space';
const ENCRYPTED_ATTRIBUTES = ['secretOne', 'secretTwo'];
const ENCRYPTED_PREFIX = 'encrypted:';

const typeMappings: SavedObjectsTypeMappingDefinition = { properties: {} };

const encryptValue = (value: unknown) => `${ENCRYPTED_PREFIX}${JSON.stringify(value)}`;

/** Encrypts every encrypted attribute that has a value, like the encryption extension does. */
const encryptAttributes = (attributes: Record<string, unknown>) => {
  const encryptedAttributes = { ...attributes };
  for (const attributeName of ENCRYPTED_ATTRIBUTES) {
    if (encryptedAttributes[attributeName] != null) {
      encryptedAttributes[attributeName] = encryptValue(encryptedAttributes[attributeName]);
    }
  }
  return encryptedAttributes;
};

/** Decrypts every encrypted attribute that has a value, and throws if one is not a ciphertext. */
const decryptAttributes = (attributes: Record<string, unknown>) => {
  const decryptedAttributes = { ...attributes };
  for (const attributeName of ENCRYPTED_ATTRIBUTES) {
    const value = decryptedAttributes[attributeName];
    if (value == null) {
      continue;
    }
    if (typeof value !== 'string' || !value.startsWith(ENCRYPTED_PREFIX)) {
      throw new Error(`Attribute "${attributeName}" is not encrypted`);
    }
    decryptedAttributes[attributeName] = JSON.parse(value.slice(ENCRYPTED_PREFIX.length));
  }
  return decryptedAttributes;
};

const NO_ENCRYPTION: SavedObjectsUpdateEncryptionRequirements = {
  decryptCurrent: false,
  encryptRequirement: 'none',
};
const ENCRYPT_ONLY: SavedObjectsUpdateEncryptionRequirements = {
  decryptCurrent: false,
  encryptRequirement: 'post-merge',
};
const DECRYPT_AND_ENCRYPT: SavedObjectsUpdateEncryptionRequirements = {
  decryptCurrent: true,
  encryptRequirement: 'post-merge',
};

describe('mergeAndEncryptForUpdate', () => {
  let encryptionHelper: EncryptionHelperMock;
  let logger: MockedLogger;
  let storedAttributes: Record<string, unknown>;

  const mergeAndEncrypt = (
    updatedAttributes: unknown,
    { mergeAttributes = true }: { mergeAttributes?: boolean } = {}
  ) =>
    mergeAndEncryptForUpdate({
      encryptionHelper,
      logger,
      type: TYPE,
      id: ID,
      namespace: NAMESPACE,
      storedAttributes,
      updatedAttributes,
      typeMappings,
      mergeAttributes,
    });

  beforeEach(() => {
    logger = loggerMock.create();
    encryptionHelper = apiHelperMocks.createEncryptionHelper();
    encryptionHelper.getEncryptedAttributes.mockReturnValue(new Set(ENCRYPTED_ATTRIBUTES));
    encryptionHelper.optionallyEncryptAttributes.mockImplementation(
      async (type, id, namespace, attributes) =>
        encryptAttributes(attributes as Record<string, unknown>) as typeof attributes
    );
    encryptionHelper.optionallyDecryptAttributes.mockImplementation(
      async (type, id, namespace, attributes) =>
        decryptAttributes(attributes as Record<string, unknown>) as typeof attributes
    );

    storedAttributes = {
      title: 'stored-title',
      aad: { kind: 'stored-kind', nested: { one: 'stored-one', two: 'stored-two' } },
      secretOne: encryptValue('stored-secret-one'),
      secretTwo: encryptValue({ token: 'stored-token', nested: { key: 'stored-key' } }),
    };
  });

  describe('when the attributes are not merged', () => {
    it('encrypts the supplied attributes on their own', async () => {
      const updatedAttributes = { title: 'new-title', secretOne: 'new-secret-one' };

      await expect(mergeAndEncrypt(updatedAttributes, { mergeAttributes: false })).resolves.toEqual(
        { title: 'new-title', secretOne: encryptValue('new-secret-one') }
      );

      expect(encryptionHelper.optionallyEncryptAttributes).toHaveBeenCalledTimes(1);
      expect(encryptionHelper.optionallyEncryptAttributes).toHaveBeenCalledWith(
        TYPE,
        ID,
        NAMESPACE,
        updatedAttributes
      );
      expect(encryptionHelper.getUpdateEncryptionRequirements).not.toHaveBeenCalled();
      expect(encryptionHelper.optionallyDecryptAttributes).not.toHaveBeenCalled();
    });
  });

  describe('when no encryption is required', () => {
    beforeEach(() => {
      encryptionHelper.getUpdateEncryptionRequirements.mockReturnValue(NO_ENCRYPTION);
    });

    it('merges the supplied attributes into the stored ones without decrypting or encrypting', async () => {
      const updatedAttributes = { title: 'new-title' };

      await expect(mergeAndEncrypt(updatedAttributes)).resolves.toEqual({
        ...storedAttributes,
        title: 'new-title',
      });

      expect(encryptionHelper.getUpdateEncryptionRequirements).toHaveBeenCalledWith(
        TYPE,
        updatedAttributes
      );
      expect(encryptionHelper.optionallyDecryptAttributes).not.toHaveBeenCalled();
      expect(encryptionHelper.optionallyEncryptAttributes).not.toHaveBeenCalled();
    });

    it('never decrypts the stored attributes, even if the requirements ask for it', async () => {
      // the type does not allow these requirements, they would store the decrypted attributes
      encryptionHelper.getUpdateEncryptionRequirements.mockReturnValue({
        decryptCurrent: true,
        encryptRequirement: 'none',
      } as unknown as SavedObjectsUpdateEncryptionRequirements);

      await expect(mergeAndEncrypt({ title: 'new-title' })).resolves.toEqual({
        ...storedAttributes,
        title: 'new-title',
      });

      expect(encryptionHelper.optionallyDecryptAttributes).not.toHaveBeenCalled();
      expect(encryptionHelper.optionallyEncryptAttributes).not.toHaveBeenCalled();
    });

    it('does not change the top-level stored attributes', async () => {
      const storedAttributesBeforeUpdate = { ...storedAttributes };

      await mergeAndEncrypt({ title: 'new-title', other: 'new-attribute' });

      expect(storedAttributes).toEqual(storedAttributesBeforeUpdate);
    });
  });

  describe('when the update replaces every encrypted attribute', () => {
    beforeEach(() => {
      encryptionHelper.getUpdateEncryptionRequirements.mockReturnValue(ENCRYPT_ONLY);
    });

    it('encrypts the merged attributes without decrypting the stored ones', async () => {
      const result = await mergeAndEncrypt({
        aad: { kind: 'new-kind' },
        secretOne: 'new-secret-one',
        secretTwo: { token: 'new-token' },
      });

      const expectedMergedAttributes = {
        title: 'stored-title',
        aad: { kind: 'new-kind', nested: { one: 'stored-one', two: 'stored-two' } },
        secretOne: 'new-secret-one',
        secretTwo: { token: 'new-token' },
      };
      expect(encryptionHelper.optionallyDecryptAttributes).not.toHaveBeenCalled();
      expect(encryptionHelper.optionallyEncryptAttributes).toHaveBeenCalledTimes(1);
      expect(encryptionHelper.optionallyEncryptAttributes).toHaveBeenCalledWith(
        TYPE,
        ID,
        NAMESPACE,
        expectedMergedAttributes
      );
      expect(result).toEqual(encryptAttributes(expectedMergedAttributes));
    });

    it('removes an encrypted attribute that is supplied as `null`', async () => {
      const result = await mergeAndEncrypt({ secretOne: 'new-secret-one', secretTwo: null });

      expect(encryptionHelper.optionallyDecryptAttributes).not.toHaveBeenCalled();
      expect(result).toEqual({
        title: storedAttributes.title,
        aad: storedAttributes.aad,
        secretOne: encryptValue('new-secret-one'),
        secretTwo: null,
      });
    });
  });

  describe('when the update keeps some of the stored encrypted attributes', () => {
    beforeEach(() => {
      encryptionHelper.getUpdateEncryptionRequirements.mockReturnValue(DECRYPT_AND_ENCRYPT);
    });

    it('decrypts the stored attributes, merges, and encrypts the result', async () => {
      const result = await mergeAndEncrypt({ aad: { nested: { two: 'new-two' } } });

      expect(encryptionHelper.optionallyDecryptAttributes).toHaveBeenCalledTimes(1);
      expect(encryptionHelper.optionallyDecryptAttributes).toHaveBeenCalledWith(
        TYPE,
        ID,
        NAMESPACE,
        storedAttributes
      );

      const expectedMergedAttributes = {
        title: 'stored-title',
        aad: { kind: 'stored-kind', nested: { one: 'stored-one', two: 'new-two' } },
        secretOne: 'stored-secret-one',
        secretTwo: { token: 'stored-token', nested: { key: 'stored-key' } },
      };
      expect(encryptionHelper.optionallyEncryptAttributes).toHaveBeenCalledTimes(1);
      expect(encryptionHelper.optionallyEncryptAttributes).toHaveBeenCalledWith(
        TYPE,
        ID,
        NAMESPACE,
        expectedMergedAttributes
      );
      expect(result).toEqual(encryptAttributes(expectedMergedAttributes));
    });

    it('does not decrypt the stored value of a supplied encrypted attribute', async () => {
      await mergeAndEncrypt({ secretOne: 'new-secret-one' });

      const { secretOne, ...storedAttributesToDecrypt } = storedAttributes;
      expect(encryptionHelper.optionallyDecryptAttributes).toHaveBeenCalledWith(
        TYPE,
        ID,
        NAMESPACE,
        storedAttributesToDecrypt
      );
    });

    it('replaces a supplied encrypted attribute as a whole, without merging it', async () => {
      // a merge would keep `nested` of the stored value, and turn the numeric key into an array index
      const suppliedSecret = { 0: 'first', token: 'new-token' };

      const result = (await mergeAndEncrypt({ secretTwo: suppliedSecret })) as Record<
        string,
        unknown
      >;

      expect(encryptionHelper.optionallyEncryptAttributes).toHaveBeenCalledWith(
        TYPE,
        ID,
        NAMESPACE,
        expect.objectContaining({ secretOne: 'stored-secret-one', secretTwo: suppliedSecret })
      );
      expect(result.secretTwo).toBe(encryptValue(suppliedSecret));
    });

    it('keeps the stored value of an encrypted attribute that is supplied as `undefined`', async () => {
      const result = await mergeAndEncrypt({ secretOne: 'new-secret-one', secretTwo: undefined });

      expect(result).toEqual({
        title: storedAttributes.title,
        aad: storedAttributes.aad,
        secretOne: encryptValue('new-secret-one'),
        secretTwo: storedAttributes.secretTwo,
      });
    });

    it('does not change the top-level stored attributes or the supplied attributes', async () => {
      // the supplied encrypted attribute is taken out of the merge, and its stored value is dropped
      const updatedAttributes = { title: 'new-title', secretOne: 'new-secret-one' };
      const storedAttributesBeforeUpdate = { ...storedAttributes };
      const updatedAttributesBeforeUpdate = { ...updatedAttributes };

      await mergeAndEncrypt(updatedAttributes);

      expect(storedAttributes).toEqual(storedAttributesBeforeUpdate);
      expect(updatedAttributes).toEqual(updatedAttributesBeforeUpdate);
    });

    describe('and the stored attributes cannot be decrypted', () => {
      beforeEach(() => {
        encryptionHelper.optionallyDecryptAttributes.mockRejectedValue(
          new Error('Failed to decrypt')
        );
      });

      it('keeps the stored encrypted attributes exactly as they are stored and logs a warning', async () => {
        const result = await mergeAndEncrypt({ aad: { kind: 'new-kind' } });

        expect(result).toEqual({
          title: 'stored-title',
          aad: { kind: 'new-kind', nested: { one: 'stored-one', two: 'stored-two' } },
          secretOne: storedAttributes.secretOne,
          secretTwo: storedAttributes.secretTwo,
        });
        // the stored ciphertext must not be encrypted a second time
        expect(encryptionHelper.optionallyEncryptAttributes).toHaveBeenCalledWith(
          TYPE,
          ID,
          NAMESPACE,
          {
            title: 'stored-title',
            aad: { kind: 'new-kind', nested: { one: 'stored-one', two: 'stored-two' } },
          }
        );
        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining(
            `Unable to decrypt the stored attributes of saved object [${TYPE}:${ID}] during update`
          )
        );
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to decrypt'));
      });

      it('encrypts the supplied encrypted attributes and keeps the other ones as stored', async () => {
        const result = await mergeAndEncrypt({ secretOne: 'new-secret-one' });

        expect(result).toEqual({
          title: storedAttributes.title,
          aad: storedAttributes.aad,
          secretOne: encryptValue('new-secret-one'),
          secretTwo: storedAttributes.secretTwo,
        });
      });
    });

    it('fails if the merged attributes cannot be encrypted', async () => {
      encryptionHelper.optionallyEncryptAttributes.mockRejectedValue(
        new Error('Failed to encrypt')
      );

      await expect(mergeAndEncrypt({ aad: { kind: 'new-kind' } })).rejects.toThrow(
        'Failed to encrypt'
      );
    });
  });
});
