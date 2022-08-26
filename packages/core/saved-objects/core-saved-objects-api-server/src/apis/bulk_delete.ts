/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectError } from '@kbn/core-saved-objects-common';
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
  refresh?: MutatingOperationRefreshSetting;
  force?: boolean;
}

/**
 * @public
 */
export interface SavedObjectsBulkDeleteStatus {
  id: string;
  type: string;
  success: boolean;
  error?: SavedObjectError;
}

/**
 * @public
 */
export interface SavedObjectsBulkDeleteResponse {
  statuses: SavedObjectsBulkDeleteStatus[];
}
