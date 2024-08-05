/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import type { Filter, Query, TimeRange } from '@kbn/es-query';

import { EuiLoadingSpinner } from '@elastic/eui';
import { CONTROL_GROUP_TYPE, getDefaultControlGroupInput } from '@kbn/controls-plugin/common';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { omit } from 'lodash';
import { map } from 'rxjs';
import { ControlGroupApi, ControlGroupRuntimeState, ControlGroupSerializedState } from '../types';
import { controlGroupInputBuilder, ControlGroupInputBuilder } from './control_group_input_builder';
import {
  AwaitingControlGroupApi,
  ControlGroupCreationOptions,
  ControlGroupRendererState,
  ControlGroupRendererApi,
} from './types';

export interface ControlGroupRendererProps {
  filters?: Filter[];
  getCreationOptions?: (
    initialInput: Partial<ControlGroupRendererState>,
    builder: ControlGroupInputBuilder
  ) => Promise<Partial<ControlGroupCreationOptions>>;
  timeRange?: TimeRange;
  query?: Query;
}

export const ControlGroupRenderer = forwardRef<AwaitingControlGroupApi, ControlGroupRendererProps>(
  ({ getCreationOptions, filters, timeRange, query }, ref) => {
    const [serializedState, setSerializedState] = useState<
      ControlGroupSerializedState | undefined
    >();
    const [controlGroup, setControlGroup] = useState<ControlGroupRendererApi | undefined>();

    useImperativeHandle(ref, () => controlGroup ?? null, [controlGroup]);
    const id = useMemo(() => uuidv4(), []);

    // onMount
    useEffect(() => {
      let cancelled = false;
      (async () => {
        const { initialInput, settings, fieldFilterPredicate } =
          (await getCreationOptions?.(getDefaultControlGroupInput(), controlGroupInputBuilder)) ??
          {};
        console.log({ initialInput, settings, fieldFilterPredicate });
        if (!cancelled)
          setSerializedState({
            ...omit(initialInput, ['panels', 'ignoreParentSettings']),
            panelsJSON: JSON.stringify(initialInput?.panels ?? {}),
            ignoreParentSettingsJSON: JSON.stringify(initialInput?.ignoreParentSettings ?? {}),
          } as ControlGroupSerializedState);
      })();
      return () => {
        cancelled = true;
      };
      // exhaustive deps disabled because we want the control group to be created only on first render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      // if (!controlGroup) return;
      // if (
      //   (timeRange && !isEqual(controlGroup.getInput().timeRange, timeRange)) ||
      //   !compareFilters(controlGroup.getInput().filters ?? [], filters ?? []) ||
      //   !isEqual(controlGroup.getInput().query, query)
      // ) {
      //   controlGroup.updateInput({
      //     timeRange,
      //     query,
      //     filters,
      //   });
      // }
    }, [query, filters, controlGroup, timeRange]);

    return !serializedState ? (
      <EuiLoadingSpinner />
    ) : (
      <ReactEmbeddableRenderer<
        ControlGroupSerializedState,
        ControlGroupRuntimeState,
        ControlGroupApi
      >
        maybeId={id}
        type={CONTROL_GROUP_TYPE}
        getParentApi={() => ({ getSerializedStateForChild: () => ({ rawState: serializedState }) })}
        onApiAvailable={(childApi) => {
          console.log(childApi);
          setControlGroup({
            ...childApi,
            onFiltersPublished$: childApi.filters$.pipe(
              map((newFilters: Filter[] | undefined): Filter[] => newFilters ?? [])
            ),
          });
        }}
        hidePanelChrome
      />
    );

    // onMount
    // useEffect(() => {
    //   let canceled = false;
    //   let destroyControlGroup: () => void;

    //   (async () => {
    //     const factory = await getReactEmbeddableFactory<
    //       ControlGroupSerializedState,
    //       ControlGroupRuntimeState,
    //       ControlGroupApi
    //     >(CONTROL_GROUP_TYPE);

    // const { initialInput, settings, fieldFilterPredicate } =
    //   (await getCreationOptions?.(getDefaultControlGroupInput(), controlGroupInputBuilder)) ??
    //   {};
    //     const newControlGroup = (await factory?.create(
    //       {
    //         id,
    //         ...getDefaultControlGroupInput(),
    //         ...initialInput,
    //       },
    //       undefined,
    //       {
    //         ...settings,
    //         lastSavedInput: {
    //           ...getDefaultControlGroupPersistableInput(),
    //           ...pick(initialInput, persistableControlGroupInputKeys),
    //         },
    //       },
    //       fieldFilterPredicate
    //     )) as ControlGroupContainer;

    //     if (canceled) {
    //       newControlGroup.destroy();
    //       controlGroup?.destroy();
    //       return;
    //     }

    //     if (controlGroupDomRef.current) {
    //       newControlGroup.render(controlGroupDomRef.current);
    //     }
    //     setControlGroup(newControlGroup);
    //     destroyControlGroup = () => newControlGroup.destroy();
    //   })();
    //   return () => {
    //     canceled = true;
    //     destroyControlGroup?.();
    //   };
    //   // exhaustive deps disabled because we want the control group to be created only on first render.
    //   // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, []);

    // useEffect(() => {
    //   if (!controlGroup) return;
    //   if (
    //     (timeRange && !isEqual(controlGroup.getInput().timeRange, timeRange)) ||
    //     !compareFilters(controlGroup.getInput().filters ?? [], filters ?? []) ||
    //     !isEqual(controlGroup.getInput().query, query)
    //   ) {
    //     controlGroup.updateInput({
    //       timeRange,
    //       query,
    //       filters,
    //     });
    //   }
    // }, [query, filters, controlGroup, timeRange]);

    // return <div ref={controlGroupDomRef} />;
  }
);
