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
import { AppliesFilters, useSearchApi, type ViewMode } from '@kbn/presentation-publishing';

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
import { BehaviorSubject, Subject } from 'rxjs';
import { ControlsRendererParentApi } from '@kbn/controls-renderer/src/types';

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
  const lastState$Ref = useRef(new BehaviorSubject<ControlGroupRuntimeState>({}));

  const initialState = useInitialControlGroupState(getCreationOptions);
  const childrenApi = useChildrenApi(initialState);
  const layoutApi = useLayoutApi(initialState, childrenApi);
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
    onApiAvailable({
      ...parentApi,
      reload: () => reload$.next(),
      getInput$: () => lastState$Ref.current,
      getInput: () => lastState$Ref.current.value,
      updateInput: (newInput: Partial<ControlGroupRuntimeState>) => {
        console.log({ newInput });
        // lastState$Ref.current.next(
        //   serializeRuntimeState({
        //     ...lastState$Ref.current.value,
        //     ...newInput,
        //   })
        // );
        // controlGroupApi.resetUnsavedChanges();
      },
    } as unknown as ControlGroupRendererApi);
  }, [parentApi, onApiAvailable]);

  /** Wait for parent API, which relies on the async creation options, before rendering */
  return !parentApi ? null : <ControlsRenderer parentApi={parentApi} />;
};
