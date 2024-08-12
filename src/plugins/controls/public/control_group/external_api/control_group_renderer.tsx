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

import { CONTROL_GROUP_TYPE, getDefaultControlGroupInput } from '../../../common';
import {
  ControlGroupApi,
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
} from '../../react_controls/control_group/types';
import { ControlGroupInputBuilder, controlGroupInputBuilder } from './control_group_input_builder';
import {
  AwaitingControlGroupApi,
  ControlGroupCreationOptions,
  ControlGroupRendererState,
} from './types';

export interface ControlGroupRendererProps {
  getCreationOptions?: (
    initialInput: Partial<ControlGroupRendererState>,
    builder: ControlGroupInputBuilder
  ) => Promise<Partial<ControlGroupCreationOptions>>;
  filters?: Filter[];
  timeRange?: TimeRange;
  query?: Query;
}

export const ControlGroupRenderer = forwardRef<AwaitingControlGroupApi, ControlGroupRendererProps>(
  ({ getCreationOptions, filters, timeRange, query }, ref) => {
    const id = useMemo(() => uuidv4(), []);
    const [apiLoading, setApiLoading] = useState<boolean>(true);
    const [controlGroup, setControlGroup] = useState<ControlGroupApi | undefined>();
    useImperativeHandle(ref, () => controlGroup as ControlGroupApi, [controlGroup]);

    const searchApi = useSearchApi({
      filters,
      query,
      timeRange,
    });

    const [serializedState, setSerializedState] = useState<
      ControlGroupSerializedState | undefined
    >();
    const viewMode$ = useMemo(() => new BehaviorSubject<ViewModeType>(ViewMode.VIEW), []);

    // onMount
    useEffect(() => {
      let cancelled = false;
      (async () => {
        const { initialInput, settings } =
          (await getCreationOptions?.(getDefaultControlGroupInput(), controlGroupInputBuilder)) ??
          {};
        if (!cancelled) {
          const state = {
            ...omit(initialInput, ['panels', 'ignoreParentSettings']),
            settings,
            panelsJSON: JSON.stringify(initialInput?.panels ?? {}),
            ignoreParentSettingsJSON: JSON.stringify(initialInput?.ignoreParentSettings ?? {}),
          } as ControlGroupSerializedState;
          setSerializedState(state);
          if (initialInput?.viewMode) viewMode$.next(initialInput.viewMode);
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
        maybeId={id}
        type={CONTROL_GROUP_TYPE}
        getParentApi={() => ({
          ...searchApi,
          viewMode: viewMode$,
          getSerializedStateForChild: () => ({ rawState: serializedState! }),
        })}
        onApiAvailable={(childApi) => {
          setControlGroup(childApi);
        }}
        hidePanelChrome
      />
    );
  }
);
