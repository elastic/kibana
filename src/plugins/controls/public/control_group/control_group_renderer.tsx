/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import useLifecycles from 'react-use/lib/useLifecycles';
import React, { useMemo, useRef, useState } from 'react';

import { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { useReduxContainerContext } from '@kbn/presentation-util-plugin/public';

import { pluginServices } from '../services';
import { getDefaultControlGroupInput } from '../../common';
import {
  ControlGroupInput,
  ControlGroupOutput,
  ControlGroupReduxState,
  CONTROL_GROUP_TYPE,
} from './types';
import { ControlGroupContainer } from './embeddable/control_group_container';
import { controlGroupReducers } from './state/control_group_reducers';
import { controlGroupInputBuilder } from './control_group_input_builder';

export interface ControlGroupRendererProps {
  onLoadComplete?: (controlGroup: ControlGroupContainer) => void;
  getInitialInput: (
    initialInput: Partial<ControlGroupInput>,
    builder: typeof controlGroupInputBuilder
  ) => Promise<Partial<ControlGroupInput>>;
}

export const ControlGroupRenderer = ({
  onLoadComplete,
  getInitialInput,
}: ControlGroupRendererProps) => {
  const controlGroupRef = useRef(null);
  const [controlGroup, setControlGroup] = useState<ControlGroupContainer>();
  const id = useMemo(() => uuid.v4(), []);
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

  return <div ref={controlGroupRef} />;
};

export const useControlGroupContainerContext = () =>
  useReduxContainerContext<ControlGroupReduxState, typeof controlGroupReducers>();

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default ControlGroupRenderer;
