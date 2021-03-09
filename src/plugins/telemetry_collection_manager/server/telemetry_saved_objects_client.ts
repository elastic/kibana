/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsFindOptions, SavedObjectsFindResponse } from 'src/core/server';
import { SavedObjectsClient } from '../../../core/server';

/**
 * Extends the SavedObjectsClient to fit the telemetry fetching requirements (i.e.: find objects from all namespaces by default)
 */
export class TelemetrySavedObjectsClient extends SavedObjectsClient {
  /**
   * Find the SavedObjects matching the search query in all the Spaces by default
   * @param options
   */
  async find<T = unknown>(options: SavedObjectsFindOptions): Promise<SavedObjectsFindResponse<T>> {
    return super.find({ namespaces: ['*'], ...options });
  }
}
