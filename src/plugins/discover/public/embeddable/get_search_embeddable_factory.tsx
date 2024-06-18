/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit, pick } from 'lodash';
import React, { useCallback, useEffect, useMemo } from 'react';
import deepEqual from 'react-fast-compare';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import { CellActionsProvider } from '@kbn/cell-actions';
import { APPLY_FILTER_TRIGGER, generateFilters } from '@kbn/data-plugin/public';
import { SEARCH_EMBEDDABLE_TYPE, SHOW_FIELD_STATISTICS } from '@kbn/discover-utils';
import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { FilterStateStore } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { SerializedPanelState } from '@kbn/presentation-containers';
import {
  FetchContext,
  initializeTimeRange,
  initializeTitles,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { toSavedSearchAttributes, VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { SavedSearchUnwrapResult } from '@kbn/saved-search-plugin/public';
import { SearchResponseIncompleteWarning } from '@kbn/search-response-warnings/src/types';

import { extract, inject } from '../../common/embeddable/search_inject_extract';
import { getValidViewMode } from '../application/main/utils/get_valid_view_mode';
import { DiscoverServices } from '../build_services';
import { SearchEmbeddablFieldStatsTableComponent } from './components/search_embeddable_field_stats_table_component';
import { SearchEmbeddableGridComponent } from './components/search_embeddable_grid_component';
import { EDITABLE_PANEL_KEYS, EDITABLE_SAVED_SEARCH_KEYS } from './constants';
import { initializeEditApi } from './initialize_edit_api';
import { initializeFetch, isEsqlMode } from './initialize_fetch';
import { initializeSearchEmbeddableApi } from './initialize_search_embeddable_api';
import {
  SearchEmbeddableApi,
  SearchEmbeddableRuntimeState,
  SearchEmbeddableSerializedState,
} from './types';

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
  const { get, save, checkForDuplicateTitle } = discoverServices.savedSearch;
  const { toSavedSearch } = discoverServices.savedSearch.byValue;

  const savedSearchEmbeddableFactory: ReactEmbeddableFactory<
    SearchEmbeddableSerializedState,
    SearchEmbeddableApi,
    SearchEmbeddableRuntimeState
  > = {
    type: SEARCH_EMBEDDABLE_TYPE,
    deserializeState: async (serializedState) => {
      const panelState = pick(serializedState.rawState, EDITABLE_PANEL_KEYS);
      const savedObjectId = serializedState.rawState.savedObjectId;
      if (savedObjectId) {
        // by reference
        const so = await get(savedObjectId, true);
        const savedObjectOverride = pick(serializedState.rawState, EDITABLE_SAVED_SEARCH_KEYS);
        return {
          // ignore the time range from the saved object - only global time range + panel time range matter
          ...omit(so, 'timeRange'),
          savedObjectId,
          savedObjectTitle: so.title,
          savedObjectDescription: so.description,
          // Overwrite SO state with dashboard state for title, description, columns, sort, etc.
          ...panelState,
          ...savedObjectOverride,
        };
      } else {
        // by value
        const savedSearch = await toSavedSearch(
          undefined,
          inject(
            serializedState.rawState as EmbeddableStateWithType,
            serializedState.references ?? []
          ) as SavedSearchUnwrapResult,
          true
        );
        return {
          ...savedSearch,
          ...panelState,
        };
      }
    },
    buildEmbeddable: async (initialState, buildApi, uuid, parentApi) => {
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(initialState);
      const {
        serialize: serializeTimeRange,
        api: timeRangeApi,
        comparators: timeRangeComparators,
      } = initializeTimeRange(initialState);
      const defaultPanelTitle$ = new BehaviorSubject<string | undefined>(
        initialState?.savedObjectTitle
      );
      const defaultPanelDescription$ = new BehaviorSubject<string | undefined>(
        initialState?.savedObjectDescription
      );
      const savedObjectId$ = new BehaviorSubject<string | undefined>(initialState?.savedObjectId);
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const fetchContext$ = new BehaviorSubject<FetchContext | undefined>(undefined);
      const fetchWarnings$ = new BehaviorSubject<SearchResponseIncompleteWarning[]>([]);

      const {
        searchEmbeddableApi,
        searchEmbeddableComparators,
        searchEmbeddableStateManager,
        cleanup,
      } = await initializeSearchEmbeddableApi(initialState, { discoverServices });

      const solutionNavId = await firstValueFrom(
        discoverServices.core.chrome.getActiveSolutionNavId$()
      );
      await discoverServices.profilesManager.resolveRootProfile({ solutionNavId });

      const serializeState = async (): Promise<
        SerializedPanelState<SearchEmbeddableSerializedState>
      > => {
        const savedSearch = searchEmbeddableApi.savedSearch$.getValue();
        const searchSource = savedSearch.searchSource;
        const { searchSourceJSON, references: originalReferences } = searchSource.serialize();
        const savedSearchAttributes = toSavedSearchAttributes(savedSearch, searchSourceJSON);

        const savedObjectId = savedObjectId$.getValue();
        if (savedObjectId) {
          // only save the current state that is **different** than the initial state
          const overwriteState = EDITABLE_SAVED_SEARCH_KEYS.reduce((prev, key) => {
            if (
              deepEqual(
                savedSearchAttributes[key],
                initialState[key as keyof SearchEmbeddableRuntimeState]
              )
            ) {
              return prev;
            }
            return { ...prev, [key]: savedSearchAttributes[key] };
          }, {});

          return {
            rawState: {
              savedObjectId,
              // Serialize the current dashboard state into the panel state **without** updating the saved object
              ...serializeTitles(),
              ...serializeTimeRange(),
              ...overwriteState,
            },
            // No references to extract for by-reference embeddable since all references are stored with by-reference saved object
            references: [],
          };
        }

        const { state, references } = extract({
          id: uuid,
          type: SEARCH_EMBEDDABLE_TYPE,
          attributes: {
            ...savedSearchAttributes,
            references: originalReferences,
          },
        });

        return {
          rawState: {
            ...serializeTitles(),
            ...serializeTimeRange(),
            ...(state as unknown as SearchEmbeddableSerializedState),
          },
          references,
        };
      };

      const api: SearchEmbeddableApi = buildApi(
        {
          ...titlesApi,
          ...searchEmbeddableApi,
          ...timeRangeApi,
          ...initializeEditApi({
            uuid,
            parentApi,
            partialApi: { ...searchEmbeddableApi, fetchContext$, savedObjectId: savedObjectId$ },
            discoverServices,
            isEditable: startServices.isEditable,
          }),
          dataLoading: dataLoading$,
          blockingError: blockingError$,
          savedObjectId: savedObjectId$,
          defaultPanelTitle: defaultPanelTitle$,
          defaultPanelDescription: defaultPanelDescription$,
          // getByValueRuntimeSnapshot: () => {
          //   const savedSearch = searchEmbeddableApi.getSavedSearch();
          //   return {
          //     ...omit(savedSearch, 'searchSource'),
          //     serializedSearchSource: savedSearch.searchSource.getSerializedFields(),
          //   };
          // },
          hasTimeRange: () => {
            const fetchContext = fetchContext$.getValue();
            return fetchContext?.timeslice !== undefined || fetchContext?.timeRange !== undefined;
          },
          getTypeDisplayName: () =>
            i18n.translate('discover.embeddable.search.displayName', {
              defaultMessage: 'search',
            }),
          canLinkToLibrary: async () => {
            return (
              discoverServices.capabilities.discover.save && !Boolean(savedObjectId$.getValue())
            );
          },
          canUnlinkFromLibrary: async () => Boolean(savedObjectId$.getValue()),
          libraryId$: savedObjectId$,
          saveToLibrary: async (title: string) => {
            const savedObjectId = await save({
              ...api.savedSearch$.getValue(),
              title,
            });
            defaultPanelTitle$.next(title);
            savedObjectId$.next(savedObjectId!);
            return savedObjectId!;
          },
          checkForDuplicateTitle: (newTitle, isTitleDuplicateConfirmed, onTitleDuplicate) =>
            checkForDuplicateTitle({
              newTitle,
              isTitleDuplicateConfirmed,
              onTitleDuplicate,
            }),
          unlinkFromLibrary: () => {
            savedObjectId$.next(undefined);
            if ((titlesApi.panelTitle.getValue() ?? '').length === 0) {
              titlesApi.setPanelTitle(defaultPanelTitle$.getValue());
            }
            if ((titlesApi.panelDescription.getValue() ?? '').length === 0) {
              titlesApi.setPanelDescription(defaultPanelDescription$.getValue());
            }
            defaultPanelTitle$.next(undefined);
            defaultPanelDescription$.next(undefined);
          },
          serializeState,
        },
        {
          ...titleComparators,
          ...timeRangeComparators,
          ...searchEmbeddableComparators,
          savedObjectId: [savedObjectId$, (value) => savedObjectId$.next(value)],
          savedObjectTitle: [defaultPanelTitle$, (value) => defaultPanelTitle$.next(value)],
          savedObjectDescription: [
            defaultPanelDescription$,
            (value) => defaultPanelDescription$.next(value),
          ],
        }
      );

      const unsubscribeFromFetch = initializeFetch({
        api: {
          ...api,
          dataLoading: dataLoading$,
          blockingError: blockingError$,
          fetchContext$,
          fetchWarnings$,
        },
        discoverServices,
        stateManager: searchEmbeddableStateManager,
      });

      return {
        api,
        Component: () => {
          const [savedSearch, dataViews, columns] = useBatchedPublishingSubjects(
            api.savedSearch$,
            api.dataViews,
            searchEmbeddableStateManager.columns
          );

          useEffect(() => {
            return () => {
              cleanup();
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

          const onAddFilter = useCallback(
            async (field, value, operator) => {
              if (!dataView) return;

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
              discoverServices.uiSettings.get(SHOW_FIELD_STATISTICS) &&
              viewMode === VIEW_MODE.AGGREGATED_LEVEL &&
              dataView &&
              Array.isArray(columns),
            [columns, dataView, viewMode]
          );

          return (
            <KibanaRenderContextProvider {...discoverServices.core}>
              <KibanaContextProvider services={discoverServices}>
                {renderAsFieldStatsTable ? (
                  <SearchEmbeddablFieldStatsTableComponent
                    api={{
                      ...api,
                      fetchContext$,
                    }}
                    dataView={dataView!}
                    onAddFilter={onAddFilter}
                    stateManager={searchEmbeddableStateManager}
                  />
                ) : (
                  <CellActionsProvider
                    getTriggerCompatibleActions={
                      discoverServices.uiActions.getTriggerCompatibleActions
                    }
                  >
                    <SearchEmbeddableGridComponent
                      api={{ ...api, fetchWarnings$ }}
                      dataView={dataView!}
                      onAddFilter={isEsqlMode(savedSearch) ? undefined : onAddFilter}
                      stateManager={searchEmbeddableStateManager}
                    />
                  </CellActionsProvider>
                )}
              </KibanaContextProvider>
            </KibanaRenderContextProvider>
          );
        },
      };
    },
  };

  return savedSearchEmbeddableFactory;
};
