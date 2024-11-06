/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject, SavedObjectReference } from '../..';
import type { MutatingOperationRefreshSetting, SavedObjectsBaseOptions } from './base';

/**
 * Options for the saved objects update operation
 *
 * @public
 */
export interface SavedObjectsUpdateOptions<Attributes = unknown> extends SavedObjectsBaseOptions {
  /**
   * An opaque version number which changes on each successful write operation.
   * Can be used for implementing optimistic concurrency control.
   * Unused for multi-namespace objects
   */
  version?: string;
  /** {@inheritdoc SavedObjectReference} */
  references?: SavedObjectReference[];
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
  /** If specified, will be used to perform an upsert if the object doesn't exist */
  upsert?: Attributes;
  /**
   * The Elasticsearch `retry_on_conflict` setting for this operation.
   * Defaults to `0` when `version` is provided, `3` otherwise.
   */
  retryOnConflict?: number;
  /** {@link SavedObjectsRawDocParseOptions.migrationVersionCompatibility} */
  migrationVersionCompatibility?: 'compatible' | 'raw';
  /**
   * By default, update will merge the provided attributes with the ones present on the document
   * (performing a standard partial update). Setting this option to `false` will change the behavior, performing
   * a "full" update instead, where the provided attributes will fully replace the existing ones.
   * Defaults to `true`.
   */
  mergeAttributes?: boolean;
}

/**
 * Return type of the Saved Objects `update()` method.
 *
 * @public
 */
export interface SavedObjectsUpdateResponse<T = unknown>
  extends Omit<SavedObject<T>, 'attributes' | 'references'> {
  /** partial attributes of the saved object */
  attributes: Partial<T>;
  /** optionally included references to other saved objects */
  references: SavedObjectReference[] | undefined;
}
