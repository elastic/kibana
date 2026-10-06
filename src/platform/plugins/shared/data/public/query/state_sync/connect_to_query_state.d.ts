/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterStateStore } from '@kbn/es-query';
import type { BaseStateContainer } from '@kbn/kibana-utils-plugin/public';
import type { QuerySetup, QueryStart } from '../query_service';
import type { QueryState } from '../query_state';
/**
 * Helper to setup two-way syncing of global data and a state container
 * @param QueryService: either setup or start
 * @param stateContainer to use for syncing
 */
export declare const connectToQueryState: <S extends QueryState>(
  {
    timefilter: { timefilter },
    filterManager,
    queryString,
    state$,
  }: Pick<QueryStart | QuerySetup, 'timefilter' | 'filterManager' | 'queryString' | 'state$'>,
  stateContainer: BaseStateContainer<S>,
  syncConfig: {
    time?: boolean;
    refreshInterval?: boolean;
    filters?: FilterStateStore | boolean;
    query?: boolean;
  }
) => () => void;
