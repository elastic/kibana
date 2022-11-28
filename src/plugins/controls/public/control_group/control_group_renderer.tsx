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
import { useReduxContainerContext } from '@kbn/presentation-util-plugin/public';
import { ControlStyle } from '../types';

import { pluginServices } from '../services';
import { ControlPanelState, getDefaultControlGroupInput } from '../../common';
import {
  ControlGroupInput,
  ControlGroupOutput,
  ControlGroupReduxState,
  CONTROL_GROUP_TYPE,
} from './types';
import { ControlGroupContainer } from './embeddable/control_group_container';
import { DataControlInput } from '../types';
import { getCompatibleControlType, getNextPanelOrder } from './embeddable/control_group_helpers';
import { controlGroupReducers } from './state/control_group_reducers';

const ControlGroupInputBuilder = {
  addDataControlFromField: async (
    initialInput: Partial<ControlGroupInput>,
    newPanelInput: {
      title?: string;
      panelId?: string;
      fieldName: string;
      dataViewId: string;
    } & Partial<ControlPanelState>
  ) => {
    const { defaultControlGrow, defaultControlWidth } = getDefaultControlGroupInput();
    const controlGrow = initialInput.defaultControlGrow ?? defaultControlGrow;
    const controlWidth = initialInput.defaultControlWidth ?? defaultControlWidth;

    const { panelId, dataViewId, fieldName, title, grow, width } = newPanelInput;
    const newPanelId = panelId || uuid.v4();
    const nextOrder = getNextPanelOrder(initialInput);
    const controlType = await getCompatibleControlType({ dataViewId, fieldName });

    initialInput.panels = {
      ...initialInput.panels,
      [newPanelId]: {
        order: nextOrder,
        type: controlType,
        grow: grow ?? controlGrow,
        width: width ?? controlWidth,
        explicitInput: { id: newPanelId, dataViewId, fieldName, title: title ?? fieldName },
      } as ControlPanelState<DataControlInput>,
    };
  },
};

export interface ControlGroupRendererProps {
  controlStyle?: ControlStyle;
  onEmbeddableLoad?: (controlGroupContainer: ControlGroupContainer) => void;
  getCreationOptions: (
    builder: typeof ControlGroupInputBuilder
  ) => Promise<Partial<ControlGroupInput>>;
}

export const ControlGroupRenderer = ({
  onEmbeddableLoad,
  getCreationOptions,
  controlStyle = 'oneLine',
}: ControlGroupRendererProps) => {
  const controlGroupRef = useRef(null);
  const [controlGroup, setControlGroup] = useState<ControlGroupContainer>();
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
          ...(await getCreationOptions(ControlGroupInputBuilder)),
          controlStyle,
        })) as ControlGroupContainer;
        if (controlGroupRef.current) {
          container.render(controlGroupRef.current);
        }
        setControlGroup(container);
        if (onEmbeddableLoad) {
          onEmbeddableLoad(container);
        }
      })();
    },
    () => {
      controlGroup?.destroy();
    }
  );

  useEffect(() => {
    if (!controlGroup) {
      return;
    }

    const { actions, dispatch } = controlGroup.getReduxEmbeddableTools();
    dispatch(actions.setControlStyle(controlStyle));
  }, [controlGroup, controlStyle]);

  return <div ref={controlGroupRef} />;
};

export const useControlGroupContainerContext = () =>
  useReduxContainerContext<ControlGroupReduxState, typeof controlGroupReducers>();

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default ControlGroupRenderer;
