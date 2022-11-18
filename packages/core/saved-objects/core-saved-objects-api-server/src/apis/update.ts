/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectReference, SavedObject } from '@kbn/core-saved-objects-common';
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
