/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  SavedObject,
  SavedObjectErrorResult,
} from '@kbn/core-saved-objects-common/src/server_types';
import { isSavedObjectErrorResult } from '@kbn/core-saved-objects-common/src/server_types';
import type { SavedObjectsUpdateResponse } from '@kbn/core-saved-objects-api-server';
import type {
  AuthorizationTypeMap,
  ISavedObjectsSecurityExtension,
  ISavedObjectsEncryptionExtension,
  SavedObjectsUpdateEncryptionRequirements,
} from '@kbn/core-saved-objects-server';

export type IEncryptionHelper = PublicMethodsOf<EncryptionHelper>;

export class EncryptionHelper {
  private securityExtension?: ISavedObjectsSecurityExtension;
  private encryptionExtension?: ISavedObjectsEncryptionExtension;

  constructor({
    securityExtension,
    encryptionExtension,
  }: {
    securityExtension?: ISavedObjectsSecurityExtension;
    encryptionExtension?: ISavedObjectsEncryptionExtension;
  }) {
    this.securityExtension = securityExtension;
    this.encryptionExtension = encryptionExtension;
  }

  async optionallyEncryptAttributes<T>(
    type: string,
    id: string,
    namespaceOrNamespaces: string | string[] | undefined,
    attributes: T
  ): Promise<T> {
    if (!this.encryptionExtension?.isEncryptableType(type)) {
      return attributes;
    }
    const namespace = Array.isArray(namespaceOrNamespaces)
      ? namespaceOrNamespaces[0]
      : namespaceOrNamespaces;
    const descriptor = { type, id, namespace };
    return this.encryptionExtension.encryptAttributes(
      descriptor,
      attributes as Record<string, unknown>
    ) as unknown as T;
  }

  /**
   * Decrypts all encrypted attributes of a stored object, throwing if any of them cannot be decrypted.
   */
  async optionallyDecryptAttributes<T>(
    type: string,
    id: string,
    namespaceOrNamespaces: string | string[] | undefined,
    attributes: T
  ): Promise<T> {
    if (!this.encryptionExtension?.isEncryptableType(type)) {
      return attributes;
    }
    const namespace = Array.isArray(namespaceOrNamespaces)
      ? namespaceOrNamespaces[0]
      : namespaceOrNamespaces;
    const descriptor = { type, id, namespace };
    return this.encryptionExtension.decryptAttributes(
      descriptor,
      attributes as Record<string, unknown>
    ) as unknown as T;
  }

  /**
   * Returns how encryption must be handled when the attributes of a partial update are merged into a stored object.
   */
  getUpdateEncryptionRequirements<T>(
    type: string,
    attributes: T
  ): SavedObjectsUpdateEncryptionRequirements {
    if (!this.encryptionExtension?.isEncryptableType(type)) {
      return { decryptCurrent: false, encryptRequirement: 'none' };
    }
    return this.encryptionExtension.getUpdateEncryptionRequirements(
      type,
      attributes as Record<string, unknown>
    );
  }

  /**
   * Returns the names of the encrypted attributes of a type, or an empty set if the type is not encryptable.
   */
  getEncryptedAttributes(type: string): ReadonlySet<string> {
    return this.encryptionExtension?.getEncryptedAttributes(type) ?? new Set<string>();
  }

  async optionallyDecryptAndRedactSingleResult<T, A extends string>(
    object: SavedObject<T>,
    typeMap: AuthorizationTypeMap<A> | undefined,
    originalAttributes?: T
  ) {
    if (this.encryptionExtension?.isEncryptableType(object.type)) {
      object = await this.encryptionExtension.decryptOrStripResponseAttributes(
        object,
        originalAttributes
      );
    }
    if (typeMap) {
      return this.securityExtension!.redactNamespaces({ typeMap, savedObject: object });
    }
    return object;
  }

  async optionallyDecryptAndRedactBulkResult<
    T,
    S extends SavedObject<T> | SavedObjectsUpdateResponse<T>,
    R extends { saved_objects: Array<S | SavedObjectErrorResult> },
    A extends string,
    O extends Array<{ attributes: T }>
  >(response: R, typeMap: AuthorizationTypeMap<A> | undefined, originalObjects?: O) {
    const modifiedObjects = await Promise.all(
      response.saved_objects.map(async (object, index) => {
        if (isSavedObjectErrorResult(object)) {
          // If the bulk operation failed, the object will not have an attributes field at all, it will have an error field instead.
          // In this case, don't attempt to decrypt, just return the object.
          return object;
        }
        const originalAttributes = originalObjects?.[index].attributes;
        return await this.optionallyDecryptAndRedactSingleResult(
          object as SavedObject<T>,
          typeMap,
          originalAttributes
        );
      })
    );
    return { ...response, saved_objects: modifiedObjects };
  }
}
