/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import {
  InputControlEmbeddable,
  InputControlInput,
  InputControlOutput,
} from '../../../../services/controls';
import { pluginServices } from '../../../../services';
import { ControlGroupInput, ControlPanelState } from '../types';
import { ControlGroup } from '../component/control_group_component';
import { controlGroupReducers } from '../state/control_group_reducers';
import { Container, EmbeddableFactory } from '../../../../../../embeddable/public';
import { CONTROL_GROUP_TYPE, DEFAULT_CONTROL_WIDTH } from '../control_group_constants';
import { ReduxEmbeddableWrapper } from '../../../redux_embeddables/redux_embeddable_wrapper';

export class ControlGroupContainer extends Container<InputControlInput, ControlGroupInput> {
  public readonly type = CONTROL_GROUP_TYPE;

  constructor(initialInput: ControlGroupInput, parent?: Container) {
    super(
      initialInput,
      { embeddableLoaded: {} },
      pluginServices.getServices().controls.getControlFactory,
      parent
    );
  }

  protected createNewPanelState<TEmbeddableInput extends InputControlInput = InputControlInput>(
    factory: EmbeddableFactory<InputControlInput, InputControlOutput, InputControlEmbeddable>,
    partial: Partial<TEmbeddableInput> = {}
  ): ControlPanelState<TEmbeddableInput> {
    const panelState = super.createNewPanelState(factory, partial);
    const highestOrder = Object.values(this.getInput().panels).reduce((highestSoFar, panel) => {
      if (panel.order > highestSoFar) highestSoFar = panel.order;
      return highestSoFar;
    }, 0);
    return {
      order: highestOrder + 1,
      width: this.getInput().defaultControlWidth ?? DEFAULT_CONTROL_WIDTH,
      ...panelState,
    } as ControlPanelState<TEmbeddableInput>;
  }

  protected getInheritedInput(id: string): InputControlInput {
    const { filters, query, timeRange, inheritParentState } = this.getInput();
    return {
      filters: inheritParentState.useFilters ? filters : undefined,
      query: inheritParentState.useQuery ? query : undefined,
      timeRange: inheritParentState.useTimerange ? timeRange : undefined,
      id,
    };
  }

  public render(dom: HTMLElement) {
    const PresentationUtilProvider = pluginServices.getContextProvider();
    ReactDOM.render(
      <PresentationUtilProvider>
        <ReduxEmbeddableWrapper<ControlGroupInput>
          embeddable={this}
          reducers={controlGroupReducers}
        >
          <ControlGroup />
        </ReduxEmbeddableWrapper>
      </PresentationUtilProvider>,
      dom
    );
  }
}
