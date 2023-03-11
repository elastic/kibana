/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsBaseOptions } from './base';

/**
 * Options for the close point-in-time operation
 *
 * @public
 */
export type SavedObjectsClosePointInTimeOptions = SavedObjectsBaseOptions;

/**
 * Return type of the Saved Objects `closePointInTime()` method.
 *
 * @public
 */
export interface SavedObjectsClosePointInTimeResponse {
  /** If true, all search contexts associated with the PIT id are successfully closed */
  succeeded: boolean;
  /** The number of search contexts that have been successfully closed */
  num_freed: number;
}
