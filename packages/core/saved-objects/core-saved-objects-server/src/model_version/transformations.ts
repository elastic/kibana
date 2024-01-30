/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsNamespaceType } from '@kbn/core-saved-objects-common';
import type { SavedObjectUnsanitizedDoc } from '../serialization';
import type { SavedObjectsMigrationLogger } from '../migration';

/**
 * Document type used during model migration.
 *
 * @public
 */
export type SavedObjectModelTransformationDoc<T = unknown> = SavedObjectUnsanitizedDoc<T>;

/**
 * Context passed down to {@link SavedObjectModelTransformationFn | transformation functions}.
 *
 * @public
 */
export interface SavedObjectModelTransformationContext {
  /**
   * logger instance to be used by the migration handler
   */
  readonly log: SavedObjectsMigrationLogger;
  /**
   * The model version this migration is registered for
   */
  readonly modelVersion: number;
  /**
   * The namespace type of the savedObject type this migration is registered for
   */
  readonly namespaceType: SavedObjectsNamespaceType;
}

/**
 * Return type for the {@link SavedObjectModelTransformationFn | transformation functions}
 *
 * @public
 */
export interface SavedObjectModelTransformationResult<DocAttrs = unknown> {
  document: SavedObjectModelTransformationDoc<DocAttrs>;
}

/**
 * Transformation function for the model version API.
 *
 * Similar to the old migration system, model version transformations take the document to migrate
 * and a context object as input and must return the transformed document in its return value.
 *
 * @public
 */
export type SavedObjectModelTransformationFn<
  InputAttributes = unknown,
  OutputAttributes = unknown
> = (
  document: SavedObjectModelTransformationDoc<InputAttributes>,
  context: SavedObjectModelTransformationContext
) => SavedObjectModelTransformationResult<OutputAttributes>;

/**
 * Return type for the {@link SavedObjectModelTransformationFn | transformation functions}
 *
 * @public
 */
export interface SavedObjectModelDataBackfillResult<DocAttrs = unknown> {
  attributes: Partial<DocAttrs>;
}

/**
 * A data backfill function associated with a {@link SavedObjectsModelDataBackfillChange | data backfill} change.
 *
 * @remark Such transformation functions should only be used to backfill newly introduced fields.
 *         Even if no check is performed to ensure that, using such transformations to mutate
 *         existing data of the document can lead to data corruption or inconsistency.
 * @public
 */
export type SavedObjectModelDataBackfillFn<
  InputAttributes = unknown,
  OutputAttributes = unknown
> = (
  document: SavedObjectModelTransformationDoc<InputAttributes>,
  context: SavedObjectModelTransformationContext
) => SavedObjectModelDataBackfillResult<OutputAttributes>;

/**
 * A data transformation function associated with a {@link SavedObjectsModelUnsafeTransformChange | unsafe transform} change.
 *
 * @public
 */
export type SavedObjectModelUnsafeTransformFn<
  InputAttributes = unknown,
  OutputAttributes = unknown
> = SavedObjectModelTransformationFn<InputAttributes, OutputAttributes>;
