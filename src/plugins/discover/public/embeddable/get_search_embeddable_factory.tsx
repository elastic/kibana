/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { BehaviorSubject, merge } from 'rxjs';

import { CellActionsProvider } from '@kbn/cell-actions';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
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
  initializeTitles,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';

import { extract, inject } from '../../common/embeddable/search_inject_extract';
import { getValidViewMode } from '../application/main/utils/get_valid_view_mode';
import { isTextBasedQuery } from '../application/main/utils/is_text_based_query';
import { DiscoverServices } from '../build_services';
import { SearchEmbeddablFieldStatsTableComponent } from './components/search_embeddable_field_stats_table_component';
import { SearchEmbeddableGridComponent } from './components/search_embeddable_grid_component';
import { initializeFetch } from './initialize_fetch';
import { initializeSearchEmbeddableApi } from './initialize_search_embeddable_api';
import { SearchEmbeddableApi, SearchEmbeddableSerializedState } from './types';
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
  const { attributeService } = discoverServices.savedSearch.byValue;

  const savedSearchEmbeddableFactory: ReactEmbeddableFactory<
    SearchEmbeddableSerializedState,
    SearchEmbeddableApi
  > = {
    type: SEARCH_EMBEDDABLE_TYPE,
    deserializeState: (state) => {
      if (!state.rawState) return {};
      const serializedState = state.rawState as EmbeddableStateWithType;
      const deserializedState = inject(serializedState, state.references ?? []);
      console.log('deserializedState', { state, deserializedState });
      return deserializedState;
    },
    buildEmbeddable: async (initialState, buildApi, uuid) => {
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(initialState);
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const fetchContext$ = new BehaviorSubject<FetchContext | undefined>(undefined);
      const {
        onUnmount,
        searchEmbeddableApi,
        searchEmbeddableComparators,
        serializeSearchEmbeddable,
      } = await initializeSearchEmbeddableApi(initialState, { startServices, discoverServices });

      const serializeState = (): SerializedPanelState<SearchEmbeddableSerializedState> => {
        const { state: rawState, references } = extract({
          ...initialState,
          type: SEARCH_EMBEDDABLE_TYPE,
          ...serializeTitles(),
          ...serializeSearchEmbeddable(),
        } as unknown as EmbeddableStateWithType);
        return {
          rawState: rawState as unknown as SearchEmbeddableSerializedState,
          references,
        };
      };

      const getAppTarget = async () => {
        const savedObjectId = searchEmbeddableApi.savedObjectId.getValue();
        const dataView = searchEmbeddableApi.savedSearch$.getValue().searchSource.getField('index');
        const locatorParams = getDiscoverLocatorParams(searchEmbeddableApi);

        // We need to use a redirect URL if this is a by value saved search using
        // an ad hoc data view to ensure the data view spec gets encoded in the URL
        const useRedirect = !savedObjectId && !dataView?.isPersisted();
        const editUrl = useRedirect
          ? discoverServices.locator.getRedirectUrl(locatorParams)
          : await discoverServices.locator.getUrl(locatorParams);
        const editPath = discoverServices.core.http.basePath.remove(editUrl);
        const editApp = useRedirect ? 'r' : 'discover';
        return { path: editPath, app: editApp };
      };

      const api = buildApi(
        {
          ...titlesApi,
          ...searchEmbeddableApi,
          dataLoading: dataLoading$,
          blockingError: blockingError$,
          onEdit: async () => {
            const stateTransfer = discoverServices.embeddable.getStateTransfer();
            const parentApiContext = (api.parentApi as DashboardContainer).getAppContext();
            const appTarget = await getAppTarget();

            if (stateTransfer && parentApiContext && appTarget) {
              const valueInput = serializeState();
              await stateTransfer.navigateToEditor(appTarget.app, {
                path: appTarget.path,
                state: {
                  embeddableId: uuid,
                  valueInput: { id: uuid, ...valueInput },
                  originatingApp: parentApiContext.currentAppId,
                  searchSessionId: fetchContext$.getValue()?.searchSessionId,
                  originatingPath: parentApiContext.getCurrentPath?.(),
                },
              });
            }
          },
          getEditHref: async () => {
            return (await getAppTarget())?.path;
          },
          getTypeDisplayName: () =>
            i18n.translate('discover.embeddable.search.displayName', {
              defaultMessage: 'search',
            }),
          isEditingEnabled: startServices.isEditable,
          getSavedSearch: () => {
            return undefined;
          },
          canLinkToLibrary: async () => {
            return (
              discoverServices.capabilities.discover.save &&
              !Boolean(searchEmbeddableApi.savedObjectId.getValue())
            );
          },
          canUnlinkFromLibrary: async () => Boolean(searchEmbeddableApi.savedObjectId.getValue()),
          saveToLibrary: async (title: string) => {
            const savedObjectId = await attributeService.saveMethod({
              ...searchEmbeddableApi.attributes$.getValue(),
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
            // console.log('getByValueState', {
            //   attributes: searchEmbeddableApi.attributes$.getValue(),
            // });
            return {
              ...byValueState,
              attributes: searchEmbeddableApi.attributes$.getValue(),
            };
          },
          serializeState,
        },
        {
          ...titleComparators,
          ...searchEmbeddableComparators,
        }
      );

      const unsubscribeFromFetch = initializeFetch({
        api: {
          ...api,
          dataLoading$,
          blockingError$,
          fetchContext$,
          rows$: searchEmbeddableApi.rows$,
          savedSearch$: searchEmbeddableApi.savedSearch$,
        },
        discoverServices,
      });

      return {
        api,
        Component: () => {
          const savedSearch = useStateFromPublishingSubject(searchEmbeddableApi.savedSearch$);

          useEffect(() => {
            return () => {
              onUnmount();
              unsubscribeFromFetch();
              appTargetSubscription.unsubscribe();
            };
          }, []);

          const { dataView, columns, viewMode } = useMemo(() => {
            return {
              dataView: savedSearch.searchSource.getField('index'),
              columns: savedSearch.columns ?? [],
              viewMode: getValidViewMode({
                viewMode: savedSearch.viewMode,
                isTextBasedQueryMode: isTextBasedQuery(savedSearch.searchSource.getField('query')),
              }),
            };
          }, [savedSearch]);

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
            [viewMode, dataView, columns]
          );

          return (
            <KibanaContextProvider services={discoverServices}>
              {renderAsFieldStatsTable ? (
                <SearchEmbeddablFieldStatsTableComponent
                  api={{
                    ...api,
                    fetchContext$,
                    savedSearch$: searchEmbeddableApi.savedSearch$,
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
                      rows$: searchEmbeddableApi.rows$,
                      savedSearch$: searchEmbeddableApi.savedSearch$,
                    }}
                    onAddFilter={onAddFilter}
                  />
                </CellActionsProvider>
              )}
            </KibanaContextProvider>
          );
        },
      };
    },
  };

  return savedSearchEmbeddableFactory;
};
