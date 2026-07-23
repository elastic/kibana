/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type {
  DefaultEmbeddableApi,
  EmbeddablePublicDefinition,
  HasDrilldowns,
} from '@kbn/embeddable-plugin/public';
import { BehaviorSubject, combineLatest, map, merge, skip, switchMap } from 'rxjs';
import type { Query } from '@kbn/es-query';
import type { ExpressionRendererParams } from '@kbn/expressions-plugin/public';
import { parse } from 'hjson';
import {
  apiHasExecutionContext,
  apiIsPresentationContainer,
  areTriggersDisabled,
  fetch$,
  initializeStateApi,
  initializeTimeRangeManager,
  initializeTitleManager,
  type ProjectRoutingOverrides,
  type PublishesDataViews,
  type PublishesEsqlUsage,
  type PublishesProjectRoutingOverrides,
  type HasSupportedTriggers,
  timeRangeComparators,
  titleComparators,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { openLazyFlyout } from '@kbn/presentation-util';
import { VEGA_EMBEDDABLE_SUPPORTED_TRIGGERS, VEGA_EMBEDDABLE_TYPE } from '../../common/constants';
import type { VegaByValueState } from './types';
import type { VegaPluginStartDependencies } from '../plugin';
import { toVegaEmbeddableExpressionAst } from '../to_ast';
import { extractIndexPatternsFromSpec } from '../lib/extract_index_pattern';
import { extractProjectRoutingOverrides } from '../lib/extract_project_routing_overrides';
import { specUsesEsql } from '../lib/spec_uses_esql';
import { createInspectorAdapters, type VegaInspectorAdapters } from '../vega_inspector';

const parseSpec = (specString: string) => {
  try {
    return parse(specString, { legacyRoot: false, keepWsc: true });
  } catch {
    return undefined;
  }
};

const getSpecUsesEsql = (specString: string): boolean => {
  const spec = parseSpec(specString);
  return spec ? specUsesEsql(spec) : false;
};

const getProjectRoutingOverrides = (specString: string): ProjectRoutingOverrides => {
  const spec = parseSpec(specString);
  return spec ? extractProjectRoutingOverrides(spec) : undefined;
};

const getDataViews = async (specString: string): Promise<DataView[] | undefined> => {
  const spec = parseSpec(specString);
  return spec ? extractIndexPatternsFromSpec(spec) : undefined;
};

export interface VegaEmbeddableApi
  extends DefaultEmbeddableApi<VegaByValueState>,
    HasDrilldowns,
    HasSupportedTriggers,
    PublishesEsqlUsage,
    PublishesProjectRoutingOverrides,
    PublishesDataViews {
  rendered$: BehaviorSubject<boolean>;
  getInspectorAdapters: () => VegaInspectorAdapters | undefined;
  getTypeDisplayName: () => string;
  isEditingEnabled: () => boolean;
  onEdit: (options?: { isNewPanel?: boolean }) => void;
  openInspector: () => unknown;
}

interface VegaEmbeddableDependencies {
  expressions: Pick<VegaPluginStartDependencies['expressions'], 'ReactExpressionRenderer'>;
  inspector: Pick<VegaPluginStartDependencies['inspector'], 'isAvailable' | 'open'>;
  uiActions: Pick<VegaPluginStartDependencies['uiActions'], 'executeTriggerActions'>;
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
    const usesEsql$ = new BehaviorSubject(getSpecUsesEsql(initialState.spec));
    const projectRoutingOverrides$ = new BehaviorSubject<ProjectRoutingOverrides>(
      getProjectRoutingOverrides(initialState.spec)
    );
    const dataViews$ = new BehaviorSubject<DataView[] | undefined>(undefined);
    const specSubscription = spec$.subscribe((spec) => {
      const usesEsql = getSpecUsesEsql(spec);
      if (usesEsql$.getValue() !== usesEsql) {
        usesEsql$.next(usesEsql);
      }
      projectRoutingOverrides$.next(getProjectRoutingOverrides(spec));
    });
    const dataViewsSubscription = spec$
      .pipe(switchMap((spec) => getDataViews(spec)))
      .subscribe((dataViews) => {
        if (dataViews) {
          dataViews$.next(dataViews);
        }
      });
    const expressionParams$ = new BehaviorSubject<ExpressionRendererParams>({ expression: '' });
    const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
    const rendered$ = new BehaviorSubject(false);
    const inspectorAdapters$ = new BehaviorSubject<VegaInspectorAdapters>(
      createInspectorAdapters()
    );
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
      dataLoading$,
      rendered$,
      usesEsql$,
      projectRoutingOverrides$,
      dataViews$,
      supportedTriggers: () => VEGA_EMBEDDABLE_SUPPORTED_TRIGGERS,
      getTypeDisplayName: () => 'Vega',
      isEditingEnabled: () => true,
      onEdit: ({ isNewPanel = false } = {}) => {
        const initialSpec = spec$.getValue();
        let cancelled = false;
        const save = (spec: string) => {
          cancelled = true;
          spec$.next(spec);
        };
        const cancel = () => {
          if (cancelled) return;
          cancelled = true;
          if (isNewPanel && apiIsPresentationContainer(parentApi)) {
            parentApi.removePanel(api.uuid);
          } else {
            spec$.next(initialSpec);
          }
        };
        openLazyFlyout({
          core,
          parentApi,
          flyoutProps: {
            size: 's',
            type: 'push',
          },
          loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
            const { VegaEditorFlyout } = await import('./vega_editor_flyout');
            return (
              <VegaEditorFlyout
                ariaLabelledBy={ariaLabelledBy}
                closeFlyout={closeFlyout}
                initialSpec={initialSpec}
                onApply={(spec) => spec$.next(spec)}
                onCancel={() => {
                  cancel();
                  closeFlyout();
                }}
                onSave={save}
              />
            );
          },
        });
      },
      getInspectorAdapters: () => inspectorAdapters$.getValue(),
      openInspector: () => {
        const adapters = inspectorAdapters$.getValue();
        return adapters && deps.inspector.isAvailable(adapters)
          ? deps.inspector.open(adapters, { title: titleManager.api.title$.getValue() ?? 'Vega' })
          : undefined;
      },
    });

    const fetchSubscription = combineLatest([spec$, fetch$(api)]).subscribe(([spec, data]) => {
      abortController.abort();
      abortController = new AbortController();
      rendered$.next(false);
      const timeRange = data.timeslice
        ? {
            from: new Date(data.timeslice[0]).toISOString(),
            to: new Date(data.timeslice[1]).toISOString(),
            mode: 'absolute' as const,
          }
        : data.timeRange;
      dataLoading$.next(true);
      expressionParams$.next({
        expression: toVegaEmbeddableExpressionAst(spec),
        abortController,
        searchContext: {
          timeRange,
          query: data.query as Query,
          filters: data.filters,
          projectRouting: data.projectRouting,
          isApproximate: data.isApproximate,
          disableWarningToasts: true,
        },
        searchSessionId: data.searchSessionId,
        interactive: !areTriggersDisabled(api),
        inspectorAdapters: inspectorAdapters$.getValue(),
        executionContext: {
          ...(apiHasExecutionContext(parentApi) ? parentApi.executionContext : {}),
          child: { type: VEGA_EMBEDDABLE_TYPE, name: 'Vega', id: uuid },
        },
        onData$: (_, adapters) => {
          inspectorAdapters$.next(typeof adapters === 'function' ? adapters() : adapters);
          dataLoading$.next(false);
        },
        onRender$: () => rendered$.next(true),
        onEvent: async (event) => {
          if (event.name === 'applyFilter' && !areTriggersDisabled(api)) {
            await deps.uiActions.executeTriggerActions(VEGA_EMBEDDABLE_SUPPORTED_TRIGGERS[0], {
              embeddable: api,
              ...event.data,
            });
          }
        },
      });
    });

    return {
      api,
      Component: () => {
        const expressionParams = useStateFromPublishingSubject(expressionParams$);
        useEffect(
          () => () => {
            abortController.abort();
            fetchSubscription.unsubscribe();
            specSubscription.unsubscribe();
            dataViewsSubscription.unsubscribe();
            drilldownsManager.cleanup();
          },
          []
        );
        return <deps.expressions.ReactExpressionRenderer {...expressionParams} />;
      },
    };
  },
});
