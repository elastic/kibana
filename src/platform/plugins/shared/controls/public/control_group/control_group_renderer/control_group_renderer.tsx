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

import type { ControlGroupApi } from '../..';
import {
  CONTROL_GROUP_TYPE,
  DEFAULT_CONTROL_LABEL_POSITION,
  type ControlGroupRuntimeState,
  type ControlGroupSerializedState,
  DEFAULT_CONTROL_CHAINING,
  DEFAULT_AUTO_APPLY_SELECTIONS,
} from '../../../common';
import {
  type ControlGroupStateBuilder,
  controlGroupStateBuilder,
} from '../utils/control_group_state_builder';
import { getDefaultControlGroupRuntimeState } from '../utils/initialization_utils';
import type { ControlGroupCreationOptions, ControlGroupRendererApi } from './types';

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
      const state: ControlGroupSerializedState = {
        ...omit(initialState, ['initialChildControlState']),
        editorConfig,
        autoApplySelections: initialState?.autoApplySelections ?? DEFAULT_AUTO_APPLY_SELECTIONS,
        labelPosition: initialState?.labelPosition ?? DEFAULT_CONTROL_LABEL_POSITION,
        chainingSystem: initialState?.chainingSystem ?? DEFAULT_CONTROL_CHAINING,
        controls: Object.entries(initialState?.initialChildControlState ?? {}).map(
          ([controlId, value]) => ({ ...value, id: controlId })
        ),
      };

      if (!cancelled) {
        setSerializedState(state);
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
        compressed: compressed ?? true,
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
