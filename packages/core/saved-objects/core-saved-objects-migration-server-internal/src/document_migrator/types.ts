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
 * Map containing all the info to convert types
 */
export interface ActiveMigrations {
  [type: string]: TypeTransforms;
}

/**
 * Structure containing all the required info to perform a type's conversion
 */
export interface TypeTransforms {
  /**
   * Latest non-deferred version for each transform type.
   * This is the version that will be used to query outdated documents.
   */
  immediateVersion: Record<TransformType, string>;
  /**
   * Latest version for each transform type, including deferred transforms.
   * This is the version that will be used to perform the migration.
   */
  latestVersion: Record<TransformType, string>;
  /** Ordered list of transforms registered for the type **/
  transforms: Transform[];
  /** Per-version schemas for the given type */
  versionSchemas: Record<string, TypeVersionSchema>;
}

/**
 * Internal representation of a document transformation
 */
export interface Transform {
  /** The type of this transform */
  transformType: TransformType;
  /** The version this transform is registered for */
  version: string;
  /** The upward transformation function */
  transform: TransformFn;
  /** The (optional) downward transformation function */
  transformDown?: TransformFn;
  /** Whether this transform is deferred */
  deferred?: boolean;
}

export enum TransformType {
  /**
   * These transforms are defined by core and added by consumers using the type registry; each is applied to a single object
   * type based on an object's `typeMigrationVersion` field. These are applied during index migrations, NOT document migrations.
   */
  Convert = 'convert',

  /**
   * These transforms are defined by core internally; they are applied to all object types based on their `coreMigrationVersion` field.
   * These are applied during index migrations and before any document migrations to guarantee that all documents have the most recent schema.
   */
  Core = 'core',

  /**
   * These transforms are defined and added by consumers using the type registry; each is applied to a single object type
   * based on an object's `typeMigrationVersion` field. These are applied during index migrations and document migrations.
   */
  Migrate = 'migrate',

  /**
   * These transforms are defined by core and added by consumers using the type registry; they are applied to all object
   * types based on their `coreMigrationVersion` field. These are applied during index migrations, NOT document migrations.
   */
  Reference = 'reference',
}

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

/**
 * per-version persistence schema for {@link TypeTransforms}
 */
export type TypeVersionSchema = (doc: SavedObjectUnsanitizedDoc) => SavedObjectUnsanitizedDoc;
