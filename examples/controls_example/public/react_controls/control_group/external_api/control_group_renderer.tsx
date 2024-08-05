/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { BehaviorSubject } from 'rxjs';

import { EuiLoadingSpinner } from '@elastic/eui';
import { CONTROL_GROUP_TYPE, getDefaultControlGroupInput } from '@kbn/controls-plugin/common';
import { ControlStyle } from '@kbn/controls-plugin/public';
import { ReactEmbeddableRenderer, ViewMode } from '@kbn/embeddable-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { type ViewMode as ViewModeType, useSearchApi } from '@kbn/presentation-publishing';

import { ControlGroupApi, ControlGroupRuntimeState, ControlGroupSerializedState } from '../types';
import { ControlGroupInputBuilder, controlGroupInputBuilder } from './control_group_input_builder';
import {
  AwaitingControlGroupApi,
  ControlGroupCreationOptions,
  ControlGroupRendererApi,
  ControlGroupRendererState,
  ControlGroupSettings,
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
    const [controlGroup, setControlGroup] = useState<ControlGroupRendererApi | undefined>();
    useImperativeHandle(ref, () => controlGroup as ControlGroupRendererApi, [controlGroup]);

    const searchApi = useSearchApi({
      filters,
      query,
      timeRange,
    });

    const [serializedState, setSerializedState] = useState<
      ControlGroupSerializedState | undefined
    >();
    const [controlGroupSettings, setControlGroupSettings] = useState<
      ControlGroupSettings | undefined
    >(undefined);
    const viewMode$ = useMemo(() => new BehaviorSubject<ViewModeType>(ViewMode.VIEW), []);

    // onMount
    useEffect(() => {
      let cancelled = false;
      (async () => {
        const { initialInput, settings } =
          (await getCreationOptions?.(getDefaultControlGroupInput(), controlGroupInputBuilder)) ??
          {};
        if (!cancelled) {
          setSerializedState({
            ...omit(initialInput, ['panels', 'ignoreParentSettings']),
            panelsJSON: JSON.stringify(initialInput?.panels ?? {}),
            ignoreParentSettingsJSON: JSON.stringify(initialInput?.ignoreParentSettings ?? {}),
          } as ControlGroupSerializedState);
          setControlGroupSettings(settings);
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

    return apiLoading ? (
      <EuiLoadingSpinner />
    ) : (
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
          childApi.settings$.next(controlGroupSettings); // set settings via creation options
          setControlGroup(childApi);
        }}
        hidePanelChrome
      />
    );
  }
);
