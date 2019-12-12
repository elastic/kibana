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

import { SavedObjectsClient } from './service/saved_objects_client';
import { SavedObjectsMapping } from './mappings';
import { MigrationDefinition } from './migrations/core/document_migrator';
import { SavedObjectsSchemaDefinition } from './schema';
import { PropertyValidators } from './validation';

export {
  SavedObjectsImportResponse,
  SavedObjectsImportConflictError,
  SavedObjectsImportUnsupportedTypeError,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportUnknownError,
  SavedObjectsImportError,
  SavedObjectsImportRetry,
} from './import/types';

/**
 * Information about the migrations that have been applied to this SavedObject.
 * When Kibana starts up, KibanaMigrator detects outdated documents and
 * migrates them based on this value. For each migration that has been applied,
 * the plugin's name is used as a key and the latest migration version as the
 * value.
 *
 * @example
 * migrationVersion: {
 *   dashboard: '7.1.1',
 *   space: '6.6.6',
 * }
 *
 * @public
 */
export interface SavedObjectsMigrationVersion {
  [pluginName: string]: string;
}

/**
 * Don't use this type, it's simply a helper type for {@link SavedObjectAttribute}
 *
 * @public
 */
export type SavedObjectAttributeSingle =
  | string
  | number
  | boolean
  | null
  | undefined
  | SavedObjectAttributes;

/**
 * Type definition for a Saved Object attribute value
 *
 * @public
 */
export type SavedObjectAttribute = SavedObjectAttributeSingle | SavedObjectAttributeSingle[];

/**
 * The data for a Saved Object is stored as an object in the `attributes`
 * property.
 *
 * @public
 */
export interface SavedObjectAttributes {
  [key: string]: SavedObjectAttribute;
}

/**
 *
 * @public
 */
export interface SavedObject<T extends SavedObjectAttributes = any> {
  /** The ID of this Saved Object, guaranteed to be unique for all objects of the same `type` */
  id: string;
  /**  The type of Saved Object. Each plugin can define it's own custom Saved Object types. */
  type: string;
  /** An opaque version number which changes on each successful write operation. Can be used for implementing optimistic concurrency control. */
  version?: string;
  /** Timestamp of the last time this document had been updated.  */
  updated_at?: string;
  error?: {
    message: string;
    statusCode: number;
  };
  /** {@inheritdoc SavedObjectAttributes} */
  attributes: T;
  /** {@inheritdoc SavedObjectReference} */
  references: SavedObjectReference[];
  /** {@inheritdoc SavedObjectsMigrationVersion} */
  migrationVersion?: SavedObjectsMigrationVersion;
}

/**
 * A reference to another saved object.
 *
 * @public
 */
export interface SavedObjectReference {
  name: string;
  type: string;
  id: string;
}

/**
 *
 * @public
 */
export interface SavedObjectsFindOptions extends SavedObjectsBaseOptions {
  type: string | string[];
  page?: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: string;
  /**
   * An array of fields to include in the results
   * @example
   * SavedObjects.find({type: 'dashboard', fields: ['attributes.name', 'attributes.location']})
   */
  fields?: string[];
  /** Search documents using the Elasticsearch Simple Query String syntax. See Elasticsearch Simple Query String `query` argument for more information */
  search?: string;
  /** The fields to perform the parsed query against. See Elasticsearch Simple Query String `fields` argument for more information */
  searchFields?: string[];
  hasReference?: { type: string; id: string };
  defaultSearchOperator?: 'AND' | 'OR';
  filter?: string;
}

/**
 *
 * @public
 */
export interface SavedObjectsBaseOptions {
  /** Specify the namespace for this operation */
  namespace?: string;
}

/**
 * Elasticsearch Refresh setting for mutating operation
 * @public
 */
export type MutatingOperationRefreshSetting = boolean | 'wait_for';

/**
 * Saved Objects is Kibana's data persisentence mechanism allowing plugins to
 * use Elasticsearch for storing plugin state.
 *
 * ## SavedObjectsClient errors
 *
 * Since the SavedObjectsClient has its hands in everything we
 * are a little paranoid about the way we present errors back to
 * to application code. Ideally, all errors will be either:
 *
 *   1. Caused by bad implementation (ie. undefined is not a function) and
 *      as such unpredictable
 *   2. An error that has been classified and decorated appropriately
 *      by the decorators in {@link SavedObjectsErrorHelpers}
 *
 * Type 1 errors are inevitable, but since all expected/handle-able errors
 * should be Type 2 the `isXYZError()` helpers exposed at
 * `SavedObjectsErrorHelpers` should be used to understand and manage error
 * responses from the `SavedObjectsClient`.
 *
 * Type 2 errors are decorated versions of the source error, so if
 * the elasticsearch client threw an error it will be decorated based
 * on its type. That means that rather than looking for `error.body.error.type` or
 * doing substring checks on `error.body.error.reason`, just use the helpers to
 * understand the meaning of the error:
 *
 *   ```js
 *   if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
 *      // handle 404
 *   }
 *
 *   if (SavedObjectsErrorHelpers.isNotAuthorizedError(error)) {
 *      // 401 handling should be automatic, but in case you wanted to know
 *   }
 *
 *   // always rethrow the error unless you handle it
 *   throw error;
 *   ```
 *
 * ### 404s from missing index
 *
 * From the perspective of application code and APIs the SavedObjectsClient is
 * a black box that persists objects. One of the internal details that users have
 * no control over is that we use an elasticsearch index for persistance and that
 * index might be missing.
 *
 * At the time of writing we are in the process of transitioning away from the
 * operating assumption that the SavedObjects index is always available. Part of
 * this transition is handling errors resulting from an index missing. These used
 * to trigger a 500 error in most cases, and in others cause 404s with different
 * error messages.
 *
 * From my (Spencer) perspective, a 404 from the SavedObjectsApi is a 404; The
 * object the request/call was targeting could not be found. This is why #14141
 * takes special care to ensure that 404 errors are generic and don't distinguish
 * between index missing or document missing.
 *
 * ### 503s from missing index
 *
 * Unlike all other methods, create requests are supposed to succeed even when
 * the Kibana index does not exist because it will be automatically created by
 * elasticsearch. When that is not the case it is because Elasticsearch's
 * `action.auto_create_index` setting prevents it from being created automatically
 * so we throw a special 503 with the intention of informing the user that their
 * Elasticsearch settings need to be updated.
 *
 * See {@link SavedObjectsClient}
 * See {@link SavedObjectsErrorHelpers}
 *
 * @public
 */
export type SavedObjectsClientContract = Pick<SavedObjectsClient, keyof SavedObjectsClient>;

/**
 * @internal
 * @deprecated
 */
export interface SavedObjectsLegacyUiExports {
  unknown: [{ pluginSpec: { getId: () => unknown }; type: unknown }] | undefined;
  savedObjectMappings: SavedObjectsMapping[];
  savedObjectMigrations: MigrationDefinition;
  savedObjectSchemas: SavedObjectsSchemaDefinition;
  savedObjectValidations: PropertyValidators;
}
