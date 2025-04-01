/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import type { MutatingOperationRefreshSetting, SavedObjectsBaseOptions } from './base';

/**
 * Object parameters for the bulk delete operation
 *
 * @public
 */
export interface SavedObjectsBulkDeleteObject {
  /** The type of the saved object to delete */
  type: string;
  /** The ID of the saved object to delete */
  id: string;
}

/**
 * Options for the bulk delete operation
 *
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
 * The per-object result of a bulk delete operation
 *
 * @public
 */
export interface SavedObjectsBulkDeleteStatus {
  /** The ID of the saved object */
  id: string;
  /** The type of the saved object */
  type: string;
  /** The status of deleting the object: true for deleted, false for error */
  success: boolean;
  /** Reason the object could not be deleted (success is false) */
  error?: SavedObjectError;
}

/**
 * Return type of the Saved Objects `bulkDelete()` method
 *
 * @public
 */
export interface SavedObjectsBulkDeleteResponse {
  /** Array of {@link SavedObjectsBulkDeleteStatus} */
  statuses: SavedObjectsBulkDeleteStatus[];
}
