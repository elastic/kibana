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
import { getTimeRangeFromFetchContext } from '../utils/update_search_source';

export interface ChangePointGridSearchRequest {
  timeRange: TimeRange;
  filters: Filter[];
  inputQuery?: Query;
  esqlVariables: ESQLControlVariable[];
  isApproximate: boolean;
  projectRouting: FetchContext['projectRouting'];
  searchSessionId?: string;
}

const isSameTimeRange = (left?: TimeRange, right?: TimeRange): boolean =>
  left?.from === right?.from && left?.to === right?.to;

/**
 * A following panel uses the dashboard context. A static panel keeps the filters, query, and
 * variables captured in Discover, and searches again only when its effective time range changes
 * or the dashboard refreshes. The effective range is the dashboard time slider when one is
 * selected, otherwise the panel time range that `fetch$` chose over the dashboard time range.
 */
export const resolveChangePointGridSearchRequest = ({
  state,
  fetchContext,
  previousTimeRange,
}: {
  state: ChangePointGridEmbeddableState;
  fetchContext: FetchContext;
  previousTimeRange?: TimeRange;
}): ChangePointGridSearchRequest | undefined => {
  const timeRange = getTimeRangeFromFetchContext(fetchContext);
  if (!timeRange) {
    return undefined;
  }

  const isStatic = state.apply_dashboard_context === false;
  if (
    isStatic &&
    previousTimeRange &&
    isSameTimeRange(previousTimeRange, timeRange) &&
    !fetchContext.isReload
  ) {
    return undefined;
  }

  if (isStatic) {
    const staticContext = state.static_context;
    return {
      timeRange,
      filters: (toStoredFilters(staticContext?.filters) ?? []) as Filter[],
      inputQuery: toStoredQuery(staticContext?.query),
      esqlVariables: staticContext?.esql_variables ?? [],
      isApproximate: false,
      projectRouting: fetchContext.projectRouting,
      searchSessionId: fetchContext.searchSessionId,
    };
  }

  return {
    timeRange,
    filters: fetchContext.filters ?? [],
    inputQuery: isOfQueryType(fetchContext.query) ? fetchContext.query : undefined,
    esqlVariables: fetchContext.esqlVariables ?? [],
    isApproximate: fetchContext.isApproximate,
    projectRouting: fetchContext.projectRouting,
    searchSessionId: fetchContext.searchSessionId,
  };
};
