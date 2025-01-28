/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable } from 'stream';
import {
  SavedObjectsImportRetry,
  SavedObjectsImportWarning,
  SavedObjectsImportResponse,
} from '@kbn/core-saved-objects-common';
import type { SavedObject } from '..';

/**
 * Utility class used to import savedObjects.
 *
 * @public
 */
export interface ISavedObjectsImporter {
  /**
   * Import saved objects from given stream. See the {@link SavedObjectsImportOptions | options} for more
   * detailed information.
   *
   * @throws SavedObjectsImportError
   */
  import(options: SavedObjectsImportOptions): Promise<SavedObjectsImportResponse>;

  /**
   * Resolve and return saved object import errors.
   * See the {@link SavedObjectsResolveImportErrorsOptions | options} for more detailed information.
   *
   * @throws SavedObjectsImportError
   */
  resolveImportErrors(
    options: SavedObjectsResolveImportErrorsOptions
  ): Promise<SavedObjectsImportResponse>;
}

/**
 * Options to control the importer
 *
 * @public
 */
export interface SavedObjectsImporterOptions {
  /** Overwrites the maximum number of saved objects that could be imported */
  importSizeLimit?: number;
}

/**
 * Options to control the import operation.
 * @public
 */
export interface SavedObjectsImportOptions {
  /** The stream of {@link SavedObject | saved objects} to import */
  readStream: Readable;
  /** If true, will override existing object if present. Note: this has no effect when used with the `createNewCopies` option. */
  overwrite: boolean;
  /** if specified, will import in given namespace, else will import as global object */
  namespace?: string;
  /** If true, will create new copies of import objects, each with a random `id` and undefined `originId`. */
  createNewCopies: boolean;
  /** Refresh setting, defaults to `wait_for` */
  refresh?: boolean | 'wait_for';
  /**
   * If true, Kibana will apply various adjustments to the data that's being imported to maintain compatibility between
   * different Kibana versions (e.g. generate legacy URL aliases for all imported objects that have to change IDs).
   */
  compatibilityMode?: boolean;
  /**
   * If true, will import as a managed object, else will import as not managed.
   *
   * This can be leveraged by applications to e.g. prevent edits to a managed
   * saved object. Instead, users can be guided to create a copy first and
   * make their edits to the copy.
   */
  managed?: boolean;
}

/**
 * Options to control the "resolve import" operation.
 * @public
 */
export interface SavedObjectsResolveImportErrorsOptions {
  /** The stream of {@link SavedObject | saved objects} to resolve errors from */
  readStream: Readable;
  /** saved object import references to retry */
  retries: SavedObjectsImportRetry[];
  /** if specified, will import in given namespace */
  namespace?: string;
  /** If true, will create new copies of import objects, each with a random `id` and undefined `originId`. */
  createNewCopies: boolean;
  /**
   * If true, Kibana will apply various adjustments to the data that's being retried to import to maintain compatibility between
   * different Kibana versions (e.g. generate legacy URL aliases for all imported objects that have to change IDs).
   */
  compatibilityMode?: boolean;
  /**
   * If true, will import as a managed object, else will import as not managed.
   *
   * This can be leveraged by applications to e.g. prevent edits to a managed
   * saved object. Instead, users can be guided to create a copy first and
   * make their edits to the copy.
   */
  managed?: boolean;
}

export type CreatedObject<T> = SavedObject<T> & { destinationId?: string };

/**
 * Result from a {@link SavedObjectsImportHook | import hook}
 *
 * @public
 */
export interface SavedObjectsImportHookResult {
  /**
   * An optional list of warnings to display in the UI when the import succeeds.
   */
  warnings?: SavedObjectsImportWarning[];
}

/**
 * A hook associated with a specific saved object type, that will be invoked during
 * the import process. The hook will have access to the objects of the registered type.
 *
 * Currently, the only supported feature for import hooks is to return warnings to be displayed
 * in the UI when the import succeeds.
 *
 * @remark The only interactions the hook can have with the import process is via the hook's
 *         response. Mutating the objects inside the hook's code will have no effect.
 *
 * @public
 */
export type SavedObjectsImportHook<T = unknown> = (
  objects: Array<SavedObject<T>>
) => SavedObjectsImportHookResult | Promise<SavedObjectsImportHookResult>;
