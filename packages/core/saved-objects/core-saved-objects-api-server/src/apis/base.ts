/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common';

/**
 * Base options used by most of the savedObject APIs.
 * @public
 */
export interface SavedObjectsBaseOptions {
  /** Specify the namespace for this operation */
  namespace?: string;
}

/**
 * Elasticsearch Refresh setting for mutating operation
 * @public
 */
export type MutatingOperationRefreshSetting = boolean | 'wait_for';

/**
 * Base return for saved object bulk operations
 *
 * @public
 */
export interface SavedObjectsBulkResponse<T = unknown> {
  /** array of saved objects */
  saved_objects: Array<SavedObject<T>>;
}
