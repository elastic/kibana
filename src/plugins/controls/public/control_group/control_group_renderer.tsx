/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';
import { isEqual } from 'lodash';
import useLifecycles from 'react-use/lib/useLifecycles';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { compareFilters } from '@kbn/es-query';
import type { Filter, TimeRange, Query } from '@kbn/es-query';
import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import {
  ControlGroupCreationOptions,
  ControlGroupInput,
  ControlGroupOutput,
  ControlGroupReduxState,
  CONTROL_GROUP_TYPE,
} from './types';
import { pluginServices } from '../services';
import { getDefaultControlGroupInput } from '../../common';
import { controlGroupReducers } from './state/control_group_reducers';
import { controlGroupInputBuilder } from './control_group_input_builder';
import { ControlGroupContainer } from './embeddable/control_group_container';
import { ControlGroupContainerFactory } from './embeddable/control_group_container_factory';

export interface ControlGroupRendererProps {
  filters?: Filter[];
  getCreationOptions: (
    initialInput: Partial<ControlGroupInput>,
    builder: typeof controlGroupInputBuilder
  ) => Promise<ControlGroupCreationOptions>;
  onLoadComplete?: (controlGroup: ControlGroupContainer) => void;
  timeRange?: TimeRange;
  query?: Query;
}

export const ControlGroupRenderer = ({
  onLoadComplete,
  getCreationOptions,
  filters,
  timeRange,
  query,
}: ControlGroupRendererProps) => {
  const controlGroupRef = useRef(null);
  const [controlGroup, setControlGroup] = useState<ControlGroupContainer>();
  const id = useMemo(() => uuidv4(), []);
  /**
   * Use Lifecycles to load initial control group container
   */
  useLifecycles(
    // onMount
    () => {
      const { embeddable } = pluginServices.getServices();
      (async () => {
        const factory = embeddable.getEmbeddableFactory(CONTROL_GROUP_TYPE) as EmbeddableFactory<
          ControlGroupInput,
          ControlGroupOutput,
          ControlGroupContainer
        > & {
          create: ControlGroupContainerFactory['create'];
        };
        const { initialInput, settings } = await getCreationOptions(
          getDefaultControlGroupInput(),
          controlGroupInputBuilder
        );
        const newControlGroup = (await factory?.create(
          {
            id,
            ...getDefaultControlGroupInput(),
            ...initialInput,
          },
          undefined,
          settings
        )) as ControlGroupContainer;

        if (controlGroupRef.current) {
          newControlGroup.render(controlGroupRef.current);
        }
        setControlGroup(newControlGroup);
        if (onLoadComplete) {
          onLoadComplete(newControlGroup);
        }
      })();
    },
    // onUnmount
    () => {
      controlGroup?.destroy();
    }
  );

  useEffect(() => {
    if (!controlGroup) {
      return;
    }

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

  return <div ref={controlGroupRef} />;
};

export const useControlGroupContainerContext = () =>
  useReduxEmbeddableContext<
    ControlGroupReduxState,
    typeof controlGroupReducers,
    ControlGroupContainer
  >();

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default ControlGroupRenderer;
