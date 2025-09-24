/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import React, { useEffect, useRef, useState } from 'react';
import { BehaviorSubject, Subject, distinctUntilChanged } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { ControlsRenderer } from '@kbn/controls-renderer';
import type { DashboardLayout } from '@kbn/dashboard-plugin/public/dashboard_api/layout_manager';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
// import { EmbeddableStart } from '@kbn/embeddable-plugin/server';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
// import { useKibana } from '@kbn/kibana-react-plugin/public';
import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import {
  apiAppliesFilters,
  useSearchApi,
  type AppliesFilters,
  type SerializedPanelState,
  type ViewMode,
} from '@kbn/presentation-publishing';

import { controlGroupStateBuilder } from './control_group_state_builder';
import type {
  ControlGroupCreationOptions,
  ControlGroupRendererApi,
  ControlGroupStateBuilder,
} from './types';

export interface ControlGroupRendererProps {
  onApiAvailable: (api: ControlGroupRendererApi) => void;
  getCreationOptions?: (
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
  // const {
  //   services: { embeddable: embeddableService },
  // } = useKibana<{ embeddable: EmbeddableStart }>();
  const lastState$Ref = useRef(new BehaviorSubject({}));

  const [isStateLoaded, setIsStateLoaded] = useState(false);
  const currentChildState = useRef<{ [id: string]: SerializedPanelState<object> }>({});

  /**
   * Parent API set up
   */
  const searchApi = useSearchApi({
    filters,
    query,
    timeRange,
  });

  const [controlGroupApi, setControlGroupApi] = useState<any>();
  const [parentApi, setParentApi] = useState<any>(() => {
    const reload$ = new Subject<void>();
    const children$ = new BehaviorSubject<{ [uuid: string]: DefaultEmbeddableApi }>({});
    const api = {
      ...searchApi,
      viewMode$: new BehaviorSubject<ViewMode>(viewMode ?? 'view'),
      dataLoading$: new BehaviorSubject<boolean>(Boolean(dataLoading)),
      reload$,
      reload: () => reload$.next(),
      getCompressed: () => (compressed === undefined ? true : compressed),
      hasUnsavedChanges$: new BehaviorSubject<boolean>(false),
      getInput$: () => lastState$Ref.current,
      getInput: () => lastState$Ref.current.value,
      children$,
      registerChildApi: (child: DefaultEmbeddableApi) => {
        children$.next({
          ...children$.value,
          [child.uuid]: child,
        });
      },
      appliedFilters$: combineCompatibleChildrenApis<AppliesFilters, Filter[] | undefined>(
        { children$ },
        'appliedFilters$',
        apiAppliesFilters,
        [],
        (values) => {
          const allOutputFilters = values.filter(
            (childOutputFilters) => childOutputFilters && childOutputFilters.length > 0
          ) as Filter[][];
          return allOutputFilters && allOutputFilters.length > 0
            ? allOutputFilters.flat()
            : undefined;
        }
      ).pipe(distinctUntilChanged(deepEqual)),
    };
    return api; // partial
  });

  useEffect(() => {
    if (viewMode) parentApi.viewMode$.next(viewMode);
  }, [viewMode, parentApi]);

  useEffect(() => {
    if (dataLoading !== parentApi.dataLoading$.getValue())
      parentApi.dataLoading$.next(Boolean(dataLoading));
  }, [dataLoading, parentApi]);

  useEffect(() => {
    const subscription = parentApi.hasUnsavedChanges$.subscribe((hasUnsavedChanges) => {
      if (hasUnsavedChanges) lastState$Ref.current.next(parentApi.serializeState());
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [parentApi]);

  /**
   * On mount
   */
  useEffect(() => {
    if (!getCreationOptions) {
      setIsStateLoaded(true);
      return;
    }

    let cancelled = false;

    getCreationOptions?.(controlGroupStateBuilder).then((creationOptions) => {
      if (cancelled) return;
      const ignoreParentSettings = creationOptions.initialState?.ignoreParentSettings;
      console.log({ creationOptions, ignoreParentSettings });
      // console.log('LAYOUT', api.layout$.value);
      setParentApi({
        ...parentApi,
        layout$: new BehaviorSubject<DashboardLayout>({
          controls: Object.values(
            creationOptions.initialState?.initialChildControlState ?? {}
          ).reduce((prev, control, index) => {
            console.log({ control });
            const { id = uuidv4(), type, width, grow, order, ...rest } = control;
            currentChildState.current[id] = {
              rawState: {
                type,
                ...rest,
                useGlobalFilters:
                  !ignoreParentSettings?.ignoreFilters || !ignoreParentSettings?.ignoreQuery,
                ignoreValidations: true,
              },
            };
            return {
              ...prev,
              [id]: {
                order: order ?? index,
                id,
                width,
                grow,
                type,
              },
            };
          }, {}),
          panels: {},
          sections: {},
        }),
        getSerializedStateForChild: (id: string) => currentChildState.current[id],
        serializeState: () => {
          return { rawState: {} };
        },
      });

      setIsStateLoaded(true);
      onApiAvailable(parentApi);
    });

    return () => {
      cancelled = true;
    };
    // exhaustive deps disabled because we want the control group to be created only on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return !isStateLoaded ? null : <ControlsRenderer parentApi={parentApi} />;
};
