/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchSourceSearchOptions } from '../../search_source/types';

export const ENHANCED_ES_SEARCH_STRATEGY = 'ese';

export interface IAsyncSearchOptions extends SearchSourceSearchOptions {
  /**
   * The number of milliseconds to wait between receiving a response and sending another request
   * If not provided, then a default 1 second interval with back-off up to 5 seconds interval is used
   */
  pollInterval?: number;
}
