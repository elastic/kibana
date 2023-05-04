/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SimpleSavedObject } from '../simple_saved_object';

/**
 * Batch response for simple saved objects
 *
 * @public
 * @deprecated See https://github.com/elastic/kibana/issues/149098
 */
export interface SavedObjectsBatchResponse<T = unknown> {
  /** Array of simple saved objects */
  savedObjects: Array<SimpleSavedObject<T>>;
}
