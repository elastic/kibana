/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import { CellActionsProvider } from '@kbn/cell-actions';
import { APPLY_FILTER_TRIGGER, generateFilters } from '@kbn/data-plugin/public';
import { SEARCH_EMBEDDABLE_TYPE, SHOW_FIELD_STATISTICS } from '@kbn/discover-utils';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { FilterStateStore } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  FetchContext,
  getUnchangingComparator,
  initializeTimeRange,
  initializeTitleManager,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { SearchResponseIncompleteWarning } from '@kbn/search-response-warnings/src/types';

import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { getValidViewMode } from '../application/main/utils/get_valid_view_mode';
import { DiscoverServices } from '../build_services';
import { SearchEmbeddablFieldStatsTableComponent } from './components/search_embeddable_field_stats_table_component';
import { SearchEmbeddableGridComponent } from './components/search_embeddable_grid_component';
import { initializeEditApi } from './initialize_edit_api';
import { initializeFetch, isEsqlMode } from './initialize_fetch';
import { initializeSearchEmbeddableApi } from './initialize_search_embeddable_api';
import {
  NonPersistedDisplayOptions,
  SearchEmbeddableApi,
  SearchEmbeddableRuntimeState,
  SearchEmbeddableSerializedState,
} from './types';
import { deserializeState, serializeState } from './utils/serialization_utils';
import { BaseAppWrapper } from '../context_awareness';

export const getSearchEmbeddableFactory = ({
  startServices,
  discoverServices,
}: {
  startServices: {
    executeTriggerActions: (triggerId: string, context: object) => Promise<void>;
    isEditable: () => boolean;
  };
  discoverServices: DiscoverServices;
}) => {
  const { save, checkForDuplicateTitle } = discoverServices.savedSearch;

  const savedSearchEmbeddableFactory: ReactEmbeddableFactory<
    SearchEmbeddableSerializedState,
    SearchEmbeddableRuntimeState,
    SearchEmbeddableApi
  > = {
    type: SEARCH_EMBEDDABLE_TYPE,
    deserializeState: async (serializedState) => {
      return deserializeState({ serializedState, discoverServices });
    },
    buildEmbeddable: async (initialState, buildApi, uuid, parentApi) => {
      /** One Discover context awareness */
      const solutionNavId =
        initialState.nonPersistedDisplayOptions?.solutionNavIdOverride ??
        (await firstValueFrom(discoverServices.core.chrome.getActiveSolutionNavId$()));
      const { getRenderAppWrapper } = await discoverServices.profilesManager.resolveRootProfile({
        solutionNavId,
      });
      const AppWrapper = getRenderAppWrapper?.(BaseAppWrapper) ?? BaseAppWrapper;

      /** Specific by-reference state */
      const savedObjectId$ = new BehaviorSubject<string | undefined>(initialState?.savedObjectId);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(initialState?.savedObjectTitle);
      const defaultDescription$ = new BehaviorSubject<string | undefined>(
        initialState?.savedObjectDescription
      );

      /** By-value SavedSearchComponent package (non-dashboard contexts) state, to adhere to the comparator contract of an embeddable. */
      const nonPersistedDisplayOptions$ = new BehaviorSubject<
        NonPersistedDisplayOptions | undefined
      >(initialState?.nonPersistedDisplayOptions);

      /** All other state */
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const fetchContext$ = new BehaviorSubject<FetchContext | undefined>(undefined);
      const fetchWarnings$ = new BehaviorSubject<SearchResponseIncompleteWarning[]>([]);

      /** Build API */
      const titleManager = initializeTitleManager(initialState);
      const timeRange = initializeTimeRange(initialState);
      const searchEmbeddable = await initializeSearchEmbeddableApi(initialState, {
        discoverServices,
      });
      const unsubscribeFromFetch = initializeFetch({
        api: {
          parentApi,
          ...titleManager.api,
          ...timeRange.api,
          savedSearch$: searchEmbeddable.api.savedSearch$,
          dataViews$: searchEmbeddable.api.dataViews$,
          savedObjectId$,
          dataLoading$,
          blockingError$,
          fetchContext$,
          fetchWarnings$,
        },
        discoverServices,
        stateManager: searchEmbeddable.stateManager,
        setDataLoading: (dataLoading: boolean | undefined) => dataLoading$.next(dataLoading),
        setBlockingError: (error: Error | undefined) => blockingError$.next(error),
      });

      const serialize = (savedObjectId?: string) =>
        serializeState({
          uuid,
          initialState,
          savedSearch: searchEmbeddable.api.savedSearch$.getValue(),
          serializeTitles: titleManager.serialize,
          serializeTimeRange: timeRange.serialize,
          savedObjectId,
        });

      const api: SearchEmbeddableApi = buildApi(
        {
          ...titleManager.api,
          ...searchEmbeddable.api,
          ...timeRange.api,
          ...initializeEditApi({
            uuid,
            parentApi,
            partialApi: { ...searchEmbeddable.api, fetchContext$, savedObjectId$ },
            discoverServices,
            isEditable: startServices.isEditable,
          }),
          dataLoading$,
          blockingError$,
          savedObjectId$,
          defaultTitle$,
          defaultDescription$,
          hasTimeRange: () => {
            const fetchContext = fetchContext$.getValue();
            return fetchContext?.timeslice !== undefined || fetchContext?.timeRange !== undefined;
          },
          getTypeDisplayName: () =>
            i18n.translate('discover.embeddable.search.displayName', {
              defaultMessage: 'Discover session',
            }),
          canLinkToLibrary: async () => {
            return (
              discoverServices.capabilities.discover_v2.save && !Boolean(savedObjectId$.getValue())
            );
          },
          canUnlinkFromLibrary: async () => Boolean(savedObjectId$.getValue()),
          saveToLibrary: async (title: string) => {
            const savedObjectId = await save({
              ...api.savedSearch$.getValue(),
              title,
            });
            defaultTitle$.next(title);
            return savedObjectId!;
          },
          checkForDuplicateTitle: (newTitle, isTitleDuplicateConfirmed, onTitleDuplicate) =>
            checkForDuplicateTitle({
              newTitle,
              isTitleDuplicateConfirmed,
              onTitleDuplicate,
            }),
          getSerializedStateByValue: () => serialize(undefined),
          getSerializedStateByReference: (newId: string) => serialize(newId),
          serializeState: () => serialize(savedObjectId$.getValue()),
          getInspectorAdapters: () => searchEmbeddable.stateManager.inspectorAdapters.getValue(),
        },
        {
          ...titleManager.comparators,
          ...timeRange.comparators,
          ...searchEmbeddable.comparators,
          rawSavedObjectAttributes: getUnchangingComparator(),
          savedObjectId: [savedObjectId$, (value) => savedObjectId$.next(value)],
          savedObjectTitle: [defaultTitle$, (value) => defaultTitle$.next(value)],
          savedObjectDescription: [defaultDescription$, (value) => defaultDescription$.next(value)],
          nonPersistedDisplayOptions: [
            nonPersistedDisplayOptions$,
            (value) => nonPersistedDisplayOptions$.next(value),
          ],
        }
      );

      return {
        api,
        Component: () => {
          const [savedSearch, dataViews] = useBatchedPublishingSubjects(
            api.savedSearch$,
            api.dataViews$
          );

          useEffect(() => {
            return () => {
              searchEmbeddable.cleanup();
              unsubscribeFromFetch();
            };
          }, []);

          const viewMode = useMemo(() => {
            if (!savedSearch.searchSource) return;
            return getValidViewMode({
              viewMode: savedSearch.viewMode,
              isEsqlMode: isEsqlMode(savedSearch),
            });
          }, [savedSearch]);

          const dataView = useMemo(() => {
            const hasDataView = (dataViews ?? []).length > 0;
            if (!hasDataView) {
              blockingError$.next(
                new Error(
                  i18n.translate('discover.embeddable.search.dataViewError', {
                    defaultMessage: 'Missing data view {indexPatternId}',
                    values: {
                      indexPatternId:
                        typeof initialState.serializedSearchSource?.index === 'string'
                          ? initialState.serializedSearchSource.index
                          : initialState.serializedSearchSource?.index?.id ?? '',
                    },
                  })
                )
              );
              return;
            }
            return dataViews![0];
          }, [dataViews]);

          const onAddFilter = useCallback<DocViewFilterFn>(
            async (field, value, operator) => {
              if (!dataView || !field) return;

              let newFilters = generateFilters(
                discoverServices.filterManager,
                field,
                value,
                operator,
                dataView
              );
              newFilters = newFilters.map((filter) => ({
                ...filter,
                $state: { store: FilterStateStore.APP_STATE },
              }));

              await startServices.executeTriggerActions(APPLY_FILTER_TRIGGER, {
                embeddable: api,
                filters: newFilters,
              });
            },
            [dataView]
          );

          const renderAsFieldStatsTable = useMemo(
            () =>
              Boolean(discoverServices.uiSettings.get(SHOW_FIELD_STATISTICS)) &&
              viewMode === VIEW_MODE.AGGREGATED_LEVEL &&
              Boolean(dataView) &&
              Array.isArray(savedSearch.columns),
            [savedSearch, dataView, viewMode]
          );

          return (
            <KibanaRenderContextProvider {...discoverServices.core}>
              <KibanaContextProvider services={discoverServices}>
                <AppWrapper>
                  {renderAsFieldStatsTable ? (
                    <SearchEmbeddablFieldStatsTableComponent
                      api={{
                        ...api,
                        fetchContext$,
                      }}
                      dataView={dataView!}
                      onAddFilter={isEsqlMode(savedSearch) ? undefined : onAddFilter}
                      stateManager={searchEmbeddable.stateManager}
                    />
                  ) : (
                    <CellActionsProvider
                      getTriggerCompatibleActions={
                        discoverServices.uiActions.getTriggerCompatibleActions
                      }
                    >
                      <SearchEmbeddableGridComponent
                        api={{ ...api, fetchWarnings$, fetchContext$ }}
                        dataView={dataView!}
                        onAddFilter={
                          isEsqlMode(savedSearch) ||
                          initialState.nonPersistedDisplayOptions?.enableFilters === false
                            ? undefined
                            : onAddFilter
                        }
                        enableDocumentViewer={
                          initialState.nonPersistedDisplayOptions?.enableDocumentViewer !==
                          undefined
                            ? initialState.nonPersistedDisplayOptions?.enableDocumentViewer
                            : true
                        }
                        stateManager={searchEmbeddable.stateManager}
                      />
                    </CellActionsProvider>
                  )}
                </AppWrapper>
              </KibanaContextProvider>
            </KibanaRenderContextProvider>
          );
        },
      };
    },
  };

  return savedSearchEmbeddableFactory;
};
