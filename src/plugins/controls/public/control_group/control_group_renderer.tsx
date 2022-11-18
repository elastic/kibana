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
import { ControlPanelState, getDefaultControlGroupInput } from '../../common';
import { ControlGroupInput, ControlGroupOutput, CONTROL_GROUP_TYPE } from './types';
import { ControlGroupContainer } from './embeddable/control_group_container';
import { DataControlInput } from '../types';

const ControlGroupInputBuilder = {
  addDataControlFromField: (
    initialInput: Partial<ControlGroupInput>,
    newPanelInput: {
      panelId?: string;
      dataViewId: string;
      fieldName: string;
      title?: string;
    }
  ) => {
    const { panelId, dataViewId, fieldName, title } = newPanelInput;
    console.log('here');
    const newPanelId = panelId ?? uuid.v4();
    initialInput.panels = {
      ...initialInput.panels,
      [newPanelId]: {
        explicitInput: { id: newPanelId, dataViewId, fieldName, title: title ?? fieldName },
        grow: true,
        order: 0,
        type: 'optionsListControl',
        width: 'medium',
      } as ControlPanelState<DataControlInput>,
    };
  },
};

export interface ControlGroupRendererProps {
  // input?: Partial<Pick<ControlGroupInput, 'viewMode' | 'executionContext'>>;
  onEmbeddableLoad: (controlGroupContainer: ControlGroupContainer) => void;
  getCreationOptions: (builder: typeof ControlGroupInputBuilder) => Partial<ControlGroupInput>;
}

export const ControlGroupRenderer = ({
  onEmbeddableLoad,
  getCreationOptions,
}: ControlGroupRendererProps) => {
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
        const factory = embeddable.getEmbeddableFactory<
          ControlGroupInput,
          ControlGroupOutput,
          IEmbeddable<ControlGroupInput, ControlGroupOutput>
        >(CONTROL_GROUP_TYPE);
        const container = (await factory?.create({
          id,
          ...getDefaultControlGroupInput(),
          ...getCreationOptions(ControlGroupInputBuilder),
        })) as ControlGroupContainer;

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

  return <div ref={controlsRoot} />;
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default ControlGroupRenderer;
