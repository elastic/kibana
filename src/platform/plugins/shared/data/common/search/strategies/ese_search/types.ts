/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SearchSourceSearchOptions } from '../../search_source/types';

export const ENHANCED_ES_SEARCH_STRATEGY = 'ese';

export interface IAsyncSearchOptions extends SearchSourceSearchOptions {
  /**
   * The number of milliseconds to wait between receiving a response and sending another request
   * If not provided, then it defaults to 0 (no wait time)
   */
  pollInterval?: number;
  /**
   * The length of time to wait for results before initiating a new poll request.
   */
  pollLength?: string;
}
