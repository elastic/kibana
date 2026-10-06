/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { TimefilterSetup } from '../timefilter';
import type { FilterManager } from '../filter_manager';
import type { QueryState } from '../query_state';
import type { QueryStateChange } from './types';
import type { QueryStringContract } from '../query_string';
export type QueryState$ = Observable<{
  changes: QueryStateChange;
  state: QueryState;
}>;
export declare function createQueryStateObservable({
  timefilter,
  filterManager,
  queryString,
}: {
  timefilter: TimefilterSetup;
  filterManager: FilterManager;
  queryString: QueryStringContract;
}): QueryState$;
