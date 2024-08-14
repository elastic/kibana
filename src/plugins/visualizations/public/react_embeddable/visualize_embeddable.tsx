/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiEmptyPrompt, EuiFlexGroup, EuiLoadingChart } from '@elastic/eui';
import { isChartSizeEvent } from '@kbn/chart-expressions-common';
import { APPLY_FILTER_TRIGGER } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { EmbeddableEnhancedPluginStart } from '@kbn/embeddable-enhanced-plugin/public';
import { EmbeddableStart, ReactEmbeddableFactory, ViewMode } from '@kbn/embeddable-plugin/public';
import { ExpressionRendererParams, useExpressionRenderer } from '@kbn/expressions-plugin/public';
import { i18n } from '@kbn/i18n';
import { apiPublishesDataView, apiPublishesSettings } from '@kbn/presentation-containers';
import {
  apiHasAppContext,
  apiHasDisableTriggers,
  apiHasExecutionContext,
  apiIsOfType,
  apiPublishesTimeRange,
  apiPublishesUnifiedSearch,
  apiPublishesViewMode,
  fetch$,
  getUnchangingComparator,
  initializeTimeRange,
  initializeTitles,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { apiPublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import { get, isEmpty, isEqual, isNil, omitBy } from 'lodash';
import React, { useEffect, useRef } from 'react';
import { BehaviorSubject, switchMap } from 'rxjs';
import { VISUALIZE_APP_NAME, VISUALIZE_EMBEDDABLE_TYPE } from '../../common/constants';
import { VIS_EVENT_TO_TRIGGER } from '../embeddable';
import { getCapabilities, getInspector, getUiActions } from '../services';
import { ACTION_CONVERT_TO_LENS } from '../triggers';
import { urlFor } from '../utils/saved_visualize_utils';
import type { SerializedVis, Vis } from '../vis';
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
  isVisualizeSavedObjectState,
} from './types';

export const getVisualizeEmbeddableFactory: (deps: {
  embeddableStart: EmbeddableStart;
  embeddableEnhancedStart?: EmbeddableEnhancedPluginStart;
}) => ReactEmbeddableFactory<VisualizeSerializedState, VisualizeRuntimeState, VisualizeApi> = ({
  embeddableStart,
  embeddableEnhancedStart,
}) => ({
  type: VISUALIZE_EMBEDDABLE_TYPE,
  deserializeState,
  buildEmbeddable: async (initialState: unknown, buildApi, uuid, parentApi) => {
    // Handle state transfer from legacy visualize editor, which uses the legacy visualize embeddable and doesn't
    // produce a snapshot state. If buildEmbeddable is passed only a savedObjectId in the state, this means deserializeState
    // was never run, and it needs to be invoked manually
    const state = isVisualizeSavedObjectState(initialState)
      ? await deserializeState({
          rawState: initialState,
        })
      : (initialState as VisualizeRuntimeState);

    const dynamicActionsApi = embeddableEnhancedStart?.initializeReactEmbeddableDynamicActions(
      uuid,
      () => titlesApi.panelTitle.getValue(),
      state
    );
    // if it is provided, start the dynamic actions manager
    const maybeStopDynamicActions = dynamicActionsApi?.startDynamicActions();

    const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);

    const renderCount$ = new BehaviorSubject<number>(0);
    const hasRendered$ = new BehaviorSubject<boolean>(false);

    const serializedVis$ = new BehaviorSubject<SerializedVis>(state.serializedVis);
    const initialVisInstance = await createVisInstance(state.serializedVis);
    const vis$ = new BehaviorSubject<Vis>(initialVisInstance);

    const onUiStateChange = () => {
      console.log(
        'onUiStateChange',
        vis$.getValue().serialize().uiState,
        serializedVis$.getValue().uiState
      );
      serializedVis$.next(vis$.getValue().serialize());
    };
    initialVisInstance.uiState.on('change', onUiStateChange);
    vis$.subscribe((vis) => vis.uiState.on('change', onUiStateChange));

    // when the serialized vis changes, update the vis instance
    serializedVis$.subscribe(async (serializedVis) => {
      const currentVis = vis$.getValue();
      if (currentVis) currentVis.uiState.off('change', onUiStateChange);
      vis$.next(await createVisInstance(serializedVis));
      await updateExpressionParams();
    });

    const savedObjectId$ = new BehaviorSubject<string | undefined>(
      state.savedObjectId ?? state.serializedVis.id
    );
    const savedObjectProperties$ = new BehaviorSubject<ExtraSavedObjectProperties | undefined>(
      undefined
    );
    const linkedToLibrary$ = new BehaviorSubject<boolean | undefined>(state.linkedToLibrary);
    const visData$ = new BehaviorSubject<unknown>({});

    const searchSessionId$ = new BehaviorSubject<string | undefined>('');
    const timeRange = initializeTimeRange(state);
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

    let initialDataViews: DataView[] | undefined = [];
    if (initialVisInstance.data.indexPattern)
      initialDataViews = [initialVisInstance.data.indexPattern];
    if (initialVisInstance.type.getUsedIndexPattern) {
      initialDataViews = await initialVisInstance.type.getUsedIndexPattern(
        initialVisInstance.params
      );
    }

    const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
    const defaultPanelTitle = new BehaviorSubject<string | undefined>(initialVisInstance.title);

    const api = buildApi(
      {
        ...timeRange.api,
        ...titlesApi,
        ...(dynamicActionsApi?.dynamicActionsApi ?? {}),
        defaultPanelTitle,
        dataLoading: dataLoading$,
        dataViews: new BehaviorSubject<DataView[] | undefined>(initialDataViews),
        supportedTriggers: () => [ACTION_CONVERT_TO_LENS, APPLY_FILTER_TRIGGER],
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
            ...(dynamicActionsApi?.serializeDynamicActions?.() ?? {}),
          });
        },
        getVis: () => vis$.getValue(),
        getTitles: () => serializeTitles(),
        getInspectorAdapters: () => inspectorAdapters$.getValue(),
        getTypeDisplayName: () =>
          i18n.translate('visualizations.displayName', {
            defaultMessage: 'visualization',
          }),
        onEdit: async () => {
          const stateTransferService = embeddableStart.getStateTransfer();
          const visId = savedObjectId$.getValue();
          const editPath = visId ? urlFor(visId) : '#/edit_by_value';
          const parentTimeRange = apiPublishesTimeRange(parentApi)
            ? parentApi.timeRange$.getValue()
            : {};
          await stateTransferService.navigateToEditor('visualize', {
            path: editPath,
            state: {
              embeddableId: uuid,
              valueInput: {
                savedVis: vis$.getValue().serialize(),
                title: api.panelTitle?.getValue(),
                description: api.panelDescription?.getValue(),
                timeRange: parentTimeRange,
              },
              originatingApp: parentApiContext?.currentAppId ?? '',
              searchSessionId: searchSessionId$.getValue() || undefined,
              originatingPath: parentApiContext?.getCurrentPath?.(),
            },
          });
        },
        isEditingEnabled: () => {
          if (viewMode$.getValue() !== ViewMode.EDIT) return false;
          const readOnly = Boolean(vis$.getValue().type.disableEdit);
          if (readOnly) return false;
          const capabilities = getCapabilities();
          const isByValue = !savedObjectId$.getValue();
          console.log('capabilities', capabilities);
          if (isByValue)
            return Boolean(
              capabilities.dashboard?.showWriteControls && capabilities.visualize?.open
            );
          else return Boolean(capabilities.visualize?.save);
        },
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
          if (visUpdates.title) {
            titlesApi.setPanelTitle(visUpdates.title);
          }
        },
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
        checkForDuplicateTitle: () => false, // Handled by saveToLibrary action
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
        ...timeRange.comparators,
        ...(dynamicActionsApi?.dynamicActionsComparator ?? {
          enhancements: getUnchangingComparator(),
        }),
        serializedVis: [
          serializedVis$,
          (value) => {
            serializedVis$.next(value);
          },
          (a, b) => {
            const visA = a
              ? {
                  ...omitBy(a, isEmpty),
                  data: omitBy(a.data, isNil),
                  params: omitBy(a.params, isNil),
                }
              : {};
            const visB = b
              ? {
                  ...omitBy(b, isEmpty),
                  data: omitBy(b.data, isNil),
                  params: omitBy(b.params, isNil),
                }
              : {};
            return isEqual(visA, visB);
          },
        ],
        savedObjectId: [
          savedObjectId$,
          (value) => savedObjectId$.next(value),
          (a, b) => {
            if (!a && !b) return true;
            return a === b;
          },
        ],
        savedObjectProperties: getUnchangingComparator(),
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

    const fetchSubscription = fetch$(api)
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
            searchSessionId$.next(searchSessionId);
            const settings = apiPublishesSettings(parentApi)
              ? {
                  syncColors: parentApi.settings.syncColors$.getValue(),
                  syncCursor: parentApi.settings.syncCursor$.getValue(),
                  syncTooltips: parentApi.settings.syncTooltips$.getValue(),
                }
              : {};

            dataLoading$.next(true);
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
                        embeddable: api,
                        timeFieldName: currentVis.data.indexPattern?.timeFieldName!,
                        ...event.data,
                      };
                    } else {
                      context = {
                        embeddable: api,
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
                  dataLoading$.next(false);
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

        useEffect(() => {
          return () => {
            fetchSubscription.unsubscribe();
            maybeStopDynamicActions?.stopDynamicActions();
          };
        }, []);

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
                  data-test-subj="embeddableError"
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
