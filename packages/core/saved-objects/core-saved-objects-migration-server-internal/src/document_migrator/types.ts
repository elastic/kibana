/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';

/**
 * Map containing all the info to convert types
 */
export interface ActiveMigrations {
  [type: string]: TypeConversion;
}

/**
 * Structure containing all the required info to perform a type's conversion
 */
export interface TypeConversion {
  /** Derived from `migrate` transforms and `convert` transforms */
  latestMigrationVersion?: string;
  /** Derived from `reference` transforms */
  latestCoreMigrationVersion?: string;
  /** List of transforms registered for the type **/
  transforms: Transform[];
}

/**
 * Internal representation of a document transformation
 */
export interface Transform {
  /** The version this transform is registered for */
  version: string;
  /** The transformation function */
  transform: TransformFn;
  /** The type of this transform */
  transformType: TransformType;
}

/**
 * There are two "migrationVersion" transform types:
 *   * `migrate` - These transforms are defined and added by consumers using the type registry; each is applied to a single object type
 *     based on an object's `migrationVersion[type]` field. These are applied during index migrations and document migrations.
 *   * `convert` - These transforms are defined by core and added by consumers using the type registry; each is applied to a single object
 *     type based on an object's `migrationVersion[type]` field. These are applied during index migrations, NOT document migrations.
 *
 * There is one "coreMigrationVersion" transform type:
 *   * `reference` - These transforms are defined by core and added by consumers using the type registry; they are applied to all object
 *     types based on their `coreMigrationVersion` field. These are applied during index migrations, NOT document migrations.
 */
export type TransformType = 'migrate' | 'convert' | 'reference';

/**
 * Transformation function for a {@link Transform}
 */
export type TransformFn = (doc: SavedObjectUnsanitizedDoc) => TransformResult;

/**
 * Return type for a {@link TransformFn}
 */
export interface TransformResult {
  /**
   * This is the original document that has been transformed.
   */
  transformedDoc: SavedObjectUnsanitizedDoc;
  /**
   * These are any new document(s) that have been created during the transformation process; these are not transformed, but they are marked
   * as up-to-date. Only conversion transforms generate additional documents.
   */
  additionalDocs: SavedObjectUnsanitizedDoc[];
}
