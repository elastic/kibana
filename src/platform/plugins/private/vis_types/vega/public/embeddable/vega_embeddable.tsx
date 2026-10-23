/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { fromStoredFilters } from '@kbn/as-code-filters-transforms';
import { toAsCodeQuery, toStoredQuery } from '@kbn/as-code-shared-transforms';
import type { DataView } from '@kbn/data-views-plugin/public';
import { AbortReason } from '@kbn/kibana-utils-plugin/common';
import { dispatchRenderComplete } from '@kbn/kibana-utils-plugin/public';
import type { HasInspectorAdapters } from '@kbn/inspector-plugin/public';
import type {
  DefaultEmbeddableApi,
  EmbeddablePublicDefinition,
  HasDrilldowns,
} from '@kbn/embeddable-plugin/public';
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  firstValueFrom,
  map,
  merge,
  skip,
  switchMap,
  tap,
} from 'rxjs';
import { isOfQueryType, type AggregateQuery, type Filter, type Query } from '@kbn/es-query';
import { parse } from 'hjson';
import { ON_APPLY_FILTER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import {
  apiHasExecutionContext,
  apiIsPresentationContainer,
  areTriggersDisabled,
  fetch$,
  getInheritedViewMode,
  initializeStateManager,
  initializeStateApi,
  initializeTimeRangeManager,
  initializeTitleManager,
  type CanCancelRequests,
  type HasEditCapabilities,
  type HasLibraryTransforms,
  type ProjectRoutingOverrides,
  type PublishesBlockingError,
  type PublishesDataLoading,
  type PublishesDataViews,
  type PublishesWritableDescription,
  type PublishesWritableTitle,
  type PublishesEsql,
  type PublishesWritableUnifiedSearch,
  type PublishesProjectRoutingOverrides,
  type PublishesRendered,
  type HasSupportedTriggers,
  type SupportsJsonExport,
  timeRangeComparators,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import {
  VEGA_EMBEDDABLE_TYPE,
  VEGA_STANDALONE_EMBEDDABLE_FLAG,
  VEGA_SUPPORTED_TRIGGERS,
} from '../../common/constants';
import { VEGA_EVENT_APPLY_FILTER } from '../constants';
import type { VegaEvent } from '../types';
import type { VegaPluginStartDependencies, VegaVisualizationDependencies } from '../plugin';
import type { VegaRenderDescriptor } from '../data_model/types';
import { extractIndexPatternsFromSpec } from '../lib/extract_index_pattern';
import { toPanelFilters } from '../lib/library_draft';
import { mergeQueries } from '../lib/merge_queries';
import { hasTooManyFilters, tooManyFiltersMessage } from '../components/vega_editor_body';
import {
  createVegaLibraryClient,
  hasVegaLibraryItemWithTitle,
} from '../library/vega_library_client';
import { extractProjectRoutingOverrides } from '../lib/extract_project_routing_overrides';
import { getEsqlQueriesFromSpec } from '../lib/spec_uses_esql';
import { reportVegaRender } from '../lib/vega_render_telemetry';
import { getDataViews } from '../services';
import { createInspectorAdapters } from '../vega_inspector';
import type { VegaByReferenceState, VegaByValueState, VegaEmbeddableState } from '../../server';
// Frame only. The spec editor stays a separate lazy chunk inside this module, so Edit does not
// wait on `vega_editor_flyout` before the flyout can render.
import { VegaEditorFlyout } from './vega_editor_flyout';
import { openVegaEditor } from './open_vega_editor';

const LazyVegaVisComponent = lazy(() =>
  import('../async_services').then(({ VegaVisComponent }) => ({ default: VegaVisComponent }))
);

/**
 * Everything `VegaVisComponent` needs for one render, captured together so that `showWarnings` can
 * only change alongside a new `visData` identity. The component rebuilds its Vega view when
 * `showWarnings` changes but only draws when `visData` changes, so the two must move as a pair.
 */
interface VegaRenderInput {
  showWarnings: boolean;
  visData: VegaRenderDescriptor;
}

/**
 * API of the dedicated Dashboard Vega panel. The panel stores its spec by value, or references a
 * Vega library item.
 *
 * When `vega.standaloneEmbeddable` is enabled, the server registers a schema for this type so it
 * participates in public dashboards-as-code validation and OpenAPI generation.
 */
export type VegaEmbeddableApi = DefaultEmbeddableApi<VegaEmbeddableState> &
  Partial<HasLibraryTransforms<VegaByReferenceState, VegaByValueState>> &
  CanCancelRequests &
  HasDrilldowns &
  HasEditCapabilities &
  HasInspectorAdapters &
  HasSupportedTriggers &
  SupportsJsonExport &
  PublishesBlockingError &
  PublishesDataLoading &
  PublishesWritableDescription &
  PublishesWritableTitle &
  PublishesEsql &
  PublishesWritableUnifiedSearch &
  PublishesProjectRoutingOverrides &
  PublishesDataViews &
  PublishesRendered & {
    /** Returns the editor panel content for an already-open flyout. */
    getEditPanel?: (options: {
      ariaLabelledBy: string;
      closeFlyout?: () => void;
      isNewPanel?: boolean;
    }) => Promise<JSX.Element | undefined>;
  };

interface VegaEmbeddableDependencies {
  uiActions: Pick<VegaPluginStartDependencies['uiActions'], 'executeTriggerActions'>;
  SearchBar: VegaPluginStartDependencies['unifiedSearch']['ui']['SearchBar'];
  visualizationDependencies: VegaVisualizationDependencies;
  /** Used to edit the library item of a by-reference panel. */
  libraryEditorDependencies: Pick<VegaPluginStartDependencies, 'dataViews' | 'unifiedSearch'>;
  /** Whether panels can be linked to and unlinked from the library. */
  isLibraryEnabled: boolean;
}

export const vegaEmbeddableFactory = (
  core: CoreStart,
  deps: VegaEmbeddableDependencies
): EmbeddablePublicDefinition<VegaEmbeddableState, VegaEmbeddableApi> => ({
  type: VEGA_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({
    initializeDrilldownsManager,
    initialState,
    finalizeApi,
    parentApi,
    uuid,
  }) => {
    const libraryClient = createVegaLibraryClient(core.http);
    // Linking and unlinking replace the panel, so a panel stays by value or by reference.
    const libraryId = 'ref_id' in initialState ? initialState.ref_id : undefined;
    const isByReference = libraryId !== undefined;
    // Throws `SavedObjectNotFound` for a missing item, which the panel shows as an error.
    const libraryItem$ = new BehaviorSubject(
      isByReference ? (await libraryClient.get(libraryId)).data : undefined
    );
    const initialLibraryItem = libraryItem$.getValue();

    const titleManager = initializeTitleManager(initialState);
    const timeRangeManager = initializeTimeRangeManager(initialState);
    const drilldownsManager = initializeDrilldownsManager(uuid, initialState);
    const spec$ = new BehaviorSubject(
      initialLibraryItem ? initialLibraryItem.spec : (initialState as VegaByValueState).spec
    );
    const defaultTitle$ = new BehaviorSubject(initialLibraryItem?.title);
    const defaultDescription$ = new BehaviorSubject(initialLibraryItem?.description);
    const panelSearchStateManager = initializeStateManager<{
      query?: Query | AggregateQuery;
      filters?: Filter[];
    }>(
      {
        query: toStoredQuery(initialState.query),
        filters: toPanelFilters(initialState.filters),
      },
      {
        query: undefined,
        filters: undefined,
      },
      {
        query: 'deepEquality',
        filters: 'deepEquality',
      }
    );
    const esql$ = new BehaviorSubject<AggregateQuery[]>([]);
    const approximationApplied$ = new BehaviorSubject<boolean | undefined>(undefined);
    const projectRoutingOverrides$ = new BehaviorSubject<ProjectRoutingOverrides>(undefined);
    const dataViews$ = new BehaviorSubject<DataView[] | undefined>(undefined);

    // A spec change is parsed once for all derived subjects. `switchMap` is used instead
    // of `tap` for dataViews$ because `extractIndexPatternsFromSpec` is async.
    const specSubscription = spec$
      .pipe(
        map((spec) => {
          if (spec.format === 'json') return spec.value;
          try {
            return parse(spec.value, { legacyRoot: false, keepWsc: true });
          } catch {
            return undefined;
          }
        }),
        tap((spec) => {
          esql$.next(spec ? getEsqlQueriesFromSpec(spec).map((esql) => ({ esql })) : []);
          projectRoutingOverrides$.next(spec ? extractProjectRoutingOverrides(spec) : undefined);
        }),
        switchMap((spec) => (spec ? extractIndexPatternsFromSpec(spec) : EMPTY))
      )
      .subscribe((dataViews) => dataViews$.next(dataViews));

    const renderInput$ = new BehaviorSubject<VegaRenderInput | undefined>(undefined);
    const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
    const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
    const rendered$ = new BehaviorSubject(false);
    const inspectorAdapters = createInspectorAdapters();
    let abortController = new AbortController();

    const serializePanelOwnedState = () => ({
      ...titleManager.getLatestState(),
      ...timeRangeManager.getLatestState(),
      ...drilldownsManager.getLatestState(),
    });

    const serializePanelSearch = () => {
      const panelQuery = panelSearchStateManager.api.query$.getValue();
      return {
        query: isOfQueryType(panelQuery) ? toAsCodeQuery(panelQuery) : undefined,
        filters: fromStoredFilters(panelSearchStateManager.api.filters$.getValue()),
      };
    };

    // Unlinking keeps what the library item and the panel each apply: the filters of both, and
    // one query, plus a filter when their query languages differ.
    const serializeByValue = (): VegaByValueState => {
      const libraryItem = libraryItem$.getValue();
      const panelSearch = serializePanelSearch();
      if (!libraryItem) {
        return { ...serializePanelOwnedState(), ...panelSearch, spec: spec$.getValue() };
      }
      const { query, filters: queryFilters } = mergeQueries(libraryItem.query, panelSearch.query);
      const filters = [
        ...(libraryItem.filters ?? []),
        ...(panelSearch.filters ?? []),
        ...queryFilters,
      ];
      return {
        ...serializePanelOwnedState(),
        query,
        filters: filters.length ? filters : undefined,
        spec: libraryItem.spec,
      };
    };

    // Linking moves the panel query and filters to the new library item.
    const serializeByReference = (refId: string): VegaByReferenceState => ({
      ...serializePanelOwnedState(),
      ref_id: refId,
    });

    const stateApi = initializeStateApi<VegaEmbeddableState>({
      uuid,
      parentApi,
      serializeState: () =>
        isByReference
          ? { ...serializeByReference(libraryId), ...serializePanelSearch() }
          : { ...serializePanelOwnedState(), ...serializePanelSearch(), spec: spec$.getValue() },
      anyStateChange$: merge(
        titleManager.anyStateChange$,
        timeRangeManager.anyStateChange$,
        drilldownsManager.anyStateChange$,
        spec$.pipe(
          skip(1),
          map((): void => undefined)
        ),
        panelSearchStateManager.anyStateChange$
      ),
      getComparators: () => ({
        ...titleComparators,
        ...timeRangeComparators,
        ...drilldownsManager.comparators,
        query: 'deepEquality',
        filters: 'deepEquality',
        // The library item's spec is saved by its editor, not with the dashboard.
        spec: isByReference ? 'skip' : 'deepEquality',
        ref_id: 'skip',
      }),
      applySerializedState: (nextState) => {
        titleManager.reinitializeState(nextState);
        timeRangeManager.reinitializeState(nextState);
        drilldownsManager.reinitializeState(nextState);
        panelSearchStateManager.reinitializeState({
          query: toStoredQuery(nextState.query),
          filters: toPanelFilters(nextState.filters),
        });
        if ('spec' in nextState) spec$.next(nextState.spec);
      },
    });

    const reloadLibraryItem = async (refId: string) => {
      try {
        const { data } = await libraryClient.get(refId);
        defaultTitle$.next(data.title);
        defaultDescription$.next(data.description);
        spec$.next(data.spec);
        libraryItem$.next(data);
        blockingError$.next(undefined);
      } catch (error) {
        blockingError$.next(error);
      }
    };

    const libraryTransforms: HasLibraryTransforms<VegaByReferenceState, VegaByValueState> = {
      canLinkToLibrary: async () => !isByReference,
      canUnlinkFromLibrary: async () => isByReference,
      hasLibraryItemWithTitle: (title) => hasVegaLibraryItemWithTitle(libraryClient, title),
      saveToLibrary: async (title) => {
        const { query, filters } = serializePanelSearch();
        if (hasTooManyFilters(filters)) {
          // The dashboard only reports that saving failed, so explain why.
          core.notifications.toasts.addDanger(tooManyFiltersMessage);
          throw new Error(tooManyFiltersMessage);
        }
        const { id } = await libraryClient.create({
          title,
          description: titleManager.getLatestState().description,
          spec: spec$.getValue(),
          query,
          filters,
        });
        return id;
      },
      getSerializedStateByReference: serializeByReference,
      getSerializedStateByValue: serializeByValue,
    };

    const getEditPanel = async ({
      ariaLabelledBy,
      closeFlyout = () => {},
      isNewPanel = false,
    }: {
      ariaLabelledBy: string;
      closeFlyout?: () => void;
      isNewPanel?: boolean;
    }) => {
      const initialSpec = spec$.getValue();
      const initialSearch = panelSearchStateManager.getLatestState();
      // A missing default data view shouldn't block editing.
      const defaultDataView =
        (await getDataViews()
          .getDefault()
          .catch((): null => null)) ?? undefined;
      return (
        <VegaEditorFlyout
          api={api}
          ariaLabelledBy={ariaLabelledBy}
          SearchBar={deps.SearchBar}
          closeFlyout={closeFlyout}
          defaultDataView={defaultDataView}
          initialSpec={initialSpec}
          isNewPanel={isNewPanel}
          onPreview={(spec) => spec$.next(spec)}
          onSave={(spec) => spec$.next(spec)}
          onRevert={() => {
            if (isNewPanel && apiIsPresentationContainer(parentApi)) {
              parentApi.removePanel(api.uuid);
            } else {
              spec$.next(initialSpec);
              panelSearchStateManager.reinitializeState(initialSearch);
            }
          }}
        />
      );
    };

    const api = finalizeApi({
      ...titleManager.api,
      ...timeRangeManager.api,
      ...drilldownsManager.api,
      ...panelSearchStateManager.api,
      ...stateApi,
      blockingError$,
      dataLoading$,
      rendered$,
      esql$,
      approximationApplied$,
      projectRoutingOverrides$,
      dataViews$,
      cancelRequests: (reason) => abortController.abort(reason),
      supportedTriggers: () => VEGA_SUPPORTED_TRIGGERS,
      getTypeDisplayName: () => 'Vega',
      isEditingEnabled: () => true,
      defaultTitle$,
      defaultDescription$,
      ...(deps.isLibraryEnabled && libraryTransforms),
      getEditPanel,
      onEdit: async ({ isNewPanel = false, returnFocus } = {}) => {
        if (isByReference) {
          const { openVegaLibraryEditor } = await import('../library/open_vega_library_editor');
          await openVegaLibraryEditor({
            core,
            deps: deps.libraryEditorDependencies,
            id: libraryId,
            panel: {
              parentApi,
              uuid,
              onPreview: ({ spec, query, filters }) => {
                const libraryItem = libraryItem$.getValue();
                if (!libraryItem) return;
                spec$.next(spec);
                libraryItem$.next({ ...libraryItem, query, filters });
              },
            },
          });
          // Shows the saved item again, which also reverts a preview that wasn't saved.
          await reloadLibraryItem(libraryId);
          returnFocus?.();
          return;
        }
        openVegaEditor({
          core,
          parentApi,
          returnFocus,
          focusedPanelId: uuid,
          isNewPanel,
          loadApi: async () => api,
        });
      },
      getInspectorAdapters: () => inspectorAdapters,
      // Only when the flag is on: the public dashboards-as-code schema is registered then, so
      // exported JSON can be round-tripped through the REST API.
      supportsJsonExport: await firstValueFrom(
        core.featureFlags.getBooleanValue$(VEGA_STANDALONE_EMBEDDABLE_FLAG, false)
      ),
    });

    // Identities must be stable: `VegaVisComponent` rebuilds its Vega view whenever `fireEvent`
    // changes and re-renders whenever `renderComplete` changes.
    const fireEvent = (event: VegaEvent) => {
      // `VegaEvent` narrows `name` to the filter event, but the emitter (`vega_base_view.js`) is
      // untyped JavaScript, so the compiler cannot enforce that on the calling side.
      if (event.name !== VEGA_EVENT_APPLY_FILTER || areTriggersDisabled(api)) {
        return;
      }
      deps.uiActions.executeTriggerActions(ON_APPLY_FILTER, {
        embeddable: api,
        ...event.data,
      });
    };

    const onRenderComplete = () => {
      const visData = renderInput$.getValue()?.visData;
      if (visData) {
        reportVegaRender({
          containerType: apiHasExecutionContext(parentApi)
            ? parentApi.executionContext.type
            : undefined,
          isVegaLite: visData.isVegaLite,
          useMap: visData.useMap,
        });
      }
      rendered$.next(true);
    };

    const fetchSubscription = combineLatest([
      spec$,
      fetch$(api),
      panelSearchStateManager.api.query$,
      panelSearchStateManager.api.filters$,
      libraryItem$,
    ])
      .pipe(
        switchMap(async ([spec, data, panelQuery, panelFilters, libraryItem]) => {
          abortController.abort();
          abortController = new AbortController();
          const { signal } = abortController;
          // A cancelled request can still resolve with partial results, but once a newer fetch
          // starts, that fetch owns the loading state.
          const isCurrentFetch = () =>
            abortController.signal === signal &&
            (!signal.aborted || signal.reason === AbortReason.CANCELED);

          rendered$.next(false);
          dataLoading$.next(true);
          blockingError$.next(undefined);
          inspectorAdapters.requests.reset();

          const timeRange = data.timeslice
            ? {
                from: new Date(data.timeslice[0]).toISOString(),
                to: new Date(data.timeslice[1]).toISOString(),
                mode: 'absolute' as const,
              }
            : data.timeRange;

          try {
            const { createVegaRequestHandler } = await import('../async_services');
            if (signal.aborted) {
              if (isCurrentFetch()) rendered$.next(true);
              return;
            }
            const requestHandler = createVegaRequestHandler(deps.visualizationDependencies, {
              abortSignal: signal,
              inspectorAdapters,
            });
            const visData = await requestHandler({
              timeRange,
              // buildEsQuery ANDs these and ignores empty and ES|QL queries.
              query: [data.query, toStoredQuery(libraryItem?.query), panelQuery].filter(
                isOfQueryType
              ),
              filters: [
                ...(data.filters ?? []),
                ...(toPanelFilters(libraryItem?.filters) ?? []),
                ...(panelFilters ?? []),
              ],
              visParams: {
                spec: spec.format === 'json' ? JSON.stringify(spec.value) : spec.value,
              },
              searchSessionId: data.searchSessionId,
              executionContext: {
                ...(apiHasExecutionContext(parentApi) ? parentApi.executionContext : {}),
                child: { type: VEGA_EMBEDDABLE_TYPE, name: 'Vega', id: uuid },
              },
              projectRouting: data.projectRouting,
              isApproximate: data.isApproximate,
              esqlVariables: data.esqlVariables,
            });

            if (!isCurrentFetch()) {
              return;
            }
            approximationApplied$.next(visData.approximationApplied);
            // Show warnings only in edit mode matching the legacy vega behavior.
            renderInput$.next({
              showWarnings: getInheritedViewMode(api) === 'edit',
              visData,
            });
          } catch (error) {
            if (signal.aborted) {
              // A cancel is not an error; keep whatever the panel already shows.
              if (isCurrentFetch()) rendered$.next(true);
              return;
            }
            renderInput$.next(undefined);
            blockingError$.next(error);
            // Nothing will render, so complete the shared item; otherwise Reporting waits for a
            // render that never happens.
            rendered$.next(true);
          } finally {
            if (isCurrentFetch()) {
              dataLoading$.next(false);
            }
          }
        })
      )
      .subscribe();

    return {
      api,
      Component: () => {
        const [renderInput, rendered] = useBatchedPublishingSubjects(renderInput$, rendered$);
        const domNode = useRef<HTMLDivElement>(null);

        useEffect(
          () => () => {
            abortController.abort();
            fetchSubscription.unsubscribe();
            specSubscription.unsubscribe();
            drilldownsManager.cleanup();
          },
          []
        );

        useEffect(() => {
          if (rendered && domNode.current) {
            dispatchRenderComplete(domNode.current);
          }
        }, [rendered]);

        return (
          <div ref={domNode} css={{ width: '100%', height: '100%', display: 'flex' }}>
            {renderInput ? (
              <Suspense fallback={<EuiLoadingChart size="l" />}>
                <LazyVegaVisComponent
                  deps={deps.visualizationDependencies}
                  fireEvent={fireEvent}
                  inspectorAdapters={inspectorAdapters}
                  renderComplete={onRenderComplete}
                  showWarnings={renderInput.showWarnings}
                  visData={renderInput.visData}
                />
              </Suspense>
            ) : null}
          </div>
        );
      },
    };
  },
});
