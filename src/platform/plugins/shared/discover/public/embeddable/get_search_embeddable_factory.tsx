/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { BehaviorSubject, firstValueFrom, merge } from 'rxjs';

import { CellActionsProvider } from '@kbn/cell-actions';
import { generateFilters } from '@kbn/data-plugin/public';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { FilterStateStore } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { FetchContext } from '@kbn/presentation-publishing';
import {
  initializeTimeRangeManager,
  initializeTitleManager,
  timeRangeComparators,
  titleComparators,
  useBatchedPublishingSubjects,
  initializeUnsavedChanges,
} from '@kbn/presentation-publishing';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { SearchResponseIncompleteWarning } from '@kbn/search-response-warnings/src/types';

import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { APPLY_FILTER_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { DiscoverServices } from '../build_services';
import { SearchEmbeddablFieldStatsTableComponent } from './components/search_embeddable_field_stats_table_component';
import { SearchEmbeddableGridComponent } from './components/search_embeddable_grid_component';
import { initializeEditApi } from './initialize_edit_api';
import { initializeFetch, isEsqlMode } from './initialize_fetch';
import { initializeSearchEmbeddableApi } from './initialize_search_embeddable_api';
import type { SearchEmbeddableState } from '../../common/embeddable/types';
import type { SearchEmbeddableApi } from './types';
import { deserializeState, serializeState } from './utils/serialization_utils';
import { BaseAppWrapper } from '../context_awareness';
import { ScopedServicesProvider } from '../components/scoped_services_provider';
import { isFieldStatsMode } from './utils/is_field_stats_mode';

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

  const savedSearchEmbeddableFactory: EmbeddableFactory<
    SearchEmbeddableState,
    SearchEmbeddableApi
  > = {
    type: SEARCH_EMBEDDABLE_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
      const runtimeState = await deserializeState({
        serializedState: initialState,
        discoverServices,
      });

      /** One Discover context awareness */
      const solutionNavId =
        runtimeState.nonPersistedDisplayOptions?.solutionNavIdOverride ??
        (await firstValueFrom(discoverServices.core.chrome.getActiveSolutionNavId$()));
      const { getRenderAppWrapper } = await discoverServices.profilesManager.resolveRootProfile({
        solutionNavId,
      });
      const AppWrapper = getRenderAppWrapper?.(BaseAppWrapper) ?? BaseAppWrapper;
      const scopedEbtManager = discoverServices.ebtManager.createScopedEBTManager();
      const scopedProfilesManager = discoverServices.profilesManager.createScopedProfilesManager({
        scopedEbtManager,
      });

      /** Specific by-reference state */
      const savedObjectId$ = new BehaviorSubject<string | undefined>(runtimeState?.savedObjectId);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(runtimeState?.savedObjectTitle);
      const defaultDescription$ = new BehaviorSubject<string | undefined>(
        runtimeState?.savedObjectDescription
      );

      /** All other state */
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const fetchContext$ = new BehaviorSubject<FetchContext | undefined>(undefined);
      const fetchWarnings$ = new BehaviorSubject<SearchResponseIncompleteWarning[]>([]);

      /** Build API */
      const titleManager = initializeTitleManager(initialState);
      const timeRangeManager = initializeTimeRangeManager(initialState);
      const dynamicActionsManager =
        await discoverServices.embeddableEnhanced?.initializeEmbeddableDynamicActions(
          uuid,
          () => titleManager.api.title$.getValue(),
          initialState
        );
      const maybeStopDynamicActions = dynamicActionsManager?.startDynamicActions();
      const searchEmbeddable = await initializeSearchEmbeddableApi(runtimeState, {
        discoverServices,
      });

      const serialize = (savedObjectId?: string) =>
        serializeState({
          uuid,
          initialState: runtimeState,
          savedSearch: searchEmbeddable.api.savedSearch$.getValue(),
          serializeTitles: titleManager.getLatestState,
          serializeTimeRange: timeRangeManager.getLatestState,
          serializeDynamicActions: dynamicActionsManager?.getLatestState,
          savedObjectId,
        });

      const unsavedChangesApi = initializeUnsavedChanges<SearchEmbeddableState>({
        uuid,
        parentApi,
        serializeState: () => serialize(savedObjectId$.getValue()),
        anyStateChange$: merge(
          ...(dynamicActionsManager ? [dynamicActionsManager.anyStateChange$] : []),
          searchEmbeddable.anyStateChange$,
          titleManager.anyStateChange$,
          timeRangeManager.anyStateChange$
        ),
        getComparators: () => {
          return {
            ...(dynamicActionsManager?.comparators ?? { drilldowns: 'skip', enhancements: 'skip' }),
            ...titleComparators,
            ...timeRangeComparators,
            ...searchEmbeddable.comparators,
            attributes: 'skip',
            breakdownField: 'skip',
            hideAggregatedPreview: 'skip',
            hideChart: 'skip',
            isTextBasedQuery: 'skip',
            kibanaSavedObjectMeta: 'skip',
            nonPersistedDisplayOptions: 'skip',
            refreshInterval: 'skip',
            savedObjectId: 'skip',
            timeRestore: 'skip',
            usesAdHocDataView: 'skip',
            controlGroupJson: 'skip',
            visContext: 'skip',
            tabs: 'skip',
          };
        },
        onReset: async (lastSaved) => {
          dynamicActionsManager?.reinitializeState(lastSaved ?? {});
          timeRangeManager.reinitializeState(lastSaved);
          titleManager.reinitializeState(lastSaved);
          if (lastSaved) {
            const lastSavedRuntimeState = await deserializeState({
              serializedState: lastSaved,
              discoverServices,
            });
            searchEmbeddable.reinitializeState(lastSavedRuntimeState);
          }
        },
      });

      const api: SearchEmbeddableApi = finalizeApi({
        ...unsavedChangesApi,
        ...titleManager.api,
        ...searchEmbeddable.api,
        ...timeRangeManager.api,
        ...dynamicActionsManager?.api,
        ...initializeEditApi({
          uuid,
          parentApi,
          partialApi: { ...searchEmbeddable.api, fetchContext$, savedObjectId$ },
          discoverServices,
          isEditable: startServices.isEditable,
          getTitle: () => titleManager.api.title$.getValue(),
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
        supportedTriggers: () => {
          // No triggers are supported, but this is still required to pass the drilldown
          // compatibilty check and ensure top-level drilldowns (e.g. URL) work as expected
          return [];
        },
      });

      const unsubscribeFromFetch = initializeFetch({
        api: {
          ...api,
          parentApi,
          ...titleManager.api,
          ...timeRangeManager.api,
          defaultTitle$,
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
        scopedProfilesManager,
        setDataLoading: (dataLoading: boolean | undefined) => dataLoading$.next(dataLoading),
        setBlockingError: (error: Error | undefined) => blockingError$.next(error),
      });

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
              maybeStopDynamicActions?.stopDynamicActions();
            };
          }, []);

          const dataView = useMemo(() => {
            const hasDataView = (dataViews ?? []).length > 0;
            if (!hasDataView) {
              blockingError$.next(
                new Error(
                  i18n.translate('discover.embeddable.search.dataViewError', {
                    defaultMessage: 'Missing data view {indexPatternId}',
                    values: {
                      indexPatternId:
                        typeof runtimeState.serializedSearchSource?.index === 'string'
                          ? runtimeState.serializedSearchSource.index
                          : runtimeState.serializedSearchSource?.index?.id ?? '',
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
            () => isFieldStatsMode(savedSearch, dataView, discoverServices.uiSettings),
            [savedSearch, dataView]
          );

          return (
            <KibanaRenderContextProvider {...discoverServices.core}>
              <KibanaContextProvider services={discoverServices}>
                <ScopedServicesProvider
                  scopedProfilesManager={scopedProfilesManager}
                  scopedEBTManager={scopedEbtManager}
                >
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
                            runtimeState.nonPersistedDisplayOptions?.enableFilters === false
                              ? undefined
                              : onAddFilter
                          }
                          enableDocumentViewer={
                            runtimeState.nonPersistedDisplayOptions?.enableDocumentViewer !==
                            undefined
                              ? runtimeState.nonPersistedDisplayOptions?.enableDocumentViewer
                              : true
                          }
                          stateManager={searchEmbeddable.stateManager}
                        />
                      </CellActionsProvider>
                    )}
                  </AppWrapper>
                </ScopedServicesProvider>
              </KibanaContextProvider>
            </KibanaRenderContextProvider>
          );
        },
      };
    },
  };

  return savedSearchEmbeddableFactory;
};
