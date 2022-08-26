/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectError } from '@kbn/core-saved-objects-common';

/** @public */
export interface SavedObjectsBulkDeleteObject {
  type: string;
  id: string;
}

/** @public */
export interface SavedObjectsBulkDeleteOptions {
  namespace?: string;
  force?: boolean;
}

/** @public */
export interface SavedObjectsBulkDeleteItemResponse {
  id: string;
  type: string;
  success: boolean;
  error?: SavedObjectError | Error;
}

/** @public */
export interface SavedObjectsBulkDeleteResponse {
  statuses: SavedObjectsBulkDeleteItemResponse[];
}
