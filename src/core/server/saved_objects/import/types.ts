/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import { SavedObject } from '../types';

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
export interface SavedObjectsImportFailure {
  id: string;
  type: string;
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
   * @deprecated Can be removed when https://github.com/elastic/kibana/issues/91615 is done.
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
  warnings: SavedObjectsImportWarning[];
  errors?: SavedObjectsImportFailure[];
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
 * A simple informative warning that will be displayed to the user.
 *
 * @public
 */
export interface SavedObjectsImportSimpleWarning {
  type: 'simple';
  /** The translated message to display to the user */
  message: string;
}

/**
 * A warning meant to notify that a specific user action is required to finalize the import
 * of some type of object.
 *
 * @remark The `actionUrl` must be a path relative to the basePath, and not include it.
 *
 * @public
 */
export interface SavedObjectsImportActionRequiredWarning {
  type: 'action_required';
  /** The translated message to display to the user. */
  message: string;
  /** The path (without the basePath) that the user should be redirect to address this warning. */
  actionPath: string;
  /** An optional label to use for the link button. If unspecified, a default label will be used. */
  buttonLabel?: string;
}

/**
 * Composite type of all the possible types of import warnings.
 *
 * See {@link SavedObjectsImportSimpleWarning} and {@link SavedObjectsImportActionRequiredWarning}
 * for more details.
 *
 * @public
 */
export type SavedObjectsImportWarning =
  | SavedObjectsImportSimpleWarning
  | SavedObjectsImportActionRequiredWarning;

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
