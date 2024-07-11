/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiLoadingChart } from '@elastic/eui';
import { isChartSizeEvent } from '@kbn/chart-expressions-common';
import { EmbeddableStart, ReactEmbeddableFactory, ViewMode } from '@kbn/embeddable-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { ExpressionRendererParams, useExpressionRenderer } from '@kbn/expressions-plugin/public';
import { i18n } from '@kbn/i18n';
import { apiPublishesDataView, apiPublishesSettings } from '@kbn/presentation-containers';
import {
  apiHasAppContext,
  apiHasDisableTriggers,
  apiHasExecutionContext,
  apiPublishesUnifiedSearch,
  apiPublishesViewMode,
  apiIsOfType,
  fetch$,
  initializeTitles,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { apiPublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import { get, isEmpty, isEqual } from 'lodash';
import React, { useRef } from 'react';
import { BehaviorSubject, switchMap } from 'rxjs';
import { VISUALIZE_APP_NAME, VISUALIZE_EMBEDDABLE_TYPE } from '../../common/constants';
import { VIS_EVENT_TO_TRIGGER } from '../embeddable';
import { getInspector, getTimeFilter, getUiActions } from '../services';
import { urlFor } from '../utils/saved_visualize_utils';
import type { SerializedVis, Vis } from '../vis';
import { NavigateToLensFn } from '../visualize_app/utils/use/use_embeddable_api_handler';
import { createVisInstance } from './create_vis_instance';
import { getExpressionRendererProps } from './get_expression_renderer_props';
import { saveToLibrary } from './save_to_library';
import { deserializeState, serializeState } from './state';
import {
  ExtraSavedObjectProperties,
  VisualizeApi,
  VisualizeOutputState,
  VisualizeRuntimeState,
  VisualizeSerializedState,
} from './types';

export const getVisualizeEmbeddableFactory: (
  embeddableStart: EmbeddableStart
) => ReactEmbeddableFactory<VisualizeSerializedState, VisualizeRuntimeState, VisualizeApi> = (
  embeddableStart
) => ({
  type: VISUALIZE_EMBEDDABLE_TYPE,
  deserializeState,
  buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
    const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);

    const renderCount$ = new BehaviorSubject<number>(0);
    const hasRendered$ = new BehaviorSubject<boolean>(false);

    const serializedVis$ = new BehaviorSubject<SerializedVis>(state.serializedVis);
    const initialVisInstance = await createVisInstance(state.serializedVis);
    const vis$ = new BehaviorSubject<Vis>(initialVisInstance);

    // when the serialized vis changes, update the vis instance
    serializedVis$.subscribe(async (serializedVis) => {
      vis$.next(await createVisInstance(serializedVis));
    });

    const savedObjectId$ = new BehaviorSubject<string | undefined>(state.savedObjectId);
    const savedObjectProperties$ = new BehaviorSubject<ExtraSavedObjectProperties | undefined>(
      undefined
    );
    const linkedToLibrary$ = new BehaviorSubject<boolean | undefined>(state.linkedToLibrary);
    const visData$ = new BehaviorSubject<unknown>({});

    const searchSessionId$ = new BehaviorSubject<string | undefined>('');
    const timeRange$ = new BehaviorSubject<TimeRange | undefined>(undefined);
    const expressionParams$ = new BehaviorSubject<ExpressionRendererParams>({
      expression: '',
    });
    const expressionAbortController$ = new BehaviorSubject<AbortController>(new AbortController());
    const viewMode$ = apiPublishesViewMode(parentApi)
      ? parentApi.viewMode
      : new BehaviorSubject(ViewMode.VIEW);

    const executionContext = apiHasExecutionContext(parentApi)
      ? parentApi.executionContext
      : undefined;
    const disableTriggers = apiHasDisableTriggers(parentApi)
      ? parentApi.disableTriggers
      : undefined;
    const parentApiContext = apiHasAppContext(parentApi) ? parentApi.getAppContext() : undefined;

    const inspectorAdapters$ = new BehaviorSubject<Record<string, unknown>>({});

    let updateExpressionParams = async () => {};

    const api = buildApi(
      {
        ...titlesApi,
        serializeState: () => {
          const savedObjectProperties = savedObjectProperties$.getValue();
          return serializeState({
            serializedVis: vis$.getValue().serialize(),
            titles: serializeTitles(),
            id: savedObjectId$.getValue(),
            linkedToLibrary:
              // In the visualize editor, linkedToLibrary should always be false to force the full state to be serialized,
              // instead of just passing a reference to the linked saved object. Other contexts like dashboards should
              // serialize the state with just the savedObjectId so that the current revision of the vis is always used
              apiIsOfType(parentApi, VISUALIZE_APP_NAME) ? false : linkedToLibrary$.getValue(),
            ...(savedObjectProperties ? { savedObjectProperties } : {}),
          });
        },
        getVis: () => vis$.getValue(),
        getTitles: () => serializeTitles(),
        getTypeDisplayName: () =>
          i18n.translate('visualizations.displayName', {
            defaultMessage: 'visualization',
          }),
        onEdit: async () => {
          const stateTransferService = embeddableStart.getStateTransfer();
          const visId = savedObjectId$.getValue();
          const editPath = visId ? urlFor(visId) : '#/edit_by_value';
          await stateTransferService.navigateToEditor('visualize', {
            path: editPath,
            state: {
              embeddableId: uuid,
              valueInput: {
                savedVis: vis$.getValue().serialize(),
                title: api.panelTitle?.getValue(),
                description: api.panelDescription?.getValue(),
                timeRange: timeRange$.getValue(),
              },
              originatingApp: parentApiContext?.currentAppId ?? '',
              searchSessionId: searchSessionId$.getValue() || undefined,
              originatingPath: parentApiContext?.getCurrentPath?.(),
            },
          });
        },
        isEditingEnabled: () => viewMode$.getValue() === ViewMode.EDIT,
        updateVis: async (visUpdates) => {
          const currentSerializedVis = vis$.getValue().serialize();
          serializedVis$.next({
            ...currentSerializedVis,
            ...visUpdates,
            params: {
              ...currentSerializedVis.params,
              ...visUpdates.params,
            },
            data: {
              ...currentSerializedVis.data,
              ...visUpdates.data,
            },
          } as SerializedVis);
          await updateExpressionParams();
        },
        subscribeToInitialRender: (listener) => hasRendered$.subscribe(listener),
        subscribeToVisData: (listener) => visData$.subscribe(listener),
        subscribeToHasInspector: (listener) =>
          inspectorAdapters$.subscribe((value) => listener(!isEmpty(value))),
        subscribeToNavigateToLens: (listener) =>
          vis$
            .pipe(
              switchMap((vis) => {
                return (async () => {
                  if (!vis.type.navigateToLens) return;
                  const expressionVariables = await vis.type.getExpressionVariables?.(
                    vis,
                    getTimeFilter()
                  );
                  if (!expressionVariables?.canNavigateToLens) return;
                  const navigateToLens: NavigateToLensFn = async (timefilter) =>
                    vis.type.navigateToLens!(vis, timefilter);
                  return navigateToLens;
                })();
              })
            )
            .subscribe(async (navigateToLensFn) => {
              if (navigateToLensFn) listener(navigateToLensFn);
            }),
        openInspector: () => {
          const adapters = inspectorAdapters$.getValue();
          if (!adapters) return;
          const inspector = getInspector();
          if (!inspector.isAvailable(adapters)) return;
          return getInspector().open(adapters, {
            title:
              titlesApi.panelTitle?.getValue() ||
              i18n.translate('visualizations.embeddable.inspectorTitle', {
                defaultMessage: 'Inspector',
              }),
          });
        },
        // library transforms
        saveToLibrary: (newTitle: string) => {
          titlesApi.setPanelTitle(newTitle);
          const { rawState, references } = serializeState({
            serializedVis: vis$.getValue().serialize(),
            titles: {
              ...serializeTitles(),
              title: newTitle,
            },
          });
          return saveToLibrary({
            uiState: vis$.getValue().uiState,
            rawState: rawState as VisualizeOutputState,
            references,
          });
        },
        canLinkToLibrary: () => !state.linkedToLibrary,
        canUnlinkFromLibrary: () => !!state.linkedToLibrary,
        checkForDuplicateTitle: () => false,
        getByValueState: () => ({
          savedVis: vis$.getValue().serialize(),
          ...serializeTitles(),
        }),
        getByReferenceState: (libraryId) =>
          serializeState({
            serializedVis: vis$.getValue().serialize(),
            titles: serializeTitles(),
            id: libraryId,
            linkedToLibrary: true,
          }).rawState,
      },
      {
        ...titleComparators,
        serializedVis: [
          serializedVis$,
          async (value) => {
            serializedVis$.next(value);
          },
          (a, b) => isEqual(a, b),
        ],
        savedObjectId: [savedObjectId$, (value) => savedObjectId$.next(value)],
        savedObjectProperties: [
          savedObjectProperties$,
          (value) => savedObjectProperties$.next(value),
        ],
        linkedToLibrary: [linkedToLibrary$, (value) => linkedToLibrary$.next(value)],
      }
    );

    if (apiPublishesDataView(parentApi)) {
      parentApi.dataView$.subscribe((dataView) => {
        if (!dataView) return;
        const {
          data: { searchSource },
        } = vis$.getValue().serialize();
        const newSearchSource = {
          ...searchSource,
          index: dataView,
        };
        api.updateVis({ data: { searchSource: newSearchSource } });
      });
    }

    fetch$(api)
      .pipe(
        switchMap((data) => {
          return (async () => {
            const unifiedSearch = apiPublishesUnifiedSearch(parentApi)
              ? {
                  query: data.query,
                  filters: data.filters,
                  timeRange: data.timeRange,
                }
              : {};
            const searchSessionId = apiPublishesSearchSession(parentApi)
              ? data.searchSessionId
              : '';
            timeRange$.next(data.timeRange);
            searchSessionId$.next(searchSessionId);
            const settings = apiPublishesSettings(parentApi)
              ? {
                  syncColors: parentApi.settings.syncColors$.getValue(),
                  syncCursor: parentApi.settings.syncCursor$.getValue(),
                  syncTooltips: parentApi.settings.syncTooltips$.getValue(),
                }
              : {};
            updateExpressionParams = async () => {
              const { params, abortController } = await getExpressionRendererProps({
                unifiedSearch,
                vis: vis$.getValue(),
                settings,
                disableTriggers,
                searchSessionId,
                parentExecutionContext: executionContext,
                abortController: expressionAbortController$.getValue(),
                onRender: () => {
                  renderCount$.next(renderCount$.getValue() + 1);
                  if (hasRendered$.getValue() === true) return;
                  hasRendered$.next(true);
                  hasRendered$.complete();
                },
                onEvent: async (event) => {
                  // Visualize doesn't respond to sizing events, so ignore.
                  if (isChartSizeEvent(event)) {
                    return;
                  }
                  const currentVis = vis$.getValue();
                  if (!disableTriggers) {
                    const triggerId = get(
                      VIS_EVENT_TO_TRIGGER,
                      event.name,
                      VIS_EVENT_TO_TRIGGER.filter
                    );
                    let context;

                    if (triggerId === VIS_EVENT_TO_TRIGGER.applyFilter) {
                      context = {
                        timeFieldName: currentVis.data.indexPattern?.timeFieldName!,
                        ...event.data,
                      };
                    } else {
                      context = {
                        data: {
                          timeFieldName: currentVis.data.indexPattern?.timeFieldName!,
                          ...event.data,
                        },
                      };
                    }

                    await getUiActions().getTrigger(triggerId).exec(context);
                  }
                },
                onData: (newData, inspectorAdapters) => {
                  visData$.next(newData);
                  inspectorAdapters$.next(
                    typeof inspectorAdapters === 'function'
                      ? inspectorAdapters()
                      : inspectorAdapters
                  );
                },
              });
              if (params) expressionParams$.next(params);
              expressionAbortController$.next(abortController);
            };
            return await updateExpressionParams();
          })();
        })
      )
      .subscribe();

    return {
      api,
      Component: () => {
        const expressionParams = useStateFromPublishingSubject(expressionParams$);
        const renderCount = useStateFromPublishingSubject(renderCount$);
        const hasRendered = useStateFromPublishingSubject(hasRendered$);
        const domNode = useRef<HTMLDivElement>(null);
        const { error, isLoading } = useExpressionRenderer(domNode, expressionParams);

        return (
          <div
            style={{ width: '100%', height: '100%' }}
            ref={domNode}
            data-test-subj="visualizationLoader"
            data-rendering-count={renderCount /* Used for functional tests */}
            data-render-complete={hasRendered}
            data-title={!api.hidePanelTitle?.getValue() ? api.panelTitle?.getValue() ?? '' : ''}
            data-description={api.panelDescription?.getValue() ?? ''}
            data-shared-item
          >
            {/* Replicate the loading state for the expression renderer to avoid FOUC  */}
            <EuiFlexGroup style={{ height: '100%' }} justifyContent="center" alignItems="center">
              {isLoading && <EuiLoadingChart size="l" mono />}
              {!isLoading && error && (
                <EuiEmptyPrompt
                  iconType="error"
                  color="danger"
                  title={
                    <h2>
                      {i18n.translate('visualizations.embeddable.errorTitle', {
                        defaultMessage: 'Unable to load visualization ',
                      })}
                    </h2>
                  }
                  body={
                    <p>
                      {error.name}: {error.message}
                    </p>
                  }
                />
              )}
            </EuiFlexGroup>
          </div>
        );
      },
    };
  },
});
