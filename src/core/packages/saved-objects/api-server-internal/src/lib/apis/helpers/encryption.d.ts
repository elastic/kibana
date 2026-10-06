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
import type { SavedObjectsUpdateResponse } from '@kbn/core-saved-objects-api-server';
import type {
  AuthorizationTypeMap,
  ISavedObjectsSecurityExtension,
  ISavedObjectsEncryptionExtension,
} from '@kbn/core-saved-objects-server';
export type IEncryptionHelper = PublicMethodsOf<EncryptionHelper>;
export declare class EncryptionHelper {
  private securityExtension?;
  private encryptionExtension?;
  constructor({
    securityExtension,
    encryptionExtension,
  }: {
    securityExtension?: ISavedObjectsSecurityExtension;
    encryptionExtension?: ISavedObjectsEncryptionExtension;
  });
  optionallyEncryptAttributes<T>(
    type: string,
    id: string,
    namespaceOrNamespaces: string | string[] | undefined,
    attributes: T
  ): Promise<T>;
  optionallyDecryptAndRedactSingleResult<T, A extends string>(
    object: SavedObject<T>,
    typeMap: AuthorizationTypeMap<A> | undefined,
    originalAttributes?: T
  ): Promise<SavedObject<T>>;
  optionallyDecryptAndRedactBulkResult<
    T,
    S extends SavedObject<T> | SavedObjectsUpdateResponse<T>,
    R extends {
      saved_objects: Array<S | SavedObjectErrorResult>;
    },
    A extends string,
    O extends Array<{
      attributes: T;
    }>
  >(
    response: R,
    typeMap: AuthorizationTypeMap<A> | undefined,
    originalObjects?: O
  ): Promise<
    R & {
      saved_objects: (SavedObject<T> | SavedObjectErrorResult)[];
    }
  >;
}
