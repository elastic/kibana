/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
