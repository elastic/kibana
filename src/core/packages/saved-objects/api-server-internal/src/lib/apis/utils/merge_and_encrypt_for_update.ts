/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';
import type { IEncryptionHelper } from '../helpers';
import { mergeForUpdate } from './merge_for_update';

interface MergeAndEncryptForUpdateParams {
  encryptionHelper: IEncryptionHelper;
  logger: Logger;
  type: string;
  id: string;
  /** The namespace (or namespaces) used to build the encryption descriptor of the object. */
  namespace: string | string[] | undefined;
  /** The attributes of the object as they are stored, migrated to the current version. */
  storedAttributes: Record<string, unknown>;
  /** The (NOT encrypted) attributes supplied to the update. */
  updatedAttributes: unknown;
  typeMappings: SavedObjectsTypeMappingDefinition;
  /** Whether the supplied attributes are merged into the stored ones, or replace them. */
  mergeAttributes: boolean;
}

/**
 * Returns the attributes to store for an update, with the encrypted attributes of encryptable types
 * encrypted.
 *
 * Encrypted attributes are bound to other attributes of the object (AAD). When the supplied
 * attributes are merged into the stored ones, they are therefore encrypted against the merged
 * attributes, not against the partial ones supplied to the update. The stored encrypted attributes
 * are decrypted first when the update does not replace all of them.
 */
export const mergeAndEncryptForUpdate = async ({
  encryptionHelper,
  logger,
  type,
  id,
  namespace,
  storedAttributes,
  updatedAttributes,
  typeMappings,
  mergeAttributes,
}: MergeAndEncryptForUpdateParams): Promise<unknown> => {
  if (!mergeAttributes) {
    // the supplied attributes replace the stored ones as a whole, so they can be encrypted on their own
    return encryptionHelper.optionallyEncryptAttributes(type, id, namespace, updatedAttributes);
  }

  const { decryptCurrent, encryptRequirement } = encryptionHelper.getUpdateEncryptionRequirements(
    type,
    updatedAttributes
  );

  let targetAttributes = { ...storedAttributes };
  // stored encrypted attributes that are written back exactly as they are stored
  const retainedEncryptedAttributes: Record<string, unknown> = {};

  if (encryptRequirement === 'post-merge') {
    // drop the stored ciphertext of every encrypted attribute the update replaces, so that it is
    // neither decrypted nor merged with the supplied plaintext
    const suppliedAttributes = updatedAttributes as Record<string, unknown>;
    for (const attributeName of encryptionHelper.getEncryptedAttributes(type)) {
      if (suppliedAttributes[attributeName] !== undefined) {
        delete targetAttributes[attributeName];
      }
    }
  }

  if (decryptCurrent) {
    try {
      targetAttributes = await encryptionHelper.optionallyDecryptAttributes(
        type,
        id,
        namespace,
        targetAttributes
      );
    } catch (error) {
      // The stored encrypted attributes cannot be decrypted, so they cannot be encrypted again
      // against the merged attributes. The update must still go through: keep them as stored.
      logger.warn(
        `Unable to decrypt the stored attributes of saved object [${type}:${id}] during update, the encrypted attributes that are not updated are kept as stored: ${error.message}`
      );
      for (const attributeName of encryptionHelper.getEncryptedAttributes(type)) {
        if (targetAttributes[attributeName] !== undefined) {
          retainedEncryptedAttributes[attributeName] = targetAttributes[attributeName];
          delete targetAttributes[attributeName];
        }
      }
    }
  }

  const mergedAttributes = mergeForUpdate({
    targetAttributes,
    updatedAttributes,
    typeMappings,
  });

  if (encryptRequirement !== 'post-merge') {
    return mergedAttributes;
  }

  return {
    ...(await encryptionHelper.optionallyEncryptAttributes(type, id, namespace, mergedAttributes)),
    ...retainedEncryptedAttributes,
  };
};
