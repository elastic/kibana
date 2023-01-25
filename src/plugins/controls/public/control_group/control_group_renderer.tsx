/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import useLifecycles from 'react-use/lib/useLifecycles';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { compareFilters } from '@kbn/es-query';
import { IEmbeddable } from '@kbn/embeddable-plugin/public';
import type { Filter, TimeRange, Query } from '@kbn/es-query';

import { pluginServices } from '../services';
import { getDefaultControlGroupInput } from '../../common';
import { controlGroupInputBuilder } from './control_group_input_builder';
import { ControlGroupContainer } from './embeddable/control_group_container';
import { ControlGroupInput, ControlGroupOutput, CONTROL_GROUP_TYPE } from './types';

export interface ControlGroupRendererProps {
  filters?: Filter[];
  getInitialInput: (
    initialInput: Partial<ControlGroupInput>,
    builder: typeof controlGroupInputBuilder
  ) => Promise<Partial<ControlGroupInput>>;
  onLoadComplete?: (controlGroup: ControlGroupContainer) => void;
  timeRange?: TimeRange;
  query?: Query;
}

export const ControlGroupRenderer = ({
  onLoadComplete,
  getInitialInput,
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
        const factory = embeddable.getEmbeddableFactory<
          ControlGroupInput,
          ControlGroupOutput,
          IEmbeddable<ControlGroupInput, ControlGroupOutput>
        >(CONTROL_GROUP_TYPE);
        const newControlGroup = (await factory?.create({
          id,
          ...getDefaultControlGroupInput(),
          ...(await getInitialInput(getDefaultControlGroupInput(), controlGroupInputBuilder)),
        })) as ControlGroupContainer;

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

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default ControlGroupRenderer;
