/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { Observable } from 'rxjs';
import { combineLatest, debounceTime, map } from 'rxjs';
import type { ChainingContext } from './chaining';
import type { ControlGroupFetchContext } from './control_group_fetch';

export interface ControlFetchContext {
  filters?: Filter[] | undefined;
  query?: Query | AggregateQuery | undefined;
  timeRange?: TimeRange | undefined;
  esqlVariables?: ESQLControlVariable[] | undefined;
}

export function controlFetch$(
  chaining$: Observable<ChainingContext>,
  controlGroupFetch$: Observable<ControlGroupFetchContext>,
  esqlVariables$: Observable<ESQLControlVariable[]>
): Observable<ControlFetchContext> {
  return combineLatest([chaining$, controlGroupFetch$, esqlVariables$]).pipe(
    debounceTime(0),
    map(([chainingContext, controlGroupFetchContext, esqlVariables]) => {
      const filters = [];
      if (controlGroupFetchContext.unifiedSearchFilters) {
        filters.push(...controlGroupFetchContext.unifiedSearchFilters);
      }
      if (chainingContext.chainingFilters) {
        filters.push(...chainingContext.chainingFilters);
      }

      return {
        filters,
        query: controlGroupFetchContext.query,
        timeRange: chainingContext.timeRange ?? controlGroupFetchContext.timeRange,
        esqlVariables,
      };
    })
  );
}
