/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { ReactEmbeddableRenderer, ViewMode } from '@kbn/embeddable-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { useSearchApi, type ViewMode as ViewModeType } from '@kbn/presentation-publishing';

import { CONTROL_GROUP_TYPE } from '../../../common';
import {
  ControlGroupApi,
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
} from '../../react_controls/control_group/types';
import {
  type ControlGroupStateBuilder,
  controlGroupStateBuilder,
} from '../../react_controls/control_group/utils/control_group_state_builder';
import {
  AwaitingControlGroupApi,
  ControlGroupCreationOptions,
  ControlGroupRendererApi,
} from './types';
import { getDefaultControlGroupRuntimeState } from '../../react_controls/control_group/utils/initialization_utils';

export interface ControlGroupRendererProps {
  getCreationOptions?: (
    initialState: Partial<ControlGroupRuntimeState>,
    builder: ControlGroupStateBuilder
  ) => Promise<Partial<ControlGroupCreationOptions>>;
  viewMode?: ViewModeType;
  filters?: Filter[];
  timeRange?: TimeRange;
  query?: Query;
}

export const ControlGroupRenderer = forwardRef<AwaitingControlGroupApi, ControlGroupRendererProps>(
  ({ getCreationOptions, filters, timeRange, query, viewMode }, ref) => {
    const id = useMemo(() => uuidv4(), []);
    const [regenerateId, setRegenerateId] = useState(uuidv4());

    const [apiLoading, setApiLoading] = useState<boolean>(true);
    const [controlGroup, setControlGroup] = useState<ControlGroupRendererApi | undefined>();
    useImperativeHandle(ref, () => controlGroup as ControlGroupRendererApi, [controlGroup]);

    const searchApi = useSearchApi({
      filters,
      query,
      timeRange,
    });
    const viewMode$ = useMemo(
      () => new BehaviorSubject<ViewModeType>(viewMode ?? ViewMode.VIEW),
      // viewMode only used as initial value - changes do not effect memoized value.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );
    useEffect(() => {
      if (viewMode) viewMode$.next(viewMode);
    }, [viewMode, viewMode$]);

    const runtimeState$ = useMemo(
      () => new BehaviorSubject<ControlGroupRuntimeState>(getDefaultControlGroupRuntimeState()),
      []
    );
    const [serializedState, setSerializedState] = useState<
      ControlGroupSerializedState | undefined
    >();

    // onMount
    useEffect(() => {
      let cancelled = false;
      (async () => {
        const test =
          (await getCreationOptions?.(
            getDefaultControlGroupRuntimeState(),
            controlGroupStateBuilder
          )) ?? {};
        const { initialState, editorConfig } = test;
        const state = {
          ...omit(initialState, ['initialChildControlState', 'ignoreParentSettings']),
          editorConfig,
          controlStyle: initialState?.labelPosition,
          panelsJSON: JSON.stringify(initialState?.initialChildControlState ?? {}),
          ignoreParentSettingsJSON: JSON.stringify(initialState?.ignoreParentSettings ?? {}),
        };
        if (!cancelled) {
          setSerializedState(state as ControlGroupSerializedState);
          setApiLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
      // exhaustive deps disabled because we want the control group to be created only on first render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return apiLoading ? null : (
      <ReactEmbeddableRenderer<
        ControlGroupSerializedState,
        ControlGroupRuntimeState,
        ControlGroupApi
      >
        key={regenerateId} // forces unmount + mount when `updateInput` is called
        maybeId={id}
        onAnyStateChange={() => {
          if (!controlGroup) return;

          /**
           * on any state change is a callback the hands over the **serialized** state, but `input$`
           * should be providing runtime state - so, snapshot runtime state on state change instead
           */
          runtimeState$.next(controlGroup?.snapshotRuntimeState());
        }}
        type={CONTROL_GROUP_TYPE}
        getParentApi={() => ({
          viewMode: viewMode$,
          query$: searchApi.query$,
          timeRange$: searchApi.timeRange$,
          unifiedSearchFilters$: searchApi.filters$,
          getSerializedStateForChild: () => ({
            rawState: serializedState!,
          }),
          getRuntimeStateForChild: () => {
            return runtimeState$.getValue();
          },
        })}
        onApiAvailable={(controlGroupApi) => {
          setControlGroup({
            ...controlGroupApi,
            updateInput: (newInput) => {
              runtimeState$.next({
                ...runtimeState$.getValue(),
                ...newInput,
              });
              setRegenerateId(uuidv4());
            },
            getInput$: () => runtimeState$,
          });
        }}
        hidePanelChrome
      />
    );
  }
);
