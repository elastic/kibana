/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Readable } from 'stream';
import { SavedObjectsClientContract, SavedObject } from '../types';
import { ISavedObjectTypeRegistry } from '..';

/**
 * Describes a retry operation for importing a saved object.
 * @public
 */
export interface SavedObjectsImportRetry {
  type: string;
  id: string;
  overwrite: boolean;
  /**
   * The object ID that will be created or overwritten. If not specified, the `id` field will be used.
   */
  destinationId?: string;
  replaceReferences: Array<{
    type: string;
    from: string;
    to: string;
  }>;
  /**
   * If `createNewCopy` is specified, the new object has a new (undefined) origin ID. This is only needed for the case where
   * `createNewCopies` mode is disabled and ambiguous source conflicts are detected.
   */
  createNewCopy?: boolean;
  /**
   * If `ignoreMissingReferences` is specified, reference validation will be skipped for this object.
   */
  ignoreMissingReferences?: boolean;
}

/**
 * Represents a failure to import due to a conflict.
 * @public
 */
export interface SavedObjectsImportConflictError {
  type: 'conflict';
  destinationId?: string;
}

/**
 * Represents a failure to import due to a conflict, which can be resolved in different ways with an overwrite.
 * @public
 */
export interface SavedObjectsImportAmbiguousConflictError {
  type: 'ambiguous_conflict';
  destinations: Array<{ id: string; title?: string; updatedAt?: string }>;
}

/**
 * Represents a failure to import due to having an unsupported saved object type.
 * @public
 */
export interface SavedObjectsImportUnsupportedTypeError {
  type: 'unsupported_type';
}

/**
 * Represents a failure to import due to an unknown reason.
 * @public
 */
export interface SavedObjectsImportUnknownError {
  type: 'unknown';
  message: string;
  statusCode: number;
}

/**
 * Represents a failure to import due to missing references.
 * @public
 */
export interface SavedObjectsImportMissingReferencesError {
  type: 'missing_references';
  references: Array<{ type: string; id: string }>;
}

/**
 * Represents a failure to import.
 * @public
 */
export interface SavedObjectsImportError {
  id: string;
  type: string;
  /**
   * @deprecated Use `meta.title` instead
   */
  title?: string;
  meta: { title?: string; icon?: string };
  /**
   * If `overwrite` is specified, an attempt was made to overwrite an existing object.
   */
  overwrite?: boolean;
  error:
    | SavedObjectsImportConflictError
    | SavedObjectsImportAmbiguousConflictError
    | SavedObjectsImportUnsupportedTypeError
    | SavedObjectsImportMissingReferencesError
    | SavedObjectsImportUnknownError;
}

/**
 * Represents a successful import.
 * @public
 */
export interface SavedObjectsImportSuccess {
  id: string;
  type: string;
  /**
   * If `destinationId` is specified, the new object has a new ID that is different from the import ID.
   */
  destinationId?: string;
  /**
   * @deprecated
   * If `createNewCopy` is specified, the new object has a new (undefined) origin ID. This is only needed for the case where
   * `createNewCopies` mode is disabled and ambiguous source conflicts are detected. When `createNewCopies` mode is permanently enabled,
   * this field will be redundant and can be removed.
   */
  createNewCopy?: boolean;
  meta: {
    title?: string;
    icon?: string;
  };
  /**
   * If `overwrite` is specified, this object overwrote an existing one (or will do so, in the case of a pending resolution).
   */
  overwrite?: boolean;
}

/**
 * The response describing the result of an import.
 * @public
 */
export interface SavedObjectsImportResponse {
  success: boolean;
  successCount: number;
  successResults?: SavedObjectsImportSuccess[];
  errors?: SavedObjectsImportError[];
}

/**
 * Options to control the import operation.
 * @public
 */
export interface SavedObjectsImportOptions {
  /** The stream of {@link SavedObject | saved objects} to import */
  readStream: Readable;
  /** The maximum number of object to import */
  objectLimit: number;
  /** If true, will override existing object if present. Note: this has no effect when used with the `createNewCopies` option. */
  overwrite: boolean;
  /** {@link SavedObjectsClientContract | client} to use to perform the import operation */
  savedObjectsClient: SavedObjectsClientContract;
  /** The registry of all known saved object types */
  typeRegistry: ISavedObjectTypeRegistry;
  /** if specified, will import in given namespace, else will import as global object */
  namespace?: string;
  /** If true, will create new copies of import objects, each with a random `id` and undefined `originId`. */
  createNewCopies: boolean;
}

/**
 * Options to control the "resolve import" operation.
 * @public
 */
export interface SavedObjectsResolveImportErrorsOptions {
  /** The stream of {@link SavedObject | saved objects} to resolve errors from */
  readStream: Readable;
  /** The maximum number of object to import */
  objectLimit: number;
  /** client to use to perform the import operation */
  savedObjectsClient: SavedObjectsClientContract;
  /** The registry of all known saved object types */
  typeRegistry: ISavedObjectTypeRegistry;
  /** saved object import references to retry */
  retries: SavedObjectsImportRetry[];
  /** if specified, will import in given namespace */
  namespace?: string;
  /** If true, will create new copies of import objects, each with a random `id` and undefined `originId`. */
  createNewCopies: boolean;
}

export type CreatedObject<T> = SavedObject<T> & { destinationId?: string };
