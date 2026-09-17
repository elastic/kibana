/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, firstValueFrom, map, merge, skip } from 'rxjs';
import { CellActionsProvider } from '@kbn/cell-actions';
import { generateFilters } from '@kbn/data-plugin/public';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import { FilterStateStore } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { FetchContext } from '@kbn/presentation-publishing';
import {
  initializeTimeRangeManager,
  initializeTitleManager,
  initializeStateApi,
  timeRangeComparators,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { SearchResponseIncompleteWarning } from '@kbn/search-response-warnings/src/types';
import useObservable from 'react-use/lib/useObservable';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DocViewerApi } from '@kbn/unified-doc-viewer';
import { ON_APPLY_FILTER, ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { getDiscoverSessionEmbeddableComparators } from './utils/get_search_embeddable_comparators';
import type { DiscoverServices } from '../build_services';
import { SearchEmbeddablFieldStatsTableComponent } from './components/search_embeddable_field_stats_table_component';
import { SearchEmbeddableGridComponent } from './components/search_embeddable_grid_component';
import { SearchEmbeddableInlineEditHoverActions } from './components/search_embeddable_inline_edit_hover_actions';
import { SearchEmbeddableDeletedTabPrompt } from './components/search_embeddable_deleted_tab_prompt';
import { SearchEmbeddableMissingDataViewPrompt } from './components/search_embeddable_missing_data_view_prompt';
import { initializeEditApi } from './initialize_edit_api';
import { initializeFetch, isEsqlMode } from './initialize_fetch';
import { initializeInlineEditingApi } from './initialize_inline_editing_api';
import { initializeSearchEmbeddableApi } from './initialize_search_embeddable_api';
import type { SearchEmbeddableApi, SearchEmbeddablePanelApiState } from './types';
import { deserializeState, serializeState } from './utils/serialization_utils';
import { createInMemoryContextAwarenessToolkit } from '../context_awareness';
import { ScopedServicesProvider } from '../components/scoped_services_provider';
import { isFieldStatsMode } from './utils/is_field_stats_mode';
import { isTabDeleted } from './utils/is_tab_deleted';
import { DiscoverTabType } from '@kbn/discover-session-constants';

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
  const { save, hasLibraryItemWithTitle } = discoverServices.savedSearch;

  const savedSearchEmbeddableFactory: EmbeddablePublicDefinition<
    SearchEmbeddablePanelApiState,
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

      await discoverServices.profilesManager.resolveRootProfile({
        solutionNavId,
      });

      /** Specific by-reference state */
      const savedObjectId$ = new BehaviorSubject<string | undefined>(runtimeState?.savedObjectId);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(runtimeState?.savedObjectTitle);
      const defaultDescription$ = new BehaviorSubject<string | undefined>(
        runtimeState?.savedObjectDescription
      );
      const selectedTabId$ = new BehaviorSubject<string | undefined>(runtimeState.selectedTabId);

      const tabs = runtimeState.tabs ?? [];

      const defaultState = { selected_tab_id: tabs[0]?.id };

      /** All other state */
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const fetchContext$ = new BehaviorSubject<FetchContext | undefined>(undefined);
      const fetchWarnings$ = new BehaviorSubject<SearchResponseIncompleteWarning[]>([]);
      const refreshTrigger$ = new BehaviorSubject<void>(undefined);

      /** Build API */
      const titleManager = initializeTitleManager(runtimeState);
      const timeRangeManager = initializeTimeRangeManager(runtimeState);
      const drilldownsManager = initializeDrilldownsManager(uuid, runtimeState);
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

      const inlineEditingApi = initializeInlineEditingApi({
        uuid,
        parentApi,
        tabs,
        analytics: discoverServices.analytics,
        selectedTabId$,
        savedObjectId$,
        searchEmbeddable,
        blockingError$,
        dataLoading$,
      });

      const stateApi = initializeStateApi<SearchEmbeddablePanelApiState>({
        uuid,
        parentApi,
        defaultState,
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
          inlineEditingApi.anyStateChange$
        ),
        getComparators: () => {
          const isByValue = !savedObjectId$.getValue();
          const shouldSkipTabComparators =
            isTabDeleted(selectedTabId$.getValue(), tabs) || inlineEditingApi.isEditing();

          return {
            ...drilldownsManager.comparators,
            ...titleComparators,
            ...timeRangeComparators,
            ...getDiscoverSessionEmbeddableComparators(isByValue, shouldSkipTabComparators),
            nonPersistedDisplayOptions: 'skip',
          };
        },
        applySerializedState: async (nextState) => {
          drilldownsManager.reinitializeState(nextState);
          timeRangeManager.reinitializeState(nextState);
          titleManager.reinitializeState(nextState);

          const nextRuntimeState = await deserializeState({
            serializedState: nextState,
            discoverServices,
          });

          selectedTabId$.next(nextRuntimeState.selectedTabId);
          await searchEmbeddable.reinitializeState(nextRuntimeState);
          inlineEditingApi.stopInlineEditing();
        },
      });

      const getSelectedTabId = () =>
        inlineEditingApi.draftSelectedTabId$.getValue() ?? selectedTabId$.getValue();

      const editApi = initializeEditApi({
        uuid,
        parentApi,
        partialApi: { ...searchEmbeddable.api, fetchContext$, savedObjectId$, getSelectedTabId },
        discoverServices,
        isEditable: startServices.isEditable,
        getTitle: () => titleManager.api.title$.getValue(),
      });

      let cancelRequests: () => void = () => {};

      const api: SearchEmbeddableApi = finalizeApi({
        ...stateApi,
        ...titleManager.api,
        ...searchEmbeddable.api,
        ...timeRangeManager.api,
        ...drilldownsManager.api,
        ...editApi,
        ...(editApi && savedObjectId$.getValue()
          ? {
              onEdit: inlineEditingApi.startInlineEditing,
              overrideHoverActions$: inlineEditingApi.overrideHoverActions$,
              OverriddenHoverActionsComponent: () => (
                <SearchEmbeddableInlineEditHoverActions
                  draftSelectedTabId$={inlineEditingApi.draftSelectedTabId$}
                  tabs={tabs}
                  onEditInDiscover={editApi.onEdit}
                  onSelectTab={inlineEditingApi.previewInlineTabSelection}
                />
              ),
            }
          : {}),
        dataLoading$,
        blockingError$,
        savedObjectId$,
        getSelectedTabId,
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
          const description = titleManager.api.description$.getValue();
          const savedObjectId = await save({
            ...api.savedSearch$.getValue(),
            title,
            ...(description && { description }),
          });
          defaultTitle$.next(title);
          defaultDescription$.next(description);
          return savedObjectId!;
        },
        hasLibraryItemWithTitle,
        getSerializedStateByValue: () => serialize(undefined),
        getSerializedStateByReference: (newId: string) => serialize(newId),
        getInspectorAdapters: () => searchEmbeddable.stateManager.inspectorAdapters.getValue(),
        supportedTriggers: () => {
          return [ON_OPEN_PANEL_MENU];
        },
        cancelRequests: () => cancelRequests(),
      });

      const addFilter: DocViewFilterFn = async (mapping, values, operation) => {
        const dataView = api.dataViews$.getValue()?.[0];
        if (!dataView || !mapping) {
          return;
        }

        let newFilters = generateFilters(
          discoverServices.filterManager,
          mapping,
          values,
          operation,
          dataView
        );
        newFilters = newFilters.map((filter) => ({
          ...filter,
          $state: { store: FilterStateStore.APP_STATE },
        }));

        await startServices.executeTriggerActions(ON_APPLY_FILTER, {
          embeddable: api,
          filters: newFilters,
        });
      };

      const enableFilters = runtimeState.nonPersistedDisplayOptions?.enableFilters !== false;
      const enableDocumentViewer =
        runtimeState.nonPersistedDisplayOptions?.enableDocumentViewer !== false;

      const expandedDoc$ = new BehaviorSubject<DataTableRecord | undefined>(undefined);
      const initialDocViewerTabId$ = new BehaviorSubject<string | undefined>(undefined);

      const setExpandedDoc = (
        doc: DataTableRecord | undefined,
        options?: { initialTabId?: string }
      ) => {
        expandedDoc$.next(doc);
        initialDocViewerTabId$.next(options?.initialTabId);
      };

      const { profileStateRegistry } = discoverServices;
      const toolkit = createInMemoryContextAwarenessToolkit({
        profileStateRegistry,
        initialProfileState: profileStateRegistry.fromSavedState(runtimeState.tabTypeState),
        actions: {
          addFilter: enableFilters ? addFilter : undefined,
          refreshData: () => refreshTrigger$.next(undefined),
          setExpandedDoc: enableDocumentViewer ? setExpandedDoc : undefined,
        },
      });

      const scopedEbtManager = discoverServices.ebtManager.createScopedEBTManager();
      const scopedProfilesManager = discoverServices.profilesManager.createScopedProfilesManager({
        scopedEbtManager,
        toolkit,
      });

      const { cleanup: cleanupFetch, cancelRequests: _cancelRequests } = initializeFetch({
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
        refreshTrigger$,
        setDataLoading: (dataLoading: boolean | undefined) => dataLoading$.next(dataLoading),
        setBlockingError: (error: Error | undefined) => blockingError$.next(error),
        setApproximationApplied: searchEmbeddable.internalApi.setApproximationApplied,
      });
      cancelRequests = _cancelRequests;

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
            inlineEditingApi.isInlineEditing$,
            inlineEditingApi.draftSelectedTabId$,
            selectedTabId$,
            inlineEditingApi.inlineEditDirty$
          );

          const expandedDoc = useObservable(expandedDoc$, expandedDoc$.getValue());
          const initialDocViewerTabId = useObservable(
            initialDocViewerTabId$,
            initialDocViewerTabId$.getValue()
          );
          const docViewerRef = useRef<DocViewerApi>(null);

          useEffect(() => {
            if (initialDocViewerTabId) {
              docViewerRef.current?.setSelectedTabId(initialDocViewerTabId);
            }
          }, [initialDocViewerTabId]);

          useEffect(() => {
            return () => {
              drilldownsManager.cleanup();
              searchEmbeddable.cleanup();
              cleanupFetch();
            };
          }, []);

          const metricsState =
            savedSearch.tabTypeState?.type === DiscoverTabType.Metrics
              ? savedSearch.tabTypeState
              : undefined;

          const selectedTabIdForDisplay = isInlineEditing
            ? draftSelectedTabId ?? selectedTabId
            : selectedTabId;
          const isSelectedTabDeletedForDisplay = isTabDeleted(selectedTabIdForDisplay, tabs);
          const hasPendingInlineTabChanges = isInlineEditing && isInlineEditDirty;

          const dataView = useMemo(() => dataViews?.[0], [dataViews]);

          const renderAsFieldStatsTable = useMemo(
            () => isFieldStatsMode(savedSearch, dataView, discoverServices.uiSettings),
            [savedSearch, dataView]
          );

          if (isSelectedTabDeletedForDisplay) {
            return (
              <SearchEmbeddableDeletedTabPrompt
                api={api}
                canShowDashboardWriteControls={Boolean(
                  discoverServices.capabilities.dashboard_v2?.showWriteControls
                )}
                inlineEditing={{
                  hasPendingChanges: hasPendingInlineTabChanges,
                  isActive: isInlineEditing,
                  onApply: inlineEditingApi.applyInlineTabSelection,
                  onCancel: inlineEditingApi.cancelInlineTabSelection,
                }}
              />
            );
          }

          if (!dataView) {
            return (
              <SearchEmbeddableMissingDataViewPrompt
                api={api}
                canShowDashboardWriteControls={Boolean(
                  discoverServices.capabilities.dashboard_v2?.showWriteControls
                )}
                inlineEditing={{
                  hasPendingChanges: hasPendingInlineTabChanges,
                  isActive: isInlineEditing,
                  onApply: inlineEditingApi.applyInlineTabSelection,
                  onCancel: inlineEditingApi.cancelInlineTabSelection,
                }}
                isByReference={Boolean(savedObjectId$.getValue())}
                onEditInDiscover={editApi?.onEdit}
              />
            );
          }
          console.log(metricsState);

          return (
            <KibanaRenderContextProvider {...discoverServices.core}>
              <KibanaContextProvider services={discoverServices}>
                <ScopedServicesProvider
                  scopedProfilesManager={scopedProfilesManager}
                  scopedEBTManager={scopedEbtManager}
                >
                  {metricsState && (
                    <div
                      key="metrics-state"
                      style={{
                        fontSize: '10px',
                        color: '#6B6B6B',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        marginBottom: '8px',
                        width: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                      }}
                    >
                      <img
                        src={
                          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAXfUlEQVR4nO2ad5xcxZXvv3VD556enCWNNKOARjmAEKBAXtkYkBkZsIE1QSC8GOMETtvMYmAdeAYWWAPGBowxzMCzDdggsBJCIAFCSGhG0mgUJ+fp7ulw+95b9f5A2seCwBLw9o/30ffPvl1V9/zqVNWpcy4c5zjHOc5xjnOc4xznOP9jKBAANy+vi/ykbvF3//Obl4wHaKir0/+n30UcawMFgro6jd7e99sWFysaG6UAdbR9RKNo9fWob8yf0HByTclF+4YynYbP+6UfNL62+cHls828M8fJoqbJYhFIUV+vOIa+j5WjFuDQrGkC3CM+r6vTRWPjEZ99kLo69MZG5DWn1Z48PcyGaVOnZoal8K16fdO+a25cOn/Ksl92f7jNmmjUAOirrVXQCI3Q1NsraouLVd0xiv9hjKP5kwJxaBBX3fP7HBqePMVNxE4AR9NDOc2cdcpror4+rkBDoYT4+Beqo45GGtW40qJLcoRUrX2OmPNPZzuVnf1jV63c+mbni/dvbd7TPeDR3HcmVBWvLdk0tF3U1zuf1sB/xD/0gMPGK6U0pp5884HezusHUolKy8miAQGPj/JIQVtBVeXPxfrV98HHe0M0GtVuvfVW9e1lZ5RXmN6tYdvNi5shefqypdre7e/IZ579k3H6wvnUTp2K5Sh0mXGLc/3vdQ0lVzquaJs4pnjnYNJNv7hhW2nb7l2TJpaHT/SbYv91D/3tW1HQ6kEeqwCf6AGH3F6ohdcH45WTntg/0H7+tkwSBbYGMgvCySSFLz4w6hw7+x/qC+fO4uLx3xKX/UdcNdTpYtmHRFi7VhNCOD+49EvXFlYUF4zs3Z9t72w3Nq9dRUdPt0hiuuu2tMgRR1f5pRUkkhmzPMUMw/DNSGcy/ObP60nG4wRUmqXzaxiX6+OZ1W/fBFBbVydobDxW+z/ZA9aAsRicPf7c64WVvH+7tNGFcAVgK8gIRAqBhZJZpeTVtTM93tNrdsYCzsX5P/vTVhVdaIj6dQ68P/v19fXy+btvn7Jr374Nb27ZFizymkycVCP6YzEy2SwdvQNkbElxfh6G10d5eZkyDFN5TVMOx+O0NG3T5lYXiS9fsCRbIFP+N1/dcM/Cu/7yLRWNaqK+/phnH0D7pIeLDm14renhZ/qkfV6VEL8qBBUECjFEOV7CCKVASwmMVS2tWa0lPincnV5tPfWtWaJ+naNmzzZVXZ0OazWAzoGhaCQvP+fss86UZRMniJ1t3SQtB6HphENhVVlexsTx4zANnZGRpBBKavH4sLG7dbeRsizNsB033d7pb9m19+0Fob98u6GuTuf9k+JTcczHYCta1CPMW10jlE1LZQzIDLtJ0wt4lWD5nHlOICA8cmpxj1aTe7646XebDrd9Mvq9OYNW9g1/MCB0w0DXYLB/QHgMjZycEPF4kkQyBUIwHIvj9fsZW13DvtZWXCfLUCxOkank2dX5uh3UvnDaLY+/eMSldgx8ogccRoHYDp41YFQHi54JGEF0Tdc9mkZQGORj4gN6kbR0dBmEQo67dm+J0zy0Ts2Y+4i6ZOmX1bu/CCYQ81DS6O3vd3fu3CmUlMLw+tjf3sWBjl5c26UwP4LX5wPpUDttKrNOPhlXukQiEarHjHLDIZ9hBczXTrvl8Rej0aj2WYyHozgGVTSqsXatRl8fi5ubnbThKw57gmTstIqnkiKjXHIxCOMwKBQvdx1k0ugyzRcKudabBz2qe/BKNRC/0rO7Y8+C5RdbzzXvlF1dXXrWcXnh5dXMnTGFKdNm0rPzFXa++wbbYtWcO7sGJQVzTz6JvNJKVVleLEZGUkRyc0VpSZCUnfKrtx80xZxrP/Px+IkeoOrqdFFfL8W6dc6U5uasAr9eVXmzEwnQMTKg2mWSLizS2BRgElKCGC4PvvU2HbER4XV9MuP12+vbd2e7evqqJxVUTJ4170QsKyuEEMydOglNSXq62qk6YTYLTipjVnAH23e1MHf2NPKLChVOWiQSSVr37GPP1tfF3q5hhW5Os7p6qgClotGj8uKP44gecPjsF42NbvLcCyu9hnEJqfTpjssEU9PGSQxZUzhGDw/30eLEaMUmjEau0FFIhpXNr3duZUo4X3yxokY/dex03u3Y5divbmTWisu0HW9vwnUlscQIsXic/Pw89nRozJ//Ey6YneLVdZs598uXohkeMTyUQHatVnTtFlWzF9Fp6aosY5neUH7wsxh+mI/dBBVo7uXX3Izp+Z4eS+XR0QN9A2RjI66uhNADflCKRCrJjtQgb1nDdEuLQSABuAK6FarU8IrbKidQkkqzXrOpuu9OFa4qYNc7b5JKJcVA/wDeQJgJM05k8rwF+MK5pPp7UNksvlCInu4eml5/nqHOJjrTpSri1fSISgwsvfTESWLStf0qGtUaa2tFU1OTqv8UR+ERBWi54QZvVf/Ik2bSXuq07sPq7MrawzGh6boQIZ9mmWDrGq6h4xMmAc1ACJ32bIb9qRE6pM1IZgTHThEDuoELR43ndATPK5f8796kpp45S2TjXcQHekjERxg9cyH+SB5CNwFdtf39FSpqxgstP4/g+BPY+vpGnn3it86EPMOcPK7gudlX33lBQ12dvuy/R5wiGo3qtbW1qq5umfykkPwTBciefNb1Zsa5P9myx0qnU4arK6GCXlKGpCedpDuTYtB1sT/QSUA3yfUF0bMZhuwMO0NFNOXV0DbhPHZXnkascw8/3/c4K6wdbJwplWf+RaJ40YX4nBhD7W2Ey8eRU1wBUuIvKKbt72uUOtgmRl+8DE9eDtl4TP3tj0/ICaNyzJmnzjlXjD59pWpo0NcWFZn2wMBCr243L7zwkrYP2tHQUKdDHXV1dVIIcUQxjiiAVTLxzyqeOG/YtlzXa+gZXdKVSdBtZxhQkAKlCU04ApJKkRRCWVIKG0gUjWXPyVexe9pX6fdVoEyTkALTB4Pv7ObH7g3c9u+rGfyzw7t/mkPelZdh+iCbSqMF87GkgWu7KtHVJ0qqq6mcPgWP6SE11CtLAspQodCv9ZLpKxoaGjzLli3L3n/77beWF4aifb29MZ8/+K4/4FuVGyn4+5mXXr5FCJH5kK0fEeGIAgx6SxqFdL+c8mjOoEyr/ZkREVNKTwuBKwRZBUMo+lAqLTQMKYUvt4QdX/wpq8ouwCWA0G38WIQDBioryVpZ0jKAPrCZH5f+lCbzVNqeTjHK6MB3+nSm5A9T5rGoKitVxRVjRFL46OztU4V5JaIgN+CWeS1TFOQ+ao499crND11rPN9Z5g4PD+dMKIy0CCuR70ipeQ2PMD0Gtutgen2tHo//1XAkZ+W0cbWvjl28+CPX7I8VoNtX/G2fxl2t2Vg25VieESFIgusIIYaUpF+h/EA5higEXNPHI99fzRtlcyl1BinSUmx5r4feERNv2IetBLK/G93nwS2tBpnHgp2r+aHxM9KZdta2lLAtGyIeVBSNyaVqcjVTM53UNG1BjDPJ7TPcuVnXZGbkie5ZxdcN+KrtKcvqs7+89dYbS0PG3fHhgaxE0y3dkWRNZRghXTgJ3efVELqBphvDAYMXL/n+bZd+2NYjHoNCU0/uzQx9OyudCiX0O8rRZrjIJbuk6+QLXTvFG2G05hOG4SXkDvG7mZezMWcSD9RsYcmMoDJNnZ50objtqXbuf34PmBK6tyJHz8VjBnh07w1ccs5TcIEBnnwu6EoR26yxfVOIN7ft4d2trbyoTSAkQ/z6m+uJDBbp62/UZfmA92vVRUV3lv2ovvmKK67wBUzxL9lMUgk0zTQsMTUzUc+bGqdizBu81TLLad4Rk6aRVqbhyY3bqdFHsvWIQURJqq87Lp3FHsNYsFC5P5qh7C8o5b4yvaBUv3DsFHdaUYUQkSA9PkmTTPOMHWBFZTPnz/GQSGbEiAUlIfjp+T6mpF6h9PUfkju4GZwUttCw+rtgPqSNQgifTvK12wlMXsApdwyrm34f4LEn+nj2uucomTibG9+q4+fW+Vx27QuyI1iZtR5qnKSUEtPKyy/K8Rk1VjbrmGQ1VTmP3P5ypgbvJd99gROK92kIvyEEhi6kE/Jqtxy1AArEItg9x3HWb2eyp+9LV4ZnnLQ4Nrl0rEiNjNAy3M5bffv5e38bz2UscjK7uWCKn1jMAZQyTY1ELIU/L59zC3dzaqqFGUEfys2iVJpvV0VpuyOC30hw6Uu3cNrQxWjeZujoAO8wcsZcPDdo1J/2GJs6fsQt7b+gt3S6fOWiBz1i3MTlQgjlD3q/KR0LpIOvdCw/2fdFfnjqOCgfod2ZybqhEwkalhv0+XRDua9+tf6B145aAAEqClpLTY13Cs3ZSNvOr+r9wxft2/Vednvffn3zyJBqcm1iQqAJQW77Jga62nDdLMmBHtH23mahTHjzL3/D3LiZMULDtYdVrkdDi3UzVF3NDzqvhOdTjC07SMes/VwXvIrX7TrxtVXXsO2ACWSJjBqirucZtME2zN4D2l12LY+c/3D5y9Hrl3i9xlzLyriaJnQcwfxpB3ir6AArYo8w9cVLeG3YT8QDuiYIGdx7JDs/VgCAepDjW1sdAGfH7m0de3fI/c6IfgCXEaEJUwiUclVGE6pysF1Z995DT8d+NL8XaRhsuPOXbPnuv9IzNMRmJVUyEyNPU2iZOPrQQf4w8yq2/LaMxfl/pregld/0juL7/RewLp1DDvtJ3G7xk0eu5xeR03Bb3ybjCI2BTvVv/ZPHt+bNfsywYxIhUGh4SLGzuJVeK0Onvp8VtZJT0l0yJaUh7cyOwQ7rb0qpI274n3gbFOAqEGT6NnYI0ZQR1GoK148kgNAmYogS10D3ehhe+QadBzppnjyGZNql+YWV7ADlNTzkS8kkwyseD5XhZCXGcD9GaS7XBG7mz/c/xHk3nUEwa/H1SCNnxA9w8EcJbgtEaTz7KxRve46UskkPtZFO5CtPpN3rjXT7bBsXTQk0cDNpFlsGUwJeviZ78Rl59JgBlZ8bEdZA56/++aHf2BPKygzgI7fHo0mK6gLcdzTt0hyl/aFH0+xyX9gsk14IBqUdDtCVTLA31s8uK07PoVGahaBG9zHkpNV84DzTK14qPpHfj1nCmrJ5YPggWMSdr6zgltvXQMCh59eV3Nx7JesrCrio5j3KfCGMYIAsOh3dw1RMOgldJilTHTJl2ZpSChA4TpaQYaKjcAiyfWhE9sRj+tJpozudd/56wvmPbBgBwZFC43+YDzjkBZqQ8slhM7gQ4S7vkdlVlaOqxqiQr3qgu1u29reJZmljaRr5QqitQjDdRUSctOoKl7Nh7D+JcO8Wvt6xgWUdr7GyaCrPjzuLl4vO4J6pV3D2v73N054LuXfCtWRqKuDdZ7jrrxZLjF2Mi7Wwt3IyVjhAqucghgEjxUVaOBzAMHS8AT++UARLOvR3djFmbI77zoYmZ2ZVmVHgk78++bevJ9aMutVYXP/R2T8qAQ6JIAFy7cS178ED82BrV/e+f7HTmXu32im3DQxdCPKlYpsmxHjXoUr38OL874gNtf9Me7Ccx1ODPL/2dq5teZYv9W1jad829i55FO2bAVSigPbN5RTu6CdzcB+ZzACjclxq+/bi7elRM/ot7iteLF620+Ak3cqcTr48zdTDRWVcdt03CAZ8BHPz2b9rl3xv89vmVUsWmEZ6OJPc0/SwAnHrJ6TLjykn+IECCXs13+Ud0npsp1BpgTD8wE6h6SXSxZc3mqfrHuWN0pMZScYxhMTICZMZHMKz5w3O6FjPRTvXcN53tlN0Fgob6ELEvq7RK330SBtzbIQDHtixs19N0zV0XxG3V57Fm6pIn14c52fn+WTeuFpn+mlnkY4P4A1GhD8QNB//zSPPdu/drcrywy9dfvuDjxzORn8uAhwSQQdkE5TsF2KrguIcBB0IpHKlKqzmgatfYpNWiszE8Ab8BE2NbNbGzthYQ72QiENassD9Lfef9TQFRQ6b/j6K3D9mEDLBoNLZPvNM/MUhqjY+hxyMyZmaMEqK8q7KG3WTXZxtX/GDL+bPWzClVAhDkFtSTn5BPvFkelPlSV+Yd6QJ+9wEADhchVkNswNC+1+aMFaZwq1J5VRcdtXyV5wDZrmWGezBjITxCHBsFyuTgYyFiPejd7egTB+OFsETf49QQGfQqAWPg0YG5YugwqPwkeHSoj53xeb7zPCqF/73RKUuOnytnbPgupl31FXM8HrU3EAox/D6zXd8PufJCUtuTKyJRvW+5ma17ChqlZ9KAPioup2lNat0Ryz+8Yzr3IfHfFHzhD0oy8KRoGwbLZNCpROo9Aj07QBs8IbBjIBmYugu0htBFlUhCkrwmwLdsklYuAsqNfOWqq47llw690d31d3k/07jrzJ8ThXjTy0AwHYme6bQnN1bPeWBouHMiqRj2QViRP/XSZdyZ8UydCGRSKlsV5JN6Vj9YnSshfED76oAFm3+MjHoidCl5yrbNYRWOAki5UqFIkLLySXX5yPs99CecuTCCq/xvQU55507x3whGl1jwFq56IOB3CJYtOhW9+MSH5+7AIo6XdDotpxwwkxfQr3tTWVdaSitLzEg8jJxdVfJGeLummUurmVGSDM9c4BTujdmC/qblLQtQqBLTYgu00d/wWS1smSe3K+X6uDRySmzySnRCUbw5kSQ4XxpW0Lc7Vu//0bjqeXi9sbVKoom6o+9GPqZBVAgWLhQZx00ss5ccOLCl5wdLaf1WHHHY+h6JpOiT0mpKyn/FKn1vFB16sYrUvueXLrnlfoBqfK6AK+mYysYRGZjSjENPGlPgOaiWh7Om9U2IMKjbE+uInecIljIidlOvju4Si7ZucrQzpnQ42+4uxoxI3XIgM+0FD71MQjQMvuUhzydPdfIZDKrCsLGwQN7GZCOm0KYttekwGTt5FD2GxO6aV6Fb8yIIS/0SunLUWpCHHlRP4R1oNjj221Z6ZUzYeX6hdevjfYnLuxwPP9ZJYXv6qF3OS/eJIp0iGd0p2jqaA/XnHSeccPv/kpD3WeuDB2T8QBr1qwx4lcsv6C/ZupTw5UT5QD+7N68MvetcJ77F4TzpKGrh4O+t16oKFp6uO3ChQs/EnCth9F/0fXzX9L1C7bn5OR/+Pl9wZyDT4BaCfY6NLfJE3I7vLlWKlKoMl9bcC+AOkK//09QIFQ0qrWcWJMzeP5XVqulVyqVU61S+VXOsDfP7cR0NyLs33s98um80K8O37wUiOihjSoK2how1oDR8H4s8d84/HsUDKJR7eWyvHMe8fvlPUJz/iCEs0HT3YPFFU5PpFwOnjn3wL4rpucq0NXy5ebH3fQ+N9YcUnr79Nk3deSPUZ1mcdKadqrlXnadky6ocTtDYad10XR344k1feoXZwUBHgTzk/qMgtYAegPo6kNL8bBAv8/NveEeXVcNQsuu1j3upsJyd2/F+Gxs7Fg18u/X/eSDbT5tieyoP5HZMm9eRbY/cSDQN6SbShKsKEGkLXewbb+0AqYqWDTJMzAwNDDnwnljxPeeSL1/T/t0G1QD6E2g5oZyT+3MZtZg27LKE9Aq0Cnx+QnbSupnTjJkdenTWlA9l7jtlr/liZnDSiGOphjyQY5atY5kMrWzve3HW+ODz7VaVktXbGRkMJHQU9IxjaDHs71nqCOWSr/E4kD22E3+KPUgsx5x9SilyWKP3/Y5uJoZUImMTX82paWee8s1//jOV/RX2v8Q/v49m9WWR2vfT2Udmyd82rVjzIOSc6CiFL2wMOBV7UXmGzcdiA1/yv7+i8Me98qZsyP9G3d15Y9k/CO6gY3ClJCD7pRGClTEcoiMHycDhSWOsfmtYGLh6Kdznttw8dF+rvdfhhzDu4k1oC8CJcDZCB0boQNcSKXgAHwewcmhZSOGOtPpnpS1Qkc7KaX0cS+TdZcIY1YYVTqcHMRSkO1pwzsy4JXJIdwO/2SlGnTEsmMa/1gEUIv/b0pJREHUfsCD6kB+HpHZ4bGWNTdngceAx5Dvr6qx6KMULMzXtVpbqTEJWxaH0pmcpKb5Cx23BYa0w2m8zxogHec4xznOcY5znOMc5/93/g8FQQtLdA5dhQAAAABJRU5ErkJggg=='
                        }
                        alt="Superhero cat"
                        width={96}
                        height={96}
                        style={{
                          display: 'inline-block',
                          objectFit: 'contain',
                          verticalAlign: 'middle',
                        }}
                      />
                      Dimensions: {metricsState.dimensions.join(', ')} · Search: {metricsState.searchTerm}
                    </div>
                  )}
                  {renderAsFieldStatsTable ? (
                    <SearchEmbeddablFieldStatsTableComponent
                      api={{
                        ...api,
                        fetchContext$,
                      }}
                      dataView={dataView!}
                      onAddFilter={
                        isEsqlMode(savedSearch) || !enableFilters ? undefined : addFilter
                      }
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
                        onAddFilter={enableFilters ? addFilter : undefined}
                        enableDocumentViewer={enableDocumentViewer}
                        expandedDoc={enableDocumentViewer ? expandedDoc : undefined}
                        initialDocViewerTabId={
                          enableDocumentViewer ? initialDocViewerTabId : undefined
                        }
                        docViewerRef={docViewerRef}
                        setExpandedDoc={enableDocumentViewer ? setExpandedDoc : undefined}
                        inlineEditing={{
                          isActive: isInlineEditing,
                          hasPendingChanges: hasPendingInlineTabChanges,
                          onApply: inlineEditingApi.applyInlineTabSelection,
                          onCancel: inlineEditingApi.cancelInlineTabSelection,
                        }}
                        stateManager={searchEmbeddable.stateManager}
                      />
                    </CellActionsProvider>
                  )}
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
