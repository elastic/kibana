/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef } from 'react';

import { ControlsRenderer } from '@kbn/controls-renderer';
// import { EmbeddableStart } from '@kbn/embeddable-plugin/server';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
// import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  AppliesFilters,
  SerializedPanelState,
  useSearchApi,
  type ViewMode,
} from '@kbn/presentation-publishing';

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
import { BehaviorSubject, Subject, combineLatest, map, merge, tap } from 'rxjs';
import { ControlsRendererParentApi } from '@kbn/controls-renderer/src/types';
import { childrenUnsavedChanges$ } from '@kbn/presentation-containers';
import { ControlState } from '@kbn/controls-schemas';
import { omit } from 'lodash';

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
  const childState$Ref = useRef(
    new BehaviorSubject<{ [id: string]: SerializedPanelState<object> }>({})
  );

  /** Creation options management */
  const initialState = useInitialControlGroupState(getCreationOptions, childState$Ref);
  const childrenApi = useChildrenApi(initialState, childState$Ref);
  const layoutApi = useLayoutApi(initialState, childrenApi, childState$Ref);

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

  useEffect(() => {
    if (!parentApi) return;

    const reload$ = new Subject<void>();

    const subscription = childrenUnsavedChanges$(parentApi.children$)
      .pipe(
        tap(() => {
          console.log('TAP!!!!!');
        }),
        map((children) => children.some(({ hasUnsavedChanges }) => hasUnsavedChanges))
      )
      .subscribe((hasUnsavedChanges) => {
        console.log('has unsaved changes', hasUnsavedChanges);
        // console.log('current', lastState$Ref.current.getValue());

        if (hasUnsavedChanges) {
          childState$Ref.current.next(
            Object.values(parentApi.children$.getValue()).reduce((prev, child) => {
              return {
                ...prev,
                [child.uuid]: child.serializeState(),
              };
            }, {})
          );
        }
      });

    childState$Ref.current.subscribe((test) => {
      console.log('HERE!!!!!!!!!!!', { current: test });
    });

    onApiAvailable({
      ...parentApi,
      reload: () => reload$.next(),
      getInput$: () => childState$Ref.current,
      getInput: () => childState$Ref.current.value,
      updateInput: (newInput: Partial<ControlGroupRuntimeState>) => {
        console.log({ newInput });
        const result = {
          ...childState$Ref.current.value,
          ...Object.entries(newInput.initialChildControlState ?? {}).reduce(
            (prev, [id, control]) => {
              return {
                ...prev,
                [id]: {
                  rawState: {
                    ...childState$Ref.current.value[id].rawState,
                    ...omit(control, ['grow', 'width', 'order']),
                  },
                },
              };
            },
            {}
          ),
        };
        console.log({ result });
        childState$Ref.current.next(result);
        Object.values(parentApi.children$.getValue()).forEach((child) => {
          child.resetUnsavedChanges();
        });
      },
    } as unknown as ControlGroupRendererApi);
  }, [parentApi, onApiAvailable]);

  /** Wait for parent API, which relies on the async creation options, before rendering */
  return !parentApi ? null : <ControlsRenderer parentApi={parentApi} />;
};
