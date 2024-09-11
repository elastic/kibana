/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
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
  controlGroupStateBuilder,
  type ControlGroupStateBuilder,
} from '../../react_controls/control_group/utils/control_group_state_builder';
import { getDefaultControlGroupRuntimeState } from '../../react_controls/control_group/utils/initialization_utils';
import { ControlGroupCreationOptions, ControlGroupRendererApi } from './types';

export interface ControlGroupRendererProps {
  onApiAvailable: (api: ControlGroupRendererApi) => void;
  getCreationOptions?: (
    initialState: Partial<ControlGroupRuntimeState>,
    builder: ControlGroupStateBuilder
  ) => Promise<Partial<ControlGroupCreationOptions>>;
  viewMode?: ViewModeType;
  filters?: Filter[];
  timeRange?: TimeRange;
  query?: Query;
  dataLoading?: boolean;
}

export const ControlGroupRenderer = ({
  onApiAvailable,
  getCreationOptions,
  filters,
  timeRange,
  query,
  viewMode,
  dataLoading,
}: ControlGroupRendererProps) => {
  const id = useMemo(() => uuidv4(), []);
  const [regenerateId, setRegenerateId] = useState(uuidv4());
  const [controlGroup, setControlGroup] = useState<ControlGroupRendererApi | undefined>();

  /**
   * Parent API set up
   */
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

  const dataLoading$ = useMemo(
    () => new BehaviorSubject<boolean>(Boolean(dataLoading)),
    // dataLoading only used as initial value - changes do not effect memoized value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useEffect(() => {
    if (dataLoading !== dataLoading$.getValue()) dataLoading$.next(Boolean(dataLoading));
  }, [dataLoading, dataLoading$]);

  const reload$ = useMemo(() => new Subject<void>(), []);

  /**
   * Control group API set up
   */
  const runtimeState$ = useMemo(
    () => new BehaviorSubject<ControlGroupRuntimeState>(getDefaultControlGroupRuntimeState()),
    []
  );
  const [serializedState, setSerializedState] = useState<ControlGroupSerializedState | undefined>();

  const updateInput = useCallback(
    (newState: Partial<ControlGroupRuntimeState>) => {
      runtimeState$.next({
        ...runtimeState$.getValue(),
        ...newState,
      });
    },
    [runtimeState$]
  );

  /**
   * To mimic `input$`, subscribe to unsaved changes and snapshot the runtime state whenever
   * something change
   */
  useEffect(() => {
    if (!controlGroup) return;
    const stateChangeSubscription = controlGroup.unsavedChanges.subscribe((changes) => {
      runtimeState$.next({ ...runtimeState$.getValue(), ...changes });
    });
    return () => {
      stateChangeSubscription.unsubscribe();
    };
  }, [controlGroup, runtimeState$]);

  /**
   * On mount
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { initialState, editorConfig } =
        (await getCreationOptions?.(
          getDefaultControlGroupRuntimeState(),
          controlGroupStateBuilder
        )) ?? {};
      updateInput({
        ...initialState,
        editorConfig,
      });
      const state = {
        ...omit(initialState, ['initialChildControlState', 'ignoreParentSettings']),
        editorConfig,
        controlStyle: initialState?.labelPosition,
        panelsJSON: JSON.stringify(initialState?.initialChildControlState ?? {}),
        ignoreParentSettingsJSON: JSON.stringify(initialState?.ignoreParentSettings ?? {}),
      };

      if (!cancelled) {
        setSerializedState(state as ControlGroupSerializedState);
      }
    })();
    return () => {
      cancelled = true;
    };
    // exhaustive deps disabled because we want the control group to be created only on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return !serializedState ? null : (
    <ReactEmbeddableRenderer<ControlGroupSerializedState, ControlGroupRuntimeState, ControlGroupApi>
      key={regenerateId} // this key forces a re-mount when `updateInput` is called
      maybeId={id}
      type={CONTROL_GROUP_TYPE}
      getParentApi={() => ({
        reload$,
        dataLoading: dataLoading$,
        viewMode: viewMode$,
        query$: searchApi.query$,
        timeRange$: searchApi.timeRange$,
        unifiedSearchFilters$: searchApi.filters$,
        getSerializedStateForChild: () => ({
          rawState: serializedState,
        }),
        getRuntimeStateForChild: () => {
          return runtimeState$.getValue();
        },
      })}
      onApiAvailable={(controlGroupApi) => {
        const controlGroupRendererApi: ControlGroupRendererApi = {
          ...controlGroupApi,
          reload: () => reload$.next(),
          updateInput: (newInput) => {
            updateInput(newInput);
            setRegenerateId(uuidv4()); // force remount
          },
          getInput$: () => runtimeState$,
        };
        setControlGroup(controlGroupRendererApi);
        onApiAvailable(controlGroupRendererApi);
      }}
      hidePanelChrome
      panelProps={{ hideLoader: true }}
    />
  );
};
