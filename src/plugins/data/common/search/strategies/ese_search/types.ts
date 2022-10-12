/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISearchOptions } from '../../types';

export const ENHANCED_ES_SEARCH_STRATEGY = 'ese';

export interface IAsyncSearchOptions extends ISearchOptions {
  /**
   * number or `backoff` string literal
   * A number means a fixed timeout to wait between receiving a response and sending another request,
   * `backoff` (default) means to use a dynamic strategy with backing off from 1 to 5 seconds timeouts as request gets longer
   */
  pollInterval?: number | 'backoff';
}
