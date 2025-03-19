/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type {
  AuthorizationTypeMap,
  ISavedObjectsSecurityExtension,
  ISavedObjectsEncryptionExtension,
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
    R extends { saved_objects: Array<SavedObject<T>> },
    A extends string,
    O extends Array<{ attributes: T }>
  >(response: R, typeMap: AuthorizationTypeMap<A> | undefined, originalObjects?: O) {
    const modifiedObjects = await Promise.all(
      response.saved_objects.map(async (object, index) => {
        if (object.error) {
          // If the bulk operation failed, the object will not have an attributes field at all, it will have an error field instead.
          // In this case, don't attempt to decrypt, just return the object.
          return object;
        }
        const originalAttributes = originalObjects?.[index].attributes;
        return await this.optionallyDecryptAndRedactSingleResult(
          object,
          typeMap,
          originalAttributes
        );
      })
    );
    return { ...response, saved_objects: modifiedObjects };
  }
}
