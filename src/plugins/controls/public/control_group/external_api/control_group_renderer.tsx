/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { compareFilters } from '@kbn/es-query';
import { IEmbeddable } from '@kbn/embeddable-plugin/public';
import type { Filter, TimeRange, Query } from '@kbn/es-query';

import { getDefaultControlGroupInput } from '../../../common';
import { ControlGroupContainer } from '../embeddable/control_group_container';
import { ControlGroupInput, ControlGroupOutput, CONTROL_GROUP_TYPE } from '../types';
import { buildApiFromControlGroupContainer, ControlGroupAPI } from './control_group_api';
import { ControlGroupInputBuilder, controlGroupInputBuilder } from './control_group_input_builder';

export interface ControlGroupRendererProps {
  filters?: Filter[];
  getInitialInput: (
    initialInput: Partial<ControlGroupInput>,
    builder: ControlGroupInputBuilder
  ) => Promise<Partial<ControlGroupInput>>;
  timeRange?: TimeRange;
  query?: Query;
}

export const ControlGroupRenderer = forwardRef<ControlGroupAPI, ControlGroupRendererProps>(
  ({ getInitialInput, filters, timeRange, query }, ref) => {
    const [controlGroup, setControlGroup] = useState<ControlGroupContainer>();
    useImperativeHandle(ref, () => buildApiFromControlGroupContainer(controlGroup), [controlGroup]);

    const controlGroupDomRef = useRef(null);
    const id = useMemo(() => uuidv4(), []);

    // onMount
    useEffect(() => {
      let canceled = false;

      (async () => {
        // Lazy loading all services is required in this component because it is exported and contributes to the bundle size.
        const { pluginServices } = await import('../../services/plugin_services');
        const { embeddable } = pluginServices.getServices();

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

        if (canceled) {
          newControlGroup.destroy();
          controlGroup?.destroy();
          return;
        }

        if (controlGroupDomRef.current) {
          newControlGroup.render(controlGroupDomRef.current);
        }
        setControlGroup(newControlGroup);
      })();

      // onUnmount
      return () => {
        canceled = true;
        controlGroup?.destroy();
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

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default ControlGroupRenderer;
