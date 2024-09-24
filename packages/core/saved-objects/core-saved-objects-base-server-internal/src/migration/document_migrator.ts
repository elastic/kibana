/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';

/**
 * Manages transformations of individual documents.
 */
export interface IDocumentMigrator {
  /**
   * Migrates a document to its latest version.
   */
  migrate(
    doc: SavedObjectUnsanitizedDoc,
    options?: DocumentMigrateOptions
  ): SavedObjectUnsanitizedDoc;

  /**
   * Migrates a document to the latest version and applies type conversions if applicable.
   * Also returns any additional document(s) that may have been created during the transformation process.
   *
   * @remark This only be used by the savedObject migration during upgrade. For all other scenarios,
   *         {@link IDocumentMigrator#migrate} should be used instead.
   */
  migrateAndConvert(doc: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc[];

  /**
   * Returns true if the provided document has a higher version that the `targetTypeVersion`
   * (defaulting to the last known version), false otherwise.
   */
  isDowngradeRequired(
    doc: SavedObjectUnsanitizedDoc,
    options?: IsDowngradeRequiredOptions
  ): boolean;
}

/**
 * Options for {@link IDocumentMigrator.migrate}
 */
export interface DocumentMigrateOptions {
  /**
   * Defines whether it is allowed to convert documents from an higher version or not.
   * - If `true`, documents from higher versions will go though the downgrade pipeline.
   * - If `false`, an error will be thrown when trying to process a document with an higher type version.
   * Defaults to `false`.
   */
  allowDowngrade?: boolean;
  /**
   * If specified, will migrate to the given version instead of the latest known version.
   */
  targetTypeVersion?: string;
}

/**
 * Options for {@link IDocumentMigrator.isDowngradeRequired}
 */
export interface IsDowngradeRequiredOptions {
  /**
   * If specified, will migrate to the given version instead of the latest known version.
   */
  targetTypeVersion?: string;
}
