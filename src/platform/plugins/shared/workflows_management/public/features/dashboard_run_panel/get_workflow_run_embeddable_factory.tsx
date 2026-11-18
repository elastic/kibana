/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject, map, merge, skip } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ViewMode } from '@kbn/presentation-publishing';
import {
  getViewModeSubject,
  initializeStateApi,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
  useFetchContext,
} from '@kbn/presentation-publishing';
import { QueryClientProvider } from '@kbn/react-query';
import { getWorkflowsCapabilities } from '@kbn/workflows-ui';
import { WorkflowRunPanel } from './components/workflow_run_panel';
import { apiPublishesHasOverlays } from './lib/publishes_has_overlays';
import { openConfigFlyout } from './open_config_flyout';
import { PANEL_TYPE_DISPLAY_NAME } from './translations';
import type { WorkflowRunEmbeddableApi, WorkflowRunPanelConfig } from './types';
import { WORKFLOW_RUN_EMBEDDABLE_TYPE } from '../../../common/dashboard_run_panel/constants';
import type {
  WorkflowRunEmbeddableState,
  WorkflowRunInputMapping,
} from '../../../server/dashboard_run_panel/schema';
import { queryClient } from '../../shared/lib/query_client';
import type { WorkflowsPublicPluginStartDependencies } from '../../types';

const NO_MAPPINGS: readonly WorkflowRunInputMapping[] = [];

/** Plugin services the panel's step icons read from the Kibana context. */
export type WorkflowRunPanelPluginServices = Pick<
  WorkflowsPublicPluginStartDependencies,
  'triggersActionsUi' | 'workflowsExtensions'
>;

export const getWorkflowRunEmbeddableFactory = (
  core: CoreStart,
  pluginServices: WorkflowRunPanelPluginServices
): EmbeddablePublicDefinition<WorkflowRunEmbeddableState, WorkflowRunEmbeddableApi> => ({
  type: WORKFLOW_RUN_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
    const services = { ...core, ...pluginServices };
    const titleManager = initializeTitleManager(initialState);
    const defaultTitle$ = new BehaviorSubject<string | undefined>(undefined);
    const setDefaultTitle = (name: string | undefined) => defaultTitle$.next(name);
    const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
    const setDataLoading = (isLoading: boolean) => dataLoading$.next(isLoading);
    const workflowId$ = new BehaviorSubject(initialState.workflow_id);
    const buttonLabel$ = new BehaviorSubject(initialState.button_label);
    const inputMappings$ = new BehaviorSubject(initialState.input_mappings);
    const graphLayout$ = new BehaviorSubject(initialState.graph_layout);
    const parentHasOverlays$ = apiPublishesHasOverlays(parentApi)
      ? parentApi.hasOverlays$
      : new BehaviorSubject(false);

    const applyConfig = (config: WorkflowRunPanelConfig) => {
      workflowId$.next(config.workflow_id);
      buttonLabel$.next(config.button_label);
      inputMappings$.next(config.input_mappings);
      graphLayout$.next(config.graph_layout);
    };

    const toChange = map(() => undefined);
    const stateApi = initializeStateApi<WorkflowRunEmbeddableState>({
      uuid,
      parentApi,
      serializeState: () => ({
        ...titleManager.getLatestState(),
        workflow_id: workflowId$.getValue(),
        button_label: buttonLabel$.getValue(),
        input_mappings: inputMappings$.getValue(),
        graph_layout: graphLayout$.getValue(),
      }),
      anyStateChange$: merge(
        titleManager.anyStateChange$,
        workflowId$.pipe(skip(1), toChange),
        buttonLabel$.pipe(skip(1), toChange),
        inputMappings$.pipe(skip(1), toChange),
        graphLayout$.pipe(skip(1), toChange)
      ),
      getComparators: () => ({
        ...titleComparators,
        workflow_id: 'referenceEquality',
        button_label: 'referenceEquality',
        input_mappings: 'deepEquality',
        graph_layout: 'referenceEquality',
      }),
      applySerializedState: (nextState) => {
        titleManager.reinitializeState(nextState);
        applyConfig(nextState);
      },
    });

    const api = finalizeApi({
      ...titleManager.api,
      ...stateApi,
      defaultTitle$,
      dataLoading$,
      onEdit: async ({ returnFocus } = {}) => {
        openConfigFlyout({
          core,
          parentApi,
          returnFocus,
          focusedPanelId: uuid,
          initialConfig: {
            workflow_id: workflowId$.getValue(),
            button_label: buttonLabel$.getValue(),
            input_mappings: inputMappings$.getValue(),
            graph_layout: graphLayout$.getValue(),
          },
          onSave: applyConfig,
        });
      },
      isEditingEnabled: () =>
        getWorkflowsCapabilities(core.application.capabilities).canReadWorkflow,
      getTypeDisplayName: () => PANEL_TYPE_DISPLAY_NAME,
    });

    const viewMode$ = getViewModeSubject(api) ?? new BehaviorSubject<ViewMode>('view');

    return {
      api,
      Component: () => {
        const [workflowId, buttonLabel, inputMappings, graphLayout, parentHasOverlays, viewMode] =
          useBatchedPublishingSubjects(
            workflowId$,
            buttonLabel$,
            inputMappings$,
            graphLayout$,
            parentHasOverlays$,
            viewMode$
          );
        const fetchContext = useFetchContext(api);
        return (
          <KibanaContextProvider services={services}>
            <QueryClientProvider client={queryClient}>
              <WorkflowRunPanel
                core={core}
                uuid={uuid}
                parentApi={parentApi}
                workflowId={workflowId}
                buttonLabel={buttonLabel}
                mappings={inputMappings ?? NO_MAPPINGS}
                graphLayout={graphLayout}
                holdGraphDirection={parentHasOverlays}
                isInteractive={viewMode === 'view' || viewMode === 'edit'}
                fetchContext={fetchContext}
                onWorkflowNameChange={setDefaultTitle}
                onDataLoadingChange={setDataLoading}
              />
            </QueryClientProvider>
          </KibanaContextProvider>
        );
      },
    };
  },
});
