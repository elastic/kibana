/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, Subject, combineLatest, map } from 'rxjs';

import { ControlsRenderer } from '@kbn/controls-renderer';
import type { StickyControlState } from '@kbn/controls-schemas';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  apiPublishesUnsavedChanges,
  useSearchApi,
  type ViewMode,
} from '@kbn/presentation-publishing';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';

import type {
  ControlGroupCreationOptions,
  ControlGroupRendererApi,
  ControlGroupRuntimeState,
  ControlGroupStateBuilder,
  ControlPanelsState,
  ControlStateTransform,
} from './types';
import { useChildrenApi } from './use_children_api';
import { useInitialControlGroupState } from './use_initial_control_group_state';
import { useLayoutApi } from './use_layout_api';
import { usePropsApi } from './use_props_api';

export interface ControlGroupRendererProps {
  onApiAvailable: (api: ControlGroupRendererApi) => void;
  getCreationOptions: (
    builder: ControlGroupStateBuilder
  ) => Promise<Partial<ControlGroupCreationOptions>>;
  viewMode?: ViewMode;
  filters?: Filter[];
  timeRange?: TimeRange;
  query?: Query;
  dataLoading?: boolean;
  compressed?: boolean;
}

export const ControlGroupRenderer = ({
  onApiAvailable,
  getCreationOptions,
  filters,
  timeRange,
  query,
  viewMode,
  dataLoading,
  compressed,
}: ControlGroupRendererProps) => {
  const {
    services: { uiActions },
  } = useKibana<{
    uiActions: UiActionsStart;
  }>();

  const lastSavedState$Ref = useRef(new BehaviorSubject<{ [id: string]: StickyControlState }>({}));

  /** Creation options management */
  const initialState = useInitialControlGroupState(getCreationOptions, lastSavedState$Ref);
  const input$ = useMemo(() => {
    if (!initialState) return;
    return new BehaviorSubject<Partial<ControlGroupRuntimeState>>(initialState.initialState ?? {});
  }, [initialState]);

  const { childrenApi, currentChildState$Ref } = useChildrenApi(initialState, lastSavedState$Ref);
  const layoutApi = useLayoutApi(initialState, childrenApi, lastSavedState$Ref);

  /** Props management */
  const searchApi = useSearchApi({
    filters,
    query,
    timeRange,
  });
  const propsApi = usePropsApi({ dataLoading, viewMode, compressed });

  const parentApi = useMemo(() => {
    if (!childrenApi || !layoutApi) return;

    const disabledActionIds$ = new BehaviorSubject<string[] | undefined>(undefined);
    return {
      ...childrenApi,
      ...layoutApi,
      ...searchApi,
      ...propsApi,
      disabledActionIds$,
      setDisabledActionIds: (ids: string[] | undefined) => {
        disabledActionIds$.next(ids);
      },
    };
  }, [childrenApi, layoutApi, searchApi, propsApi]);

  useEffect(() => {
    if (!parentApi || !input$) return;
    const currentStateSubscription = combineLatest([
      currentChildState$Ref.current,
      parentApi.layout$,
    ])
      .pipe(
        map(([currentChildState, currentLayout]) => {
          const combinedState: ControlPanelsState = {};
          Object.keys(currentLayout.controls).forEach((id) => {
            combinedState[id] = {
              ...currentChildState[id].rawState,
              ...currentLayout.controls[id],
            };
          });
          return { initialChildControlState: combinedState };
        })
      )
      .subscribe((currentState) => {
        input$.next(currentState);
      });

    return () => {
      currentStateSubscription.unsubscribe();
    };
  }, [input$, currentChildState$Ref, parentApi]);

  useEffect(() => {
    if (!parentApi || !input$) return;

    const reload$ = new Subject<void>();
    const publicApi = {
      ...parentApi,
      reload: () => reload$.next(),
      getInput$: () => input$,
      getInput: () => input$.value,
      updateInput: (newInput: Partial<ControlGroupRuntimeState>) => {
        /** Set the last saved state to the new input and then reset each child to this state */
        const newState = lastSavedState$Ref.current.getValue();
        Object.entries(newInput.initialChildControlState ?? {}).forEach(([id, control]) => {
          newState[id] = {
            ...lastSavedState$Ref.current.value[id],
            ...control,
          };
        });
        lastSavedState$Ref.current.next(newState);
        Object.values(parentApi.children$.getValue()).forEach((child) => {
          if (apiPublishesUnsavedChanges(child)) child.resetUnsavedChanges();
        });
      },
    };

    onApiAvailable({
      ...publicApi,
      openAddDataControlFlyout: async (options?: {
        controlStateTransform?: ControlStateTransform;
      }) => {
        const action = await uiActions.getAction('createControl');
        action.execute({
          embeddable: {
            ...publicApi,
            getEditorConfig: () => {
              return {
                ...(initialState?.editorConfig ?? {}),
                controlStateTransform: options?.controlStateTransform,
              };
            },
          },
        });
      },
    } as unknown as ControlGroupRendererApi);
  }, [initialState?.editorConfig, parentApi, onApiAvailable, input$, uiActions]);

  /** Wait for parent API, which relies on the async creation options, before rendering */
  return !parentApi ? null : <ControlsRenderer parentApi={parentApi} />;
};
