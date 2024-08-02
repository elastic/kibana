/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

import type { Filter, Query, TimeRange } from '@kbn/es-query';

import { CONTROL_GROUP_TYPE, getDefaultControlGroupInput } from '@kbn/controls-plugin/common';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { ControlGroupApi, ControlGroupRuntimeState, ControlGroupSerializedState } from '../types';
import { controlGroupInputBuilder, ControlGroupInputBuilder } from './control_group_input_builder';
import { AwaitingControlGroupAPI, ControlGroupCreationOptions, ControlGroupInput } from './types';
import { EuiLoadingSpinner } from '@elastic/eui';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { omit } from 'lodash';

export interface ControlGroupRendererProps {
  filters?: Filter[];
  getCreationOptions?: (
    initialInput: Partial<ControlGroupInput>,
    builder: ControlGroupInputBuilder
  ) => Promise<ControlGroupCreationOptions>;
  timeRange?: TimeRange;
  query?: Query;
}

export const ControlGroupRenderer = forwardRef<AwaitingControlGroupAPI, ControlGroupRendererProps>(
  ({ getCreationOptions, filters, timeRange, query }, ref) => {
    const [serializedState, setSerializedState] = useState<
      ControlGroupSerializedState | undefined
    >();
    const [controlGroup, setControlGroup] = useState<ControlGroupApi | undefined>();

    useImperativeHandle(ref, () => controlGroup ?? null, [controlGroup]);

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
          } as unknown as ControlGroupSerializedState);
      })();
      return () => {
        cancelled = true;
      };
      // exhaustive deps disabled because we want the control group to be created only on first render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return !serializedState ? (
      <EuiLoadingSpinner />
    ) : (
      <ReactEmbeddableRenderer<
        ControlGroupSerializedState,
        ControlGroupRuntimeState,
        ControlGroupApi
      >
        type={CONTROL_GROUP_TYPE}
        getParentApi={() => ({ getSerializedStateForChild: () => ({ rawState: serializedState }) })}
        onApiAvailable={(childApi) => {
          console.log(childApi);
          setControlGroup({ ...childApi, onFiltersPublished$: childApi.filters$ });
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
