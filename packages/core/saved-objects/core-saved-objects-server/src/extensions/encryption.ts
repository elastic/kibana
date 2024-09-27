/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject } from '../..';

/**
 * The EncryptedObjectDescriptor interface contains settings for describing
 * an object to be encrypted or decrpyted.
 */
export interface EncryptedObjectDescriptor {
  /** The Saved Object type */
  type: string;
  /** The Saved Object ID */
  id: string;
  /** Namespace for use in index migration...
   * If the object is being decrypted during index migration, the object was previously
   * encrypted with its namespace in the descriptor portion of the AAD; on the other hand,
   * if the object is being decrypted during object migration, the object was never encrypted
   * with its namespace in the descriptor portion of the AAD. */
  namespace?: string;
}

/**
 * The ISavedObjectsEncryptionExtension interface defines the functions of a saved objects
 * repository encryption extension. It contains functions for determining if a type is
 * encryptable, encrypting object attributes, and decrypting or stripping object attributes.
 */
export interface ISavedObjectsEncryptionExtension {
  /**
   * Returns true if a type has been registered as encryptable.
   * @param type - the string name of the object type
   * @returns boolean, true if type is encryptable
   */
  isEncryptableType: (type: string) => boolean;

  /**
   * Given a saved object, will return a decrypted saved object or will strip
   * attributes from the returned object if decryption fails.
   * @param response - any object R that extends SavedObject with attributes T
   * @param originalAttributes - optional, original attributes T from when the object was created (NOT encrypted).
   * These are used to avoid decryption execution cost if they are supplied.
   * @returns R with decrypted or stripped attributes
   */
  decryptOrStripResponseAttributes: <T, R extends SavedObject<T>>(
    response: R,
    originalAttributes?: T
  ) => Promise<R>;

  /**
   * Given a saved object descriptor and some attributes, returns an encrypted version
   * of supplied attributes.
   * @param descriptor - an object containing a saved object id, type, and optional namespace.
   * @param attributes - T, attributes of the specified object, some of which to be encrypted.
   * @returns T, encrypted attributes
   */
  encryptAttributes: <T extends Record<string, unknown>>(
    descriptor: EncryptedObjectDescriptor,
    attributes: T
  ) => Promise<T>;
}
