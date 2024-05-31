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
  useStateFromPublishingSubject,
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
  const { attributeService, toSavedSearch } = discoverServices.savedSearch.byValue;

  const savedSearchEmbeddableFactory: ReactEmbeddableFactory<
    SearchEmbeddableSerializedState,
    SearchEmbeddableApi,
    SearchEmbeddableRuntimeState
  > = {
    type: SEARCH_EMBEDDABLE_TYPE,
    deserializeState: async (serializedState) => {
      console.log('serializedState', serializedState);

      const savedObjectId = serializedState.rawState.savedObjectId;
      const savedSearch = await toSavedSearch(
        savedObjectId,
        savedObjectId
          ? await attributeService.unwrapMethod(savedObjectId)
          : (inject(
              serializedState.rawState,
              serializedState.references ?? []
            ) as SavedSearchUnwrapResult)
      );

      // const { searchSourceJSON, references: originalReferences } =
      //   savedSearch.searchSource.serialize();
      // console.log(searchSourceJSON, originalReferences);
      /** TODO: Remove unused state? kibanaSavedObjectMeta for example */

      return savedSearch;
      // return {
      //   ...toSavedSearchAttributes(savedSearch, searchSourceJSON),
      //   searchSource: savedSearch.searchSource,
      // };
    },
    buildEmbeddable: async (initialState, buildApi, uuid) => {
      console.log('initialState', initialState);

      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(initialState);
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const fetchContext$ = new BehaviorSubject<FetchContext | undefined>(undefined);
      const savedObjectId$ = new BehaviorSubject<string | undefined>(initialState?.savedObjectId);

      const {
        searchEmbeddableApi,
        searchEmbeddableComparators,
        searchEmbeddableStateManager,
        // serializeSearchEmbeddable,
        // stateManager
        // snapshotState,
      } = await initializeSearchEmbeddableApi(initialState, { startServices, discoverServices });

      const serializeState = (): SerializedPanelState<SearchEmbeddableSerializedState> => {
        const searchSource = searchEmbeddableApi.searchSource$.getValue();
        const { searchSourceJSON, references: originalReferences } = searchSource.serialize();
        const savedSearchAttributes = toSavedSearchAttributes(
          searchEmbeddableApi.getSavedSearch(),
          searchSourceJSON
        );

        // const references = savedObjectsTagging
        // ? savedObjectsTagging.ui.updateTagsReferences(originalReferences, savedSearch.tags ?? [])
        // : originalReferences;

        const { rawState, references } = extract({
          attributes: savedSearchAttributes,
        });
        console.log({ rawState, references, originalReferences });
        return {
          rawState: rawState as unknown as SearchEmbeddableSerializedState,
          references,
        };
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
          getTypeDisplayName: () =>
            i18n.translate('discover.embeddable.search.displayName', {
              defaultMessage: 'search',
            }),
          getSavedSearch: () => {
            return undefined;
          },
          canLinkToLibrary: async () => {
            return (
              discoverServices.capabilities.discover.save && !Boolean(savedObjectId$.getValue())
            );
          },
          canUnlinkFromLibrary: async () => Boolean(savedObjectId$.getValue()),
          saveToLibrary: async (title: string) => {
            const savedObjectId = await attributeService.saveMethod({
              // ...searchEmbeddableApi.attributes$.getValue(),
              title,
            });
            return savedObjectId;
          },
          getByReferenceState: (savedObjectId: string) => {
            return {
              savedObjectId,
            };
          },
          checkForDuplicateTitle: (newTitle, isTitleDuplicateConfirmed, onTitleDuplicate) =>
            attributeService.checkForDuplicateTitle({
              newTitle,
              isTitleDuplicateConfirmed,
              onTitleDuplicate,
            }),
          getByValueState: () => {
            const { savedObjectId, ...byValueState } = serializeState().rawState ?? {};
            return {
              ...byValueState,
              // attributes: searchEmbeddableApi.attributes$.getValue(),
            };
          },
          serializeState,
        },
        {
          ...titleComparators,
          ...searchEmbeddableComparators,
          savedObjectId: [savedObjectId$, (value) => savedObjectId$.next(value)],
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
              valueInput: api.getByValueState(),
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
          // savedSearch$: searchEmbeddableApi.savedSearch$,
        },
        discoverServices,
      });

      return {
        api,
        Component: () => {
          // const searchSource = useStateFromPublishingSubject(searchEmbeddableApi.dataViews);
          const [dataViews, columns, rows, searchSource, savedSearchViewMode] =
            useBatchedPublishingSubjects(
              searchEmbeddableApi.dataViews,
              searchEmbeddableApi.columns$,
              searchEmbeddableApi.rows$,
              searchEmbeddableApi.searchSource$,
              searchEmbeddableApi.savedSearchViewMode$
            );

          useEffect(() => {
            return () => {
              onUnmount();
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
                    api={{
                      ...api,
                      ...searchEmbeddableApi,
                    }}
                    onAddFilter={onAddFilter}
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
