/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectError } from '@kbn/core-saved-objects-common';

/**
 * Options for bulk delete operation
 *
 * @public
 * @deprecated See https://github.com/elastic/kibana/issues/149098
 */
export interface SavedObjectsBulkDeleteOptions {
  /** Force deletion of any objects that exist in multiple namespaces (default=false) */
  force?: boolean;
}

/**
 * Single item within the statuses array of the bulk delete response
 *
 * @public
 * @deprecated See https://github.com/elastic/kibana/issues/149098
 */
export interface SavedObjectsBulkDeleteResponseItem {
  /** saved object id */
  id: string;
  /** saved object type */
  type: string;
  /** true if the delete operation succeeded*/
  success: boolean;
  /** error from delete operation (undefined if no error) */
  error?: SavedObjectError;
}

/**
 * Return type of the Saved Objects `bulkDelete()` method.
 *
 * @public
 * @deprecated See https://github.com/elastic/kibana/issues/149098
 */
export interface SavedObjectsBulkDeleteResponse {
  /** array of statuses per object */
  statuses: SavedObjectsBulkDeleteResponseItem[];
}
