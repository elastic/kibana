/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MutatingOperationRefreshSetting, SavedObjectsBaseOptions } from './base';
import type { SavedObjectsUpdateOptions, SavedObjectsUpdateResponse } from './update';

/**
 * Object parameters for the bulk update operation
 *
 * @public
 */
export interface SavedObjectsBulkUpdateObject<T = unknown>
  extends Pick<SavedObjectsUpdateOptions<T>, 'version' | 'references'> {
  /** The ID of this Saved Object, guaranteed to be unique for all objects of the same `type` */
  id: string;
  /**  The type of this Saved Object. Each plugin can define it's own custom Saved Object types. */
  type: string;
  /** The data for a Saved Object is stored as an object in the `attributes` property. **/
  attributes: Partial<T>;
  /**
   * Optional namespace string to use when searching for this object. If this is defined, it will supersede the namespace ID that is in
   * {@link SavedObjectsBulkUpdateOptions}.
   *
   * Note: the default namespace's string representation is `'default'`, and its ID representation is `undefined`.
   **/
  namespace?: string;
}

/**
 * Options for the saved objects bulk update operation
 *
 * @public
 */
export interface SavedObjectsBulkUpdateOptions extends SavedObjectsBaseOptions {
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
  /** {@link SavedObjectsRawDocParseOptions.migrationVersionCompatibility} */
  migrationVersionCompatibility?: 'compatible' | 'raw';
}

/**
 * Return type of the Saved Objects `bulkUpdate()` method.
 *
 * @public
 */
export interface SavedObjectsBulkUpdateResponse<T = unknown> {
  /** array of {@link SavedObjectsUpdateResponse} */
  saved_objects: Array<SavedObjectsUpdateResponse<T>>;
}
