/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';

import { CellActionsProvider } from '@kbn/cell-actions';
import { APPLY_FILTER_TRIGGER, generateFilters } from '@kbn/data-plugin/public';
import { SEARCH_EMBEDDABLE_TYPE, SHOW_FIELD_STATISTICS } from '@kbn/discover-utils';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { FilterStateStore } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { SerializedPanelState } from '@kbn/presentation-containers';
import {
  apiHasAppContext,
  apiHasParentApi,
  FetchContext,
  initializeTitles,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { toSavedSearchAttributes, VIEW_MODE } from '@kbn/saved-search-plugin/common';

import { SavedSearchUnwrapResult } from '@kbn/saved-search-plugin/public';
import { extract, inject } from '../../common/embeddable/search_inject_extract';
import { getValidViewMode } from '../application/main/utils/get_valid_view_mode';
import { DiscoverServices } from '../build_services';
import { SearchEmbeddablFieldStatsTableComponent } from './components/search_embeddable_field_stats_table_component';
import { SearchEmbeddableGridComponent } from './components/search_embeddable_grid_component';
import { initializeFetch, isEsqlMode } from './initialize_fetch';
import { initializeSearchEmbeddableApi } from './initialize_search_embeddable_api';
import {
  SearchEmbeddableApi,
  SearchEmbeddableRuntimeState,
  SearchEmbeddableSerializedState,
} from './types';
import { getDiscoverLocatorParams } from './utils/get_discover_locator_params';

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
      console.log('serializedState', serializedState);
      const savedObjectId = serializedState.rawState.savedObjectId;
      if (savedObjectId) {
        const so = await get(savedObjectId);
        return {
          ...so,
          savedObjectId,
          savedObjectTitle: so.title,
          savedObjectDescription: so.description,
          title: serializedState?.rawState.title, // panel title
          description: serializedState?.rawState.description, // panel description
        };
      }

      const savedSearch = await toSavedSearch(
        undefined,
        inject(
          serializedState.rawState,
          serializedState.references ?? []
        ) as SavedSearchUnwrapResult
      );
      return { ...savedSearch, savedObjectId };
    },
    buildEmbeddable: async (initialState, buildApi, uuid) => {
      console.log('initialState', initialState);
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(initialState);
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

      const { searchEmbeddableApi, searchEmbeddableComparators, searchEmbeddableStateManager } =
        await initializeSearchEmbeddableApi(initialState, { discoverServices });

      const serializeState = async (
        title?: string
      ): Promise<SerializedPanelState<SearchEmbeddableSerializedState>> => {
        const savedObjectId = savedObjectId$.getValue();
        if (savedObjectId) {
          const id = await save({
            ...searchEmbeddableApi.getSavedSearch(),
            id: savedObjectId,
            title: title ?? defaultPanelTitle$.getValue(),
            description: defaultPanelDescription$.getValue(),
          });
          return { rawState: { savedObjectId: id, ...serializeTitles() }, references: [] };
        } else {
          const searchSource = searchEmbeddableApi.searchSource$.getValue();
          const { searchSourceJSON, references: originalReferences } = searchSource.serialize();
          const savedSearchAttributes = toSavedSearchAttributes(
            searchEmbeddableApi.getSavedSearch(),
            searchSourceJSON
          );
          const { rawState, references } = extract({
            attributes: {
              ...savedSearchAttributes,
              references: originalReferences,
            },
          });
          return {
            rawState: {
              ...serializeTitles(),
              ...(rawState as unknown as SearchEmbeddableSerializedState),
            },
            references,
          };
        }
      };

      const getAppTarget = async () => {
        const savedObjectId = fetchContext$.getValue()?.searchSessionId;
        const dataViews = searchEmbeddableApi.dataViews.getValue();
        const locatorParams = getDiscoverLocatorParams(searchEmbeddableApi);

        // We need to use a redirect URL if this is a by value saved search using
        // an ad hoc data view to ensure the data view spec gets encoded in the URL
        const useRedirect = !savedObjectId && !dataViews?.[0]?.isPersisted();
        const editUrl = useRedirect
          ? discoverServices.locator.getRedirectUrl(locatorParams)
          : await discoverServices.locator.getUrl(locatorParams);
        const editPath = discoverServices.core.http.basePath.remove(editUrl);
        const editApp = useRedirect ? 'r' : 'discover';
        return { path: editPath, app: editApp };
      };

      const api: SearchEmbeddableApi = buildApi(
        {
          ...titlesApi,
          ...searchEmbeddableApi,
          dataLoading: dataLoading$,
          blockingError: blockingError$,
          savedObjectId: savedObjectId$,
          defaultPanelTitle: defaultPanelTitle$,
          defaultPanelDescription: defaultPanelDescription$,
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
              ...searchEmbeddableApi.getSavedSearch(),
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
          ...searchEmbeddableComparators,
          savedObjectId: [savedObjectId$, (value) => savedObjectId$.next(value)],
          savedObjectTitle: [defaultPanelTitle$, (value) => defaultPanelTitle$.next(value)],
          savedObjectDescription: [
            defaultPanelDescription$,
            (value) => defaultPanelDescription$.next(value),
          ],
        }
      );

      /**
       * If the parent is providing context, then the embeddable state transfer service can be used
       * and editing should be allowed; otherwise, do not provide editing capabilities
       */
      const parentApiContext =
        apiHasParentApi(api) && apiHasAppContext(api.parentApi)
          ? api.parentApi.getAppContext()
          : undefined;
      if (parentApiContext) {
        api.isEditingEnabled = startServices.isEditable;
        api.onEdit = async () => {
          const stateTransfer = discoverServices.embeddable.getStateTransfer();
          const appTarget = await getAppTarget();
          await stateTransfer.navigateToEditor(appTarget.app, {
            path: appTarget.path,
            state: {
              embeddableId: uuid,
              valueInput: searchEmbeddableApi.getSavedSearch(),
              originatingApp: parentApiContext.currentAppId,
              searchSessionId: fetchContext$.getValue()?.searchSessionId,
              originatingPath: parentApiContext.getCurrentPath?.(),
            },
          });
        };
        api.getEditHref = async () => {
          return (await getAppTarget())?.path;
        };
      }

      const unsubscribeFromFetch = initializeFetch({
        api: {
          ...api,
          dataLoading: dataLoading$,
          blockingError: blockingError$,
          fetchContext$,
          rows$: searchEmbeddableApi.rows$,
        },
        discoverServices,
      });

      return {
        api,
        Component: () => {
          // const searchSource = useStateFromPublishingSubject(searchEmbeddableApi.dataViews);
          const [dataViews, columns, searchSource, savedSearchViewMode] =
            useBatchedPublishingSubjects(
              searchEmbeddableApi.dataViews,
              searchEmbeddableApi.columns$,
              searchEmbeddableApi.searchSource$,
              searchEmbeddableApi.savedSearchViewMode$
            );

          useEffect(() => {
            return () => {
              unsubscribeFromFetch();
            };
          }, []);

          const viewMode = useMemo(() => {
            return getValidViewMode({
              viewMode: savedSearchViewMode,
              isEsqlMode: isEsqlMode({ searchSource }),
            });
          }, [savedSearchViewMode, searchSource]);

          const onAddFilter = useCallback(
            async (field, value, operator) => {
              const dataView = dataViews?.[0];
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
            [dataViews]
          );

          const renderAsFieldStatsTable = useMemo(
            () =>
              discoverServices.uiSettings.get(SHOW_FIELD_STATISTICS) &&
              viewMode === VIEW_MODE.AGGREGATED_LEVEL &&
              dataViews?.[0] &&
              Array.isArray(columns),
            [dataViews, columns, viewMode]
          );

          return (
            // <KibanaRenderContextProvider {...discoverServices.core}>
            <KibanaContextProvider services={discoverServices}>
              {renderAsFieldStatsTable ? (
                <SearchEmbeddablFieldStatsTableComponent
                  api={{
                    ...api,
                    fetchContext$,
                    // savedSearch$: searchEmbeddableApi.savedSearch$,
                  }}
                  onAddFilter={onAddFilter}
                />
              ) : (
                <CellActionsProvider
                  getTriggerCompatibleActions={
                    discoverServices.uiActions.getTriggerCompatibleActions
                  }
                >
                  <SearchEmbeddableGridComponent
                    api={api}
                    onAddFilter={onAddFilter}
                    stateManager={searchEmbeddableStateManager}
                  />
                </CellActionsProvider>
              )}
            </KibanaContextProvider>
            // </KibanaRenderContextProvider>
          );
        },
      };
    },
  };

  return savedSearchEmbeddableFactory;
};
