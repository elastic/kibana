/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import type { MutatingOperationRefreshSetting, SavedObjectsBaseOptions } from './base';

/**
 *
 * @public
 */
export interface SavedObjectsBulkDeleteObject {
  type: string;
  id: string;
}

/**
 * @public
 */
export interface SavedObjectsBulkDeleteOptions extends SavedObjectsBaseOptions {
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
  /**
   * Force deletion of all objects that exists in multiple namespaces, applied to all objects.
   */
  force?: boolean;
}

/**
 * @public
 */
export interface SavedObjectsBulkDeleteStatus {
  id: string;
  type: string;
  /** The status of deleting the object: true for deleted, false for error */
  success: boolean;
  /** Reason the object could not be deleted (success is false) */
  error?: SavedObjectError;
}

/**
 * @public
 */
export interface SavedObjectsBulkDeleteResponse {
  statuses: SavedObjectsBulkDeleteStatus[];
}
