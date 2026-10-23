/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildChangePointCards, type ChangePointCardModel } from '@kbn/change-point-chart-viewer';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import { unregisterFromDataViewsCache } from '@kbn/data-source';
import { fetch$ } from '@kbn/presentation-publishing';
import type { BehaviorSubject } from 'rxjs';
import { CHANGE_POINT_GRID_MAX_SERIES } from '../../../common';
import { FetchStatus } from '../../application/types';
import { fetchEsql } from '../../application/main/data_fetching/fetch_esql';
import { resolveEsqlSource } from '../../application/main/data_fetching/resolve_esql_source';
import type { DiscoverServices } from '../../build_services';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../context_awareness';
import { getEsqlDatatableFromDocuments } from '../../utils/get_esql_datatable_from_documents';
import type { ChangePointGridEmbeddableState } from '../../../server/embeddable/change_point_grid_schema';
import type { ChangePointGridSearchRequest } from './resolve_change_point_grid_search_request';
import { resolveChangePointGridSearchRequest } from './resolve_change_point_grid_search_request';

export const initializeChangePointGridFetch = ({
  api,
  state,
  discoverServices,
  cards$,
  searchContext$,
  onCardsUpdated,
  setDataLoading,
  setDataViews,
  setSearchError,
  setApproximationApplied,
}: {
  api: unknown;
  state: ChangePointGridEmbeddableState;
  discoverServices: DiscoverServices;
  cards$: BehaviorSubject<ChangePointCardModel[] | undefined>;
  searchContext$: BehaviorSubject<ChangePointGridSearchRequest | undefined>;
  onCardsUpdated: () => void;
  setDataLoading: (loading: boolean) => void;
  setDataViews: (dataViews: DataView[] | undefined) => void;
  setSearchError: (error: Error | undefined) => void;
  setApproximationApplied: (applied: boolean | undefined) => void;
}) => {
  const scopedProfilesManager = discoverServices.profilesManager.createScopedProfilesManager({
    scopedEbtManager: discoverServices.ebtManager.createScopedEBTManager(),
    toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
  });
  let abortController: AbortController | undefined;
  let esqlSourceId: string | undefined;
  let previousTimeRange: TimeRange | undefined;
  let requestId = 0;

  const subscription = fetch$(api).subscribe((fetchContext) => {
    const searchRequest = resolveChangePointGridSearchRequest({
      state,
      fetchContext,
      previousTimeRange,
    });
    if (!searchRequest) {
      return;
    }
    previousTimeRange = searchRequest.timeRange;
    searchContext$.next(searchRequest);

    abortController?.abort();
    abortController = new AbortController();
    const currentAbortController = abortController;
    const currentRequestId = ++requestId;
    setDataLoading(true);
    setSearchError(undefined);
    setApproximationApplied(undefined);

    const run = async () => {
      const { esqlSource, dataView } = await resolveEsqlSource({
        esql: state.esql,
        services: discoverServices,
        esqlVariables: searchRequest.esqlVariables,
        timeRange: searchRequest.timeRange,
        previousSourceId: esqlSourceId,
        projectRoutingFallback: searchRequest.projectRouting,
      });
      // resolveEsqlSource registers the source before returning. A slower request must not
      // replace the source already being used by a newer search.
      if (currentRequestId !== requestId || currentAbortController.signal.aborted) {
        if (esqlSource.id !== esqlSourceId) {
          discoverServices.dataSourceService.unregisterEsqlSource(esqlSource.id);
          unregisterFromDataViewsCache(esqlSource.id);
        }
        return;
      }
      esqlSourceId = esqlSource.id;
      setDataViews([dataView]);
      const result = await fetchEsql({
        query: { esql: state.esql },
        inputQuery: searchRequest.inputQuery,
        filters: searchRequest.filters,
        timeRange: searchRequest.timeRange,
        esqlSource,
        abortSignal: currentAbortController.signal,
        inspectorAdapters: {},
        data: discoverServices.data,
        expressions: discoverServices.expressions,
        scopedProfilesManager,
        esqlVariables: searchRequest.esqlVariables,
        searchSessionId: searchRequest.searchSessionId,
        projectRouting: searchRequest.projectRouting,
        esqlApproximation: searchRequest.isApproximate,
      });
      if (currentRequestId !== requestId || currentAbortController.signal.aborted) {
        return;
      }
      setApproximationApplied(result.approximationApplied);
      const { table } = getEsqlDatatableFromDocuments({
        documentsValue: {
          fetchStatus: FetchStatus.COMPLETE,
          result: result.records,
          dataSource: result.dataSource,
          query: { esql: state.esql },
          approximationApplied: result.approximationApplied,
        },
      });
      const cards = buildChangePointCards({ table, esql: state.esql }) ?? [];
      cards$.next(cards.slice(0, CHANGE_POINT_GRID_MAX_SERIES));
      onCardsUpdated();
    };

    run()
      .catch((error: unknown) => {
        if (currentRequestId !== requestId || currentAbortController.signal.aborted) {
          return;
        }
        setSearchError(error instanceof Error ? error : new Error(String(error)));
        setApproximationApplied(undefined);
      })
      .finally(() => {
        if (currentRequestId === requestId) {
          setDataLoading(false);
        }
      });
  });

  return {
    cleanup: () => {
      requestId++;
      abortController?.abort();
      subscription.unsubscribe();
      if (esqlSourceId) {
        discoverServices.dataSourceService.unregisterEsqlSource(esqlSourceId);
        unregisterFromDataViewsCache(esqlSourceId);
      }
    },
  };
};
