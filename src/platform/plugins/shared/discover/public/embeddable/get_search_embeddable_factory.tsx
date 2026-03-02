/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import type { Subscription } from 'rxjs';
import { BehaviorSubject, firstValueFrom, merge, skip, map, filter as filterOp } from 'rxjs';
import { CellActionsProvider } from '@kbn/cell-actions';
import { generateFilters } from '@kbn/data-plugin/public';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { FilterStateStore } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { FetchContext, HasEditCapabilities } from '@kbn/presentation-publishing';
import {
  apiCanFocusPanel,
  apiPublishesChildren,
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
import { SearchEmbeddableInlineEditHoverActions } from './components/search_embeddable_inline_edit_hover_actions';
import { initializeEditApi } from './initialize_edit_api';
import { initializeFetch, isEsqlMode } from './initialize_fetch';
import { initializeSearchEmbeddableApi } from './initialize_search_embeddable_api';
import type { SearchEmbeddableState } from '../../common/embeddable/types';
import type { SearchEmbeddableApi, SearchEmbeddableSerializedAttributes } from './types';
import { deserializeState, serializeState } from './utils/serialization_utils';
import { BaseAppWrapper } from '../context_awareness';
import { ScopedServicesProvider } from '../components/scoped_services_provider';
import { isFieldStatsMode } from './utils/is_field_stats_mode';
import { isTabDeleted } from './utils/is_tab_deleted';

// This type forces our snapshot to include all keys so we don't overlook new ones
type InlineEditSnapshot = {
  [K in keyof Required<SearchEmbeddableSerializedAttributes>]: SearchEmbeddableSerializedAttributes[K];
};

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
    buildEmbeddable: async ({
      initializeDrilldownsManager,
      initialState,
      finalizeApi,
      parentApi,
      uuid,
    }) => {
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
      const selectedTabId$ = new BehaviorSubject<string | undefined>(runtimeState.selectedTabId);
      const draftSelectedTabId$ = new BehaviorSubject<string | undefined>(
        runtimeState.selectedTabId
      );
      const isInlineEditing$ = new BehaviorSubject<boolean>(false);
      const inlineEditDirty$ = new BehaviorSubject<boolean>(false);
      const overrideHoverActions$ = isInlineEditing$;

      const tabs = runtimeState.tabs ?? [];
      let inlineEditStateSnapshot: InlineEditSnapshot | undefined;

      const isSelectedTabDeleted = (tabId: string | undefined, availableTabs: typeof tabs = tabs) =>
        isTabDeleted(tabId, availableTabs);

      const setFocusedPanelId = (panelId?: string) => {
        if (apiCanFocusPanel(parentApi)) {
          parentApi.setFocusedPanelId(panelId);
        }
      };

      /** All other state */
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const fetchContext$ = new BehaviorSubject<FetchContext | undefined>(undefined);
      const fetchWarnings$ = new BehaviorSubject<SearchResponseIncompleteWarning[]>([]);

      /** Build API */
      const titleManager = initializeTitleManager(initialState);
      const timeRangeManager = initializeTimeRangeManager(initialState);
      const drilldownsManager = await initializeDrilldownsManager(uuid, initialState);
      const searchEmbeddable = await initializeSearchEmbeddableApi({
        initialState: runtimeState,
        dataLoading$,
        discoverServices,
      });

      const serialize = (savedObjectId?: string) =>
        serializeState({
          uuid,
          initialState: runtimeState,
          savedSearch: searchEmbeddable.api.savedSearch$.getValue(),
          serializeTitles: titleManager.getLatestState,
          serializeTimeRange: timeRangeManager.getLatestState,
          serializeDynamicActions: drilldownsManager.getLatestState,
          savedObjectId,
          selectedTabId: selectedTabId$.getValue(),
        });

      const switchTab = async (tabId: string): Promise<boolean> => {
        const tab = tabs.find((t) => t.id === tabId);

        if (!tab) return false;

        try {
          await searchEmbeddable.reinitializeState(tab);

          return true;
        } catch (error) {
          blockingError$.next(error as Error);
          dataLoading$.next(false);

          return false;
        }
      };

      const stopInlineEditing = () => {
        isInlineEditing$.next(false);
        inlineEditDirty$.next(false);
        draftSelectedTabId$.next(selectedTabId$.getValue());

        inlineEditStateSnapshot = undefined;

        setFocusedPanelId();
      };

      const startInlineEditing = async () => {
        if (isInlineEditing$.getValue()) return;

        const currentTabId = selectedTabId$.getValue();
        const {
          stateManager,
          api: { savedSearch$ },
        } = searchEmbeddable;

        inlineEditStateSnapshot = {
          serializedSearchSource: savedSearch$.getValue().searchSource.getSerializedFields(),
          sort: stateManager.sort.getValue(),
          columns: stateManager.columns.getValue(),
          grid: stateManager.grid.getValue(),
          sampleSize: stateManager.sampleSize.getValue(),
          rowsPerPage: stateManager.rowsPerPage.getValue(),
          rowHeight: stateManager.rowHeight.getValue(),
          headerRowHeight: stateManager.headerRowHeight.getValue(),
          viewMode: stateManager.viewMode.getValue(),
          density: stateManager.density.getValue(),
        };

        draftSelectedTabId$.next(currentTabId);
        isInlineEditing$.next(true);

        setFocusedPanelId(uuid);
      };

      const previewInlineTabSelection = async (tabId: string) => {
        if (!isInlineEditing$.getValue()) return;
        if (draftSelectedTabId$.getValue() === tabId) return;

        const previousDraftTabId = draftSelectedTabId$.getValue();

        draftSelectedTabId$.next(tabId);

        const didSwitch = await switchTab(tabId);

        if (didSwitch) {
          inlineEditDirty$.next(true);
        } else {
          draftSelectedTabId$.next(previousDraftTabId);
        }
      };

      const applyInlineTabSelection = async () => {
        if (!isInlineEditing$.getValue()) return;

        const draftTabId = draftSelectedTabId$.getValue();
        const committedTabId = selectedTabId$.getValue();

        if (!draftTabId || draftTabId === committedTabId) {
          stopInlineEditing();
          return;
        }

        if (!tabs.some((tab) => tab.id === draftTabId)) return;

        selectedTabId$.next(draftTabId);
        stopInlineEditing();
      };

      const cancelInlineTabSelection = async () => {
        if (!isInlineEditing$.getValue() || !inlineEditStateSnapshot) return;

        if (draftSelectedTabId$.getValue() !== selectedTabId$.getValue()) {
          try {
            await searchEmbeddable.reinitializeState(inlineEditStateSnapshot);
          } catch (error) {
            blockingError$.next(error as Error);
            dataLoading$.next(false);
          }
        }

        stopInlineEditing();
      };

      const unsavedChangesApi = initializeUnsavedChanges<SearchEmbeddableState>({
        uuid,
        parentApi,
        serializeState: () => serialize(savedObjectId$.getValue()),
        anyStateChange$: merge(
          drilldownsManager.anyStateChange$,
          searchEmbeddable.anyStateChange$,
          titleManager.anyStateChange$,
          timeRangeManager.anyStateChange$,
          selectedTabId$.pipe(
            skip(1),
            map(() => undefined)
          ),
          isInlineEditing$.pipe(
            skip(1),
            filterOp((isEditing) => !isEditing),
            map(() => undefined)
          )
        ),
        getComparators: () => {
          const isDeleted = isSelectedTabDeleted(selectedTabId$.getValue());
          const shouldSkipTabComparators = isDeleted || isInlineEditing$.getValue();

          return {
            ...drilldownsManager.comparators,
            ...titleComparators,
            ...timeRangeComparators,
            ...searchEmbeddable.comparators,
            // While the selected tab is missing or inline editing is in progress,
            // skip tab-dependent comparators so unsaved-changes badges don't appear
            // until the user explicitly applies a tab change.
            ...(shouldSkipTabComparators
              ? Object.fromEntries(
                  Object.keys(searchEmbeddable.comparators).map((k) => [k, 'skip'])
                )
              : {}),
            selectedTabId: shouldSkipTabComparators ? 'skip' : 'referenceEquality',
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
          drilldownsManager.reinitializeState(lastSaved ?? {});
          timeRangeManager.reinitializeState(lastSaved);
          titleManager.reinitializeState(lastSaved);
          if (lastSaved) {
            const currentTabId = draftSelectedTabId$.getValue();

            const lastSavedRuntimeState = await deserializeState({
              serializedState: lastSaved,
              discoverServices,
            });

            selectedTabId$.next(lastSavedRuntimeState.selectedTabId);

            const isLastSavedSelectedTabDeleted = isSelectedTabDeleted(
              lastSavedRuntimeState.selectedTabId,
              lastSavedRuntimeState.tabs ?? tabs
            );

            const resolvedTabId = isLastSavedSelectedTabDeleted
              ? undefined
              : lastSavedRuntimeState.selectedTabId;

            const resolvedTab = resolvedTabId
              ? tabs.find((t) => t.id === resolvedTabId)
              : undefined;

            const newState =
              currentTabId !== resolvedTabId && resolvedTab ? resolvedTab : lastSavedRuntimeState;

            await searchEmbeddable.reinitializeState(newState);
          }
          stopInlineEditing();
        },
      });

      const { onEdit: navigateToDiscover, ...editApiWithoutOnEdit } = initializeEditApi({
        uuid,
        parentApi,
        partialApi: { ...searchEmbeddable.api, fetchContext$, savedObjectId$ },
        discoverServices,
        isEditable: startServices.isEditable,
        getTitle: () => titleManager.api.title$.getValue(),
      }) as Partial<HasEditCapabilities & { getEditHref: () => Promise<string> }>;

      const api: SearchEmbeddableApi = finalizeApi({
        ...unsavedChangesApi,
        ...titleManager.api,
        ...(searchEmbeddable.api as typeof searchEmbeddable.api &
          Required<Pick<SearchEmbeddableApi, 'filters$' | 'query$' | 'setFilters' | 'setQuery'>>),
        ...timeRangeManager.api,
        ...drilldownsManager.api,
        ...editApiWithoutOnEdit,
        ...(navigateToDiscover
          ? {
              onEdit: startInlineEditing,
              overrideHoverActions$,
              OverriddenHoverActionsComponent: () => (
                <SearchEmbeddableInlineEditHoverActions
                  draftSelectedTabId$={draftSelectedTabId$}
                  tabs={tabs}
                  onEditInDiscover={navigateToDiscover}
                  onSelectTab={previewInlineTabSelection}
                />
              ),
            }
          : {}),
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

      let hasPanelBeenRegisteredInParent = false;
      let hasBeenCleanedUp = false;
      let parentChildrenSubscription: Subscription | undefined;
      const cleanupEmbeddableResources = () => {
        if (hasBeenCleanedUp) return;

        hasBeenCleanedUp = true;
        drilldownsManager.cleanup();
        searchEmbeddable.cleanup();
        unsubscribeFromFetch();
        parentChildrenSubscription?.unsubscribe();
      };

      if (apiPublishesChildren(parentApi)) {
        parentChildrenSubscription = parentApi.children$.subscribe((children) => {
          if (children[uuid]) {
            hasPanelBeenRegisteredInParent = true;
            return;
          }
          if (hasPanelBeenRegisteredInParent) {
            cleanupEmbeddableResources();
          }
        });
      }

      return {
        api,
        Component: () => {
          const [
            savedSearch,
            dataViews,
            isInlineEditing,
            draftSelectedTabId,
            selectedTabId,
            isInlineEditDirty,
          ] = useBatchedPublishingSubjects(
            api.savedSearch$,
            api.dataViews$,
            isInlineEditing$,
            draftSelectedTabId$,
            selectedTabId$,
            inlineEditDirty$
          );

          const selectedTabIdForDisplay = isInlineEditing
            ? draftSelectedTabId ?? selectedTabId
            : selectedTabId;
          const isSelectedTabDeletedForDisplay = isTabDeleted(selectedTabIdForDisplay, tabs);
          const hasPendingInlineTabChanges = isInlineEditing && isInlineEditDirty;

          useEffect(() => {
            return () => {
              // In dashboard, this component can transiently unmount/remount during panel state transitions.
              // Cleanup is handled when the child API is actually removed from the parent container.
              if (!apiPublishesChildren(parentApi)) {
                cleanupEmbeddableResources();
              }
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
                          isSelectedTabDeleted={isSelectedTabDeletedForDisplay}
                          inlineEditing={{
                            isActive: isInlineEditing,
                            hasPendingChanges: hasPendingInlineTabChanges,
                            onApply: applyInlineTabSelection,
                            onCancel: cancelInlineTabSelection,
                          }}
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
