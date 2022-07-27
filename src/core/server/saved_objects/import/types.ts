/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import {
  SavedObject,
  SavedObjectsImportRetry,
  SavedObjectsImportWarning,
} from '@kbn/core-saved-objects-common';

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
