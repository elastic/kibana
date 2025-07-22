/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BehaviorSubject, Subject, map } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { cloneDeep } from 'lodash';

import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { useSearchApi, type ViewMode } from '@kbn/presentation-publishing';

import type { ControlGroupApi } from '../..';
import {
  CONTROL_GROUP_TYPE,
  type ControlGroupRuntimeState,
  type ControlGroupSerializedState,
} from '../../../common';
import {
  type ControlGroupStateBuilder,
  controlGroupStateBuilder,
} from '../utils/control_group_state_builder';
import type { ControlGroupCreationOptions, ControlGroupRendererApi } from './types';
import { deserializeControlGroup } from '../utils/serialization_utils';
import { defaultRuntimeState, serializeRuntimeState } from '../utils/serialize_runtime_state';

export interface ControlGroupRendererProps {
  onApiAvailable: (api: ControlGroupRendererApi) => void;
  getCreationOptions?: (
    initialState: Partial<ControlGroupRuntimeState>,
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
  const lastState$Ref = useRef(new BehaviorSubject(serializeRuntimeState({})));
  const id = useMemo(() => uuidv4(), []);
  const [isStateLoaded, setIsStateLoaded] = useState(false);
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
    () => new BehaviorSubject<ViewMode>(viewMode ?? 'view'),
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

  useEffect(() => {
    if (!controlGroup) return;
    const subscription = controlGroup.hasUnsavedChanges$.subscribe((hasUnsavedChanges) => {
      if (hasUnsavedChanges) lastState$Ref.current.next(controlGroup.serializeState());
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [controlGroup]);

  /**
   * On mount
   */
  useEffect(() => {
    if (!getCreationOptions) {
      setIsStateLoaded(true);
      return;
    }

    let cancelled = false;

    getCreationOptions(cloneDeep(defaultRuntimeState), controlGroupStateBuilder)
      .then(({ initialState, editorConfig }) => {
        if (cancelled) return;
        const initialRuntimeState = {
          ...(initialState ?? defaultRuntimeState),
          editorConfig,
        } as ControlGroupRuntimeState;
        lastState$Ref.current.next(serializeRuntimeState(initialRuntimeState));
        setIsStateLoaded(true);
      })
      .catch();

    return () => {
      cancelled = true;
    };
    // exhaustive deps disabled because we want the control group to be created only on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return !isStateLoaded ? null : (
    <EmbeddableRenderer<ControlGroupSerializedState, ControlGroupApi>
      maybeId={id}
      type={CONTROL_GROUP_TYPE}
      getParentApi={() => ({
        reload$,
        dataLoading$,
        viewMode$,
        query$: searchApi.query$,
        timeRange$: searchApi.timeRange$,
        unifiedSearchFilters$: searchApi.filters$,
        getSerializedStateForChild: () => lastState$Ref.current.value,
        lastSavedStateForChild$: () => lastState$Ref.current,
        getLastSavedStateForChild: () => lastState$Ref.current.value,
        compressed: compressed ?? true,
      })}
      onApiAvailable={async (controlGroupApi) => {
        await controlGroupApi.untilInitialized();
        const controlGroupRendererApi: ControlGroupRendererApi = {
          ...controlGroupApi,
          reload: () => reload$.next(),
          updateInput: (newInput: Partial<ControlGroupRuntimeState>) => {
            lastState$Ref.current.next(
              serializeRuntimeState({
                ...lastState$Ref.current.value,
                ...newInput,
              })
            );
            controlGroupApi.resetUnsavedChanges();
          },
          getInput$: () => lastState$Ref.current.pipe(map(deserializeControlGroup)),
          getInput: () => deserializeControlGroup(lastState$Ref.current.value),
        };
        setControlGroup(controlGroupRendererApi);
        onApiAvailable(controlGroupRendererApi);
      }}
      hidePanelChrome
      panelProps={{ hideLoader: true }}
    />
  );
};
