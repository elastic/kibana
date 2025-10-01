/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  BehaviorSubject,
  Observable,
  Subject,
  combineLatest,
  distinctUntilChanged,
  first,
  map,
} from 'rxjs';

import { ControlsRenderer } from '@kbn/controls-renderer';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import {
  apiPublishesUnsavedChanges,
  useSearchApi,
  type ViewMode,
} from '@kbn/presentation-publishing';
import type { StickyControlState } from '@kbn/controls-schemas';

import type {
  ControlGroupCreationOptions,
  ControlGroupRendererApi,
  ControlGroupRuntimeState,
  ControlGroupStateBuilder,
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
  const lastSavedState$Ref = useRef(new BehaviorSubject<{ [id: string]: StickyControlState }>({}));

  /** Creation options management */
  const initialState = useInitialControlGroupState(getCreationOptions, lastSavedState$Ref);
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
    return {
      ...childrenApi,
      ...layoutApi,
      ...searchApi,
      ...propsApi,
    };
  }, [childrenApi, layoutApi, searchApi, propsApi]);

  const currentState$: Observable<Partial<ControlGroupRuntimeState>> | undefined = useMemo(() => {
    if (!parentApi) return;
    return combineLatest([currentChildState$Ref.current, parentApi.layout$]).pipe(
      map(([currentChildState, currentLayout]) => {
        const combinedState: ControlGroupRuntimeState['initialChildControlState'] = {};
        Object.keys(currentLayout.controls).forEach((id) => {
          combinedState[id] = {
            ...currentChildState[id].rawState,
            ...currentLayout.controls[id],
          };
        });
        return { initialChildControlState: combinedState };
      })
    );
  }, [currentChildState$Ref, parentApi]);

  useEffect(() => {
    if (!parentApi || !currentState$) return;

    const reload$ = new Subject<void>();
    onApiAvailable({
      ...parentApi,
      reload: () => reload$.next(),
      getInput$: () => currentState$,
      getInput: () => currentState$.value,
      updateInput: (newInput: Partial<ControlGroupRuntimeState>) => {
        /** Set the last saved state to the new input and then reset each child to this state */
        const newState: { [id: string]: StickyControlState } = {};
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
      // untilInitialized: () => {
      //   return new Promise((resolve) => {
      //     combineLatest([parentApi.children$, parentApi.layout$])
      //       .pipe(
      //         map(([children, layout]) => {
      //           // filter out panels that are in collapsed sections, since the APIs will never be available
      //           const expectedChildCount = Object.values(layout.controls).length;
      //           const currentChildCount = Object.keys(children).length;
      //           return expectedChildCount !== currentChildCount;
      //         }),
      //         distinctUntilChanged(),
      //         first()
      //       )
      //       .subscribe(() => {
      //         console.log('RESOLVE');
      //         resolve(true);
      //       });
      //   });
      // },
    } as unknown as ControlGroupRendererApi);
  }, [parentApi, currentState$, onApiAvailable]);

  /** Wait for parent API, which relies on the async creation options, before rendering */
  return !parentApi ? null : <ControlsRenderer parentApi={parentApi} />;
};
