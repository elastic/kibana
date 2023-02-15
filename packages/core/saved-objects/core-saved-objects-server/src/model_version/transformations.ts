/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
 * A bidirectional transformation.
 *
 * Bidirectional transformations define migration functions that can be used to
 * transform a document from the lower version to the higher one (`up`), and
 * the other way around, from the higher version to the lower one (`down`)
 *
 * @public
 */
export interface SavedObjectModelBidirectionalTransformation<
  PreviousAttributes = unknown,
  NewAttributes = unknown
> {
  /**
   * The upward (previous=>next) transformation.
   */
  up: SavedObjectModelTransformationFn<PreviousAttributes, NewAttributes>;
  /**
   * The downward (next=>previous) transformation.
   */
  down: SavedObjectModelTransformationFn<NewAttributes, PreviousAttributes>;
}
