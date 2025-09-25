/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import React, { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, Subject } from 'rxjs';

import { ControlsRenderer } from '@kbn/controls-renderer';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { DashboardLayout } from '@kbn/dashboard-plugin/public/dashboard_api/layout_manager';
import {
  useSearchApi,
  type SerializedPanelState,
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
  const lastSavedChildState$Ref = useRef(
    new BehaviorSubject<{ [id: string]: SerializedPanelState<object> }>({})
  );

  /** Creation options management */
  const initialState = useInitialControlGroupState(getCreationOptions, lastSavedChildState$Ref);
  const childrenApi = useChildrenApi(initialState, lastSavedChildState$Ref);
  const layoutApi = useLayoutApi(initialState, childrenApi);

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

    onApiAvailable({
      ...parentApi,
      reload: () => reload$.next(),
      getInput$: () => lastSavedChildState$Ref.current,
      getInput: () => lastSavedChildState$Ref.current.value,
      updateInput: (newInput: Partial<ControlGroupRuntimeState>) => {
        const newControls: { [id: string]: SerializedPanelState<object> } = {};
        const newControlsLayout: DashboardLayout['controls'] = {};

        Object.entries(newInput.initialChildControlState ?? {}).forEach(([id, control]) => {
          const { type, grow, width, order, ...rest } = control;
          newControls[id] = {
            rawState: {
              type,
              ...lastSavedChildState$Ref.current.value[id].rawState,
              ...rest,
            },
          };
          newControlsLayout[id] = { type, grow, width, order };
        });

        lastSavedChildState$Ref.current.next({
          ...lastSavedChildState$Ref.current.value,
          ...newControls,
        });
        Object.values(parentApi.children$.getValue()).forEach((child) => {
          child.resetUnsavedChanges();
        });

        // parentApi.layout$.next({
        //   ...parentApi.layout$.getValue(),
        //   controls: { ...parentApi.layout$.getValue().controls, ...newControlsLayout },
        // });
      },
    } as unknown as ControlGroupRendererApi);
  }, [parentApi, onApiAvailable]);
  console.log({ parentApi });
  /** Wait for parent API, which relies on the async creation options, before rendering */
  return !parentApi ? null : <ControlsRenderer parentApi={parentApi} />;
};
