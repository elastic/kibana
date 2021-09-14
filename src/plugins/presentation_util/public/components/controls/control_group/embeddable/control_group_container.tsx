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
  Container,
  EmbeddableFactory,
  EmbeddableFactoryNotFoundError,
} from '../../../../../../embeddable/public';
import { ControlGroup } from '../component/control_group_component';
import { CONTROL_GROUP_TYPE } from '../control_group_constants';
import {
  ControlGroupInput,
  InputControlEmbeddable,
  InputControlInput,
  InputControlOutput,
  ControlPanelState,
  IEditableControlEmbeddable,
} from '../../types';
import { ControlsService } from '../../controlsService';
import { PresentationOverlaysService } from '../../../../services/overlays';
import { toMountPoint } from '../../../../../../kibana_react/public';
import { ManageControlComponent } from '../control_group_editor/manage_control';

export class ControlGroupContainer extends Container<InputControlInput, ControlGroupInput> {
  public readonly type = CONTROL_GROUP_TYPE;

  constructor(
    initialInput: ControlGroupInput,
    private readonly controlsService: ControlsService,
    private readonly openFlyout: PresentationOverlaysService['openFlyout'],
    parent?: Container
  ) {
    super(initialInput, { embeddableLoaded: {} }, controlsService.getControlFactory, parent);
    this.openFlyout = openFlyout;
    this.controlsService = controlsService;
  }

  protected createNewPanelState<TEmbeddableInput extends InputControlInput = InputControlInput>(
    factory: EmbeddableFactory<InputControlInput, InputControlOutput, InputControlEmbeddable>,
    partial: Partial<TEmbeddableInput> = {}
  ): ControlPanelState<TEmbeddableInput> {
    const panelState = super.createNewPanelState(factory, partial);
    return {
      order: 1,
      width: 'auto',
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

  public createNewControl = async (type: string) => {
    const factory = this.controlsService.getControlFactory(type);
    if (!factory) {
      throw new EmbeddableFactoryNotFoundError(type);
    }
    if (factory.getExplicitInput) {
      const explicitInput = await factory.getExplicitInput();
      await this.addNewEmbeddable(type, explicitInput);
    }
  };

  public editControl = async (embeddableId: string) => {
    const panel = this.getInput().panels[embeddableId];
    const embeddable = (await this.untilEmbeddableLoaded(
      embeddableId
    )) as IEditableControlEmbeddable;

    const flyoutInstance = this.openFlyout(
      toMountPoint(
        <ManageControlComponent
          panel={panel}
          title={embeddable.getTitle()}
          controlEditor={embeddable.getControlEditor?.({
            onChange: (partialInput) => embeddable.updateInput(partialInput),
          })}
          onClose={() => flyoutInstance.close()}
          removeControl={() => this.removeEmbeddable(embeddableId)}
          updateTitle={(newTitle) => embeddable.updateInput({ title: newTitle })}
          updatePanel={(partialPanel) =>
            this.updateInput({
              panels: {
                ...this.getInput().panels,
                [embeddableId]: { ...this.getInput().panels[embeddableId], ...partialPanel },
              },
            })
          }
        />
      )
    );
  };

  public render(dom: HTMLElement) {
    ReactDOM.render(
      <ControlGroup controlGroupContainer={this} openFlyout={this.openFlyout} />,
      dom
    );
  }
}
