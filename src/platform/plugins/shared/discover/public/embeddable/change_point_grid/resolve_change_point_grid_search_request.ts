/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { isOfQueryType } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { FetchContext } from '@kbn/presentation-publishing';
import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import { toStoredQuery } from '@kbn/as-code-shared-transforms';
import type { ChangePointGridEmbeddableState } from '../../../server/embeddable/change_point_grid_schema';

export interface ChangePointGridSearchRequest {
  timeRange: TimeRange;
  filters: Filter[];
  inputQuery?: Query;
  esqlVariables: ESQLControlVariable[];
  isApproximate: boolean;
  projectRouting: FetchContext['projectRouting'];
  searchSessionId?: string;
}

/**
 * A following panel uses the dashboard context. A static panel uses the context captured in
 * Discover, except on the first search and on an explicit dashboard refresh.
 */
export const resolveChangePointGridSearchRequest = ({
  state,
  fetchContext,
  hasSearched,
}: {
  state: ChangePointGridEmbeddableState;
  fetchContext: FetchContext;
  hasSearched: boolean;
}): ChangePointGridSearchRequest | undefined => {
  const isStatic = state.apply_dashboard_context === false;
  if (isStatic && hasSearched && !fetchContext.isReload) {
    return undefined;
  }

  if (isStatic) {
    const staticContext = state.static_context;
    if (!staticContext?.time_range) {
      return undefined;
    }
    return {
      timeRange: staticContext.time_range,
      filters: (toStoredFilters(staticContext.filters) ?? []) as Filter[],
      inputQuery: toStoredQuery(staticContext.query),
      esqlVariables: staticContext.esql_variables ?? [],
      isApproximate: false,
      projectRouting: fetchContext.projectRouting,
      searchSessionId: fetchContext.searchSessionId,
    };
  }

  if (!fetchContext.timeRange) {
    return undefined;
  }

  return {
    timeRange: fetchContext.timeRange,
    filters: fetchContext.filters ?? [],
    inputQuery: isOfQueryType(fetchContext.query) ? fetchContext.query : undefined,
    esqlVariables: fetchContext.esqlVariables ?? [],
    isApproximate: fetchContext.isApproximate,
    projectRouting: fetchContext.projectRouting,
    searchSessionId: fetchContext.searchSessionId,
  };
};
