/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import useLifecycles from 'react-use/lib/useLifecycles';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { IEmbeddable } from '@kbn/embeddable-plugin/public';

import { pluginServices } from '../services';
import { getDefaultControlGroupInput } from '../../common';
import { ControlGroupInput, ControlGroupOutput, CONTROL_GROUP_TYPE } from './types';
import { ControlGroupContainer } from './embeddable/control_group_container';

export interface ControlGroupRendererProps {
  input?: Partial<Pick<ControlGroupInput, 'viewMode' | 'executionContext'>>;
  onEmbeddableLoad: (controlGroupContainer: ControlGroupContainer) => void;
}

export const ControlGroupRenderer = ({ input, onEmbeddableLoad }: ControlGroupRendererProps) => {
  const controlsRoot = useRef(null);
  const [controlGroupContainer, setControlGroupContainer] = useState<ControlGroupContainer>();

  const id = useMemo(() => uuid.v4(), []);

  /**
   * Use Lifecycles to load initial control group container
   */
  useLifecycles(
    () => {
      const { embeddable } = pluginServices.getServices();

      (async () => {
        const container = (await embeddable
          .getEmbeddableFactory<
            ControlGroupInput,
            ControlGroupOutput,
            IEmbeddable<ControlGroupInput, ControlGroupOutput>
          >(CONTROL_GROUP_TYPE)
          ?.create({ id, ...getDefaultControlGroupInput(), ...input })) as ControlGroupContainer;

        if (controlsRoot.current) {
          container.render(controlsRoot.current);
        }
        setControlGroupContainer(container);
        onEmbeddableLoad(container);
      })();
    },
    () => {
      controlGroupContainer?.destroy();
    }
  );

  /**
   * Update embeddable input when props input changes
   */
  useEffect(() => {
    let updateCanceled = false;
    (async () => {
      // check if applying input from props would result in any changes to the embeddable input
      const isInputEqual = await controlGroupContainer?.getExplicitInputIsEqual({
        ...controlGroupContainer?.getInput(),
        ...input,
      });
      if (!controlGroupContainer || isInputEqual || updateCanceled) return;
      controlGroupContainer.updateInput({ ...input });
    })();

    return () => {
      updateCanceled = true;
    };
  }, [controlGroupContainer, input]);

  return <div ref={controlsRoot} />;
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default ControlGroupRenderer;
