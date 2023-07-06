/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isEqual } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import { compareFilters } from '@kbn/es-query';
import type { Filter, TimeRange, Query } from '@kbn/es-query';
import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';

import {
  ControlGroupInput,
  CONTROL_GROUP_TYPE,
  ControlGroupOutput,
  ControlGroupCreationOptions,
} from '../types';
import {
  ControlGroupAPI,
  AwaitingControlGroupAPI,
  buildApiFromControlGroupContainer,
} from './control_group_api';
import { getDefaultControlGroupInput } from '../../../common';
import { controlGroupInputBuilder, ControlGroupInputBuilder } from './control_group_input_builder';
import { ControlGroupContainer } from '../embeddable/control_group_container';
import { ControlGroupContainerFactory } from '../embeddable/control_group_container_factory';

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
    const [controlGroup, setControlGroup] = useState<ControlGroupContainer>();

    useImperativeHandle(
      ref,
      () => buildApiFromControlGroupContainer(controlGroup) as ControlGroupAPI,
      [controlGroup]
    );

    const controlGroupDomRef = useRef(null);
    const id = useMemo(() => uuidv4(), []);

    // onMount
    useEffect(() => {
      let canceled = false;
      let destroyControlGroup: () => void;

      (async () => {
        // Lazy loading all services is required in this component because it is exported and contributes to the bundle size.
        const { pluginServices } = await import('../../services/plugin_services');
        const { embeddable } = pluginServices.getServices();

        const factory = embeddable.getEmbeddableFactory(CONTROL_GROUP_TYPE) as EmbeddableFactory<
          ControlGroupInput,
          ControlGroupOutput,
          ControlGroupContainer
        > & {
          create: ControlGroupContainerFactory['create'];
        };
        const { initialInput, settings, fieldFilterPredicate } =
          (await getCreationOptions?.(getDefaultControlGroupInput(), controlGroupInputBuilder)) ??
          {};
        const newControlGroup = (await factory?.create(
          {
            id,
            ...getDefaultControlGroupInput(),
            ...initialInput,
          },
          undefined,
          settings,
          fieldFilterPredicate
        )) as ControlGroupContainer;

        if (canceled) {
          newControlGroup.destroy();
          controlGroup?.destroy();
          return;
        }

        if (controlGroupDomRef.current) {
          newControlGroup.render(controlGroupDomRef.current);
        }
        setControlGroup(newControlGroup);
        destroyControlGroup = () => newControlGroup.destroy();
      })();
      return () => {
        canceled = true;
        destroyControlGroup?.();
      };
      // exhaustive deps disabled because we want the control group to be created only on first render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      if (!controlGroup) return;
      if (
        (timeRange && !isEqual(controlGroup.getInput().timeRange, timeRange)) ||
        !compareFilters(controlGroup.getInput().filters ?? [], filters ?? []) ||
        !isEqual(controlGroup.getInput().query, query)
      ) {
        controlGroup.updateInput({
          timeRange,
          query,
          filters,
        });
      }
    }, [query, filters, controlGroup, timeRange]);

    return <div ref={controlGroupDomRef} />;
  }
);
