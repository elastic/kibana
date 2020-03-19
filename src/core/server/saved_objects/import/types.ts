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
import { SavedObjectsClientContract } from '../types';

/**
 * Describes a retry operation for importing a saved object.
 * @public
 */
export interface SavedObjectsImportRetry {
  type: string;
  id: string;
  overwrite: boolean;
  replaceReferences: Array<{
    type: string;
    from: string;
    to: string;
  }>;
}

/**
 * Represents a failure to import due to a conflict.
 * @public
 */
export interface SavedObjectsImportConflictError {
  type: 'conflict';
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
  references: Array<{
    type: string;
    id: string;
  }>;
  blocking: Array<{
    type: string;
    id: string;
  }>;
}

/**
 * Represents a failure to import.
 * @public
 */
export interface SavedObjectsImportError {
  id: string;
  type: string;
  title?: string;
  error:
    | SavedObjectsImportConflictError
    | SavedObjectsImportUnsupportedTypeError
    | SavedObjectsImportMissingReferencesError
    | SavedObjectsImportUnknownError;
}

/**
 * The response describing the result of an import.
 * @public
 */
export interface SavedObjectsImportResponse {
  success: boolean;
  successCount: number;
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
  /** if true, will override existing object if present */
  overwrite: boolean;
  /** {@link SavedObjectsClientContract | client} to use to perform the import operation */
  savedObjectsClient: SavedObjectsClientContract;
  /** the list of allowed types to import */
  supportedTypes: string[];
  /** if specified, will import in given namespace, else will import as global object */
  namespace?: string;
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
  /** saved object import references to retry */
  retries: SavedObjectsImportRetry[];
  /** the list of allowed types to import */
  supportedTypes: string[];
  /** if specified, will import in given namespace */
  namespace?: string;
}
