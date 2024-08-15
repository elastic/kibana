/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BehaviorSubject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { ReactEmbeddableRenderer, ViewMode } from '@kbn/embeddable-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { useSearchApi, type ViewMode as ViewModeType } from '@kbn/presentation-publishing';

import { CONTROL_GROUP_TYPE, getDefaultControlGroupInput } from '../../../common';
import {
  ControlGroupApi,
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
} from '../../react_controls/control_group/types';
import {
  AddOptionsListControlProps,
  ControlGroupInputBuilder,
  controlGroupInputBuilder,
  getOptionsListPanelState,
} from './control_group_input_builder';
import {
  AwaitingControlGroupApi,
  ControlGroupCreationOptions,
  ControlGroupRendererApi,
} from './types';

export interface ControlGroupRendererProps {
  getCreationOptions?: (
    initialState: Partial<ControlGroupRuntimeState>,
    builder: ControlGroupInputBuilder
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
    const lastInput = useRef<Partial<ControlGroupRuntimeState> | null>(null);
    const input$ = useMemo(() => new BehaviorSubject<ControlGroupRuntimeState | null>(null), []);

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
      []
    );
    const reload$ = useMemo(() => new BehaviorSubject<void>(undefined), []);
    const saveNotification$ = useMemo(() => new BehaviorSubject<void>(undefined), []);

    const [serializedState, setSerializedState] = useState<
      ControlGroupSerializedState | undefined
    >();

    // onMount
    useEffect(() => {
      let cancelled = false;
      (async () => {
        const test =
          (await getCreationOptions?.(getDefaultControlGroupInput(), controlGroupInputBuilder)) ??
          {};
        console.log('initialState', test);
        const { initialState, settings } = test;
        const state = {
          ...omit(initialState, ['panels', 'ignoreParentSettings']),
          settings,
          controlStyle: initialState?.labelPosition,
          panelsJSON: JSON.stringify(initialState?.panels ?? {}),
          ignoreParentSettingsJSON: JSON.stringify(initialState?.ignoreParentSettings ?? {}),
        };
        if (!cancelled) {
          console.log('state', state);
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
        type={CONTROL_GROUP_TYPE}
        onAnyStateChange={(newState) => {
          input$.next(newState);
        }}
        getParentApi={() => ({
          ...searchApi,
          reload$,
          viewMode: viewMode$,
          saveNotification$,
          getSerializedStateForChild: () => ({
            rawState: serializedState!,
          }),
          getRuntimeStateForChild: () => {
            return lastInput.current;
          },
        })}
        onApiAvailable={(controlGroupApi) => {
          setControlGroup({
            ...controlGroupApi,
            reload: () => reload$.next(),
            save: () => saveNotification$.next(),
            updateInput: (newInput) => {
              lastInput.current = newInput;
              setRegenerateId(uuidv4());
            },
            getInput$: () => input$,
            // addOptionsListControl: (controlProps) => {
            //   const panelState = getOptionsListPanelState(childApi.serializeState(), controlProps);
            // },
          });
        }}
        hidePanelChrome
      />
    );
  }
);
