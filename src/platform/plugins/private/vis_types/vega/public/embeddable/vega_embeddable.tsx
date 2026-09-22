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
import type { DataView } from '@kbn/data-views-plugin/public';
import { dispatchRenderComplete } from '@kbn/kibana-utils-plugin/public';
import type { HasInspectorAdapters } from '@kbn/inspector-plugin/public';
import type {
  DefaultEmbeddableApi,
  EmbeddablePublicDefinition,
  HasDrilldowns,
  SerializedDrilldowns,
} from '@kbn/embeddable-plugin/public';
import { BehaviorSubject, combineLatest, EMPTY, map, merge, skip, switchMap, tap } from 'rxjs';
import type { Query } from '@kbn/es-query';
import { parse } from 'hjson';
import { ON_APPLY_FILTER, ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';
import {
  apiHasExecutionContext,
  apiIsPresentationContainer,
  areTriggersDisabled,
  fetch$,
  getInheritedViewMode,
  initializeStateApi,
  initializeTimeRangeManager,
  initializeTitleManager,
  type HasEditCapabilities,
  type ProjectRoutingOverrides,
  type PublishesBlockingError,
  type PublishesDataLoading,
  type PublishesDataViews,
  type PublishesWritableDescription,
  type PublishesWritableTitle,
  type PublishesEsqlUsage,
  type PublishesProjectRoutingOverrides,
  type PublishesRendered,
  type HasSupportedTriggers,
  type SerializedTimeRange,
  type SerializedTitles,
  timeRangeComparators,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { openLazyFlyout } from '@kbn/presentation-util';
import { VEGA_EMBEDDABLE_TYPE, VEGA_EVENT_APPLY_FILTER } from '../constants';
import type { VegaEvent } from '../types';
import type { VegaPluginStartDependencies, VegaVisualizationDependencies } from '../plugin';
import type { VegaParser } from '../data_model/vega_parser';
import { extractIndexPatternsFromSpec } from '../lib/extract_index_pattern';
import { extractProjectRoutingOverrides } from '../lib/extract_project_routing_overrides';
import { specUsesEsql } from '../lib/spec_uses_esql';
import { reportVegaRender } from '../lib/vega_render_telemetry';
import { createInspectorAdapters } from '../vega_inspector';

const LazyVegaVisComponent = lazy(() =>
  import('../async_services').then(({ VegaVisComponent }) => ({ default: VegaVisComponent }))
);

const parseSpec = (specString: string) => {
  try {
    return parse(specString, { legacyRoot: false, keepWsc: true });
  } catch {
    return undefined;
  }
};

/**
 * Everything `VegaVisComponent` needs for one render, captured together so that `showWarnings` can
 * only change alongside a new `visData` identity. The component rebuilds its Vega view when
 * `showWarnings` changes but only draws when `visData` changes, so the two must move as a pair.
 */
interface VegaRenderInput {
  showWarnings: boolean;
  visData: VegaParser;
}

/**
 * By-value state for the dedicated Dashboard Vega panel. The panel is UI-only: it is not
 * registered as a server embeddable, so it has no runtime schema and is treated as an unmapped
 * panel by the public Dashboard REST API (dropped on read, rejected on write).
 */
export type VegaByValueState = SerializedTitles &
  SerializedTimeRange &
  SerializedDrilldowns & {
    /** The Vega or Vega-Lite specification as an HJSON or JSON string. */
    spec: string;
  };

export type VegaEmbeddableApi = DefaultEmbeddableApi<VegaByValueState> &
  HasDrilldowns &
  HasEditCapabilities &
  HasInspectorAdapters &
  HasSupportedTriggers &
  PublishesBlockingError &
  PublishesDataLoading &
  PublishesWritableDescription &
  PublishesWritableTitle &
  PublishesEsqlUsage &
  PublishesProjectRoutingOverrides &
  PublishesDataViews &
  PublishesRendered;

interface VegaEmbeddableDependencies {
  uiActions: Pick<VegaPluginStartDependencies['uiActions'], 'executeTriggerActions'>;
  visualizationDependencies: VegaVisualizationDependencies;
}

export const vegaEmbeddableFactory = (
  core: CoreStart,
  deps: VegaEmbeddableDependencies
): EmbeddablePublicDefinition<VegaByValueState, VegaEmbeddableApi> => ({
  type: VEGA_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({
    initializeDrilldownsManager,
    initialState,
    finalizeApi,
    parentApi,
    uuid,
  }) => {
    const titleManager = initializeTitleManager(initialState);
    const timeRangeManager = initializeTimeRangeManager(initialState);
    const drilldownsManager = initializeDrilldownsManager(uuid, initialState);
    const spec$ = new BehaviorSubject(initialState.spec);
    const usesEsql$ = new BehaviorSubject(false);
    const projectRoutingOverrides$ = new BehaviorSubject<ProjectRoutingOverrides>(undefined);
    const dataViews$ = new BehaviorSubject<DataView[] | undefined>(undefined);

    // A spec change is parsed once for all three derived subjects. `switchMap` is used instead
    // of `tap` for dataViews$ because `extractIndexPatternsFromSpec` is async.
    const specSubscription = spec$
      .pipe(
        map(parseSpec),
        tap((spec) => {
          usesEsql$.next(spec ? specUsesEsql(spec) : false);
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

    const stateApi = initializeStateApi<VegaByValueState>({
      uuid,
      parentApi,
      serializeState: () => ({
        ...titleManager.getLatestState(),
        ...timeRangeManager.getLatestState(),
        ...drilldownsManager.getLatestState(),
        spec: spec$.getValue(),
      }),
      anyStateChange$: merge(
        titleManager.anyStateChange$,
        timeRangeManager.anyStateChange$,
        drilldownsManager.anyStateChange$,
        spec$.pipe(
          skip(1),
          map((): void => undefined)
        )
      ),
      getComparators: () => ({
        ...titleComparators,
        ...timeRangeComparators,
        ...drilldownsManager.comparators,
        spec: 'referenceEquality',
      }),
      applySerializedState: (nextState) => {
        titleManager.reinitializeState(nextState);
        timeRangeManager.reinitializeState(nextState);
        drilldownsManager.reinitializeState(nextState);
        spec$.next(nextState.spec);
      },
    });

    const api = finalizeApi({
      ...titleManager.api,
      ...timeRangeManager.api,
      ...drilldownsManager.api,
      ...stateApi,
      blockingError$,
      dataLoading$,
      rendered$,
      usesEsql$,
      projectRoutingOverrides$,
      dataViews$,
      supportedTriggers: () => [ON_APPLY_FILTER, ON_OPEN_PANEL_MENU],
      getTypeDisplayName: () => 'Vega',
      isEditingEnabled: () => true,
      onEdit: async ({ isNewPanel = false, returnFocus } = {}) => {
        const initialSpec = spec$.getValue();
        openLazyFlyout({
          core,
          parentApi,
          returnFocus,
          flyoutProps: {
            size: 'm',
            type: 'push',
            focusedPanelId: uuid,
          },
          loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
            const { VegaEditorFlyout } = await import('./vega_editor_flyout');
            return (
              <VegaEditorFlyout
                ariaLabelledBy={ariaLabelledBy}
                closeFlyout={closeFlyout}
                initialSpec={initialSpec}
                isNewPanel={isNewPanel}
                onPreview={(spec) => spec$.next(spec)}
                onSave={(spec) => spec$.next(spec)}
                onRevert={() => {
                  if (isNewPanel && apiIsPresentationContainer(parentApi)) {
                    parentApi.removePanel(api.uuid);
                  } else {
                    spec$.next(initialSpec);
                  }
                }}
              />
            );
          },
        });
      },
      getInspectorAdapters: () => inspectorAdapters,
    });

    const getExecutionContext = () => ({
      ...(apiHasExecutionContext(parentApi) ? parentApi.executionContext : {}),
      child: { type: VEGA_EMBEDDABLE_TYPE, name: 'Vega', id: uuid },
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

    const fetchSubscription = combineLatest([spec$, fetch$(api)])
      .pipe(
        switchMap(async ([spec, data]) => {
          abortController.abort();
          abortController = new AbortController();
          const { signal } = abortController;

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
            const requestHandler = createVegaRequestHandler(deps.visualizationDependencies, {
              abortSignal: signal,
              inspectorAdapters,
            });
            const visData = await requestHandler({
              timeRange,
              query: data.query as Query,
              filters: data.filters,
              visParams: { spec },
              searchSessionId: data.searchSessionId,
              executionContext: getExecutionContext(),
              projectRouting: data.projectRouting,
              isApproximate: data.isApproximate,
            });

            if (signal.aborted) {
              return;
            }
            // Show warnings only in edit mode matching the legacy vega behavior.
            renderInput$.next({
              showWarnings: getInheritedViewMode(api) === 'edit',
              visData,
            });
          } catch (error) {
            if (signal.aborted) {
              return;
            }
            renderInput$.next(undefined);
            blockingError$.next(error);
            // Nothing will render, so complete the shared item; otherwise Reporting waits for a
            // render that never happens.
            rendered$.next(true);
          } finally {
            if (!signal.aborted) {
              dataLoading$.next(false);
            }
          }
        })
      )
      .subscribe();

    return {
      api,
      Component: () => {
        const [renderInput, hideTitle, title, description, rendered] = useBatchedPublishingSubjects(
          renderInput$,
          api.hideTitle$,
          api.title$,
          api.description$,
          rendered$
        );
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
          <div
            ref={domNode}
            css={{ width: '100%', height: '100%', display: 'flex' }}
            data-render-complete={rendered}
            data-title={hideTitle ? '' : title ?? ''}
            data-description={description ?? ''}
            data-shared-item
          >
            {renderInput ? (
              <Suspense fallback={<EuiLoadingChart size="l" />}>
                <LazyVegaVisComponent
                  deps={deps.visualizationDependencies}
                  fireEvent={fireEvent}
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
