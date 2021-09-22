/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { cloneDeep } from 'lodash';

import {
  Container,
  EmbeddableFactory,
  EmbeddableFactoryNotFoundError,
} from '../../../../../embeddable/public';
import {
  InputControlEmbeddable,
  InputControlInput,
  InputControlOutput,
  IEditableControlFactory,
  ControlWidth,
} from '../types';
import { ControlsService } from '../controls_service';
import { ControlGroupInput, ControlPanelState } from './types';
import { ManageControlComponent } from './editor/manage_control';
import { toMountPoint } from '../../../../../kibana_react/public';
import { ControlGroup } from './component/control_group_component';
import { PresentationOverlaysService } from '../../../services/overlays';
import { CONTROL_GROUP_TYPE, DEFAULT_CONTROL_WIDTH } from './control_group_constants';
import { ManageControlGroup } from './editor/manage_control_group_component';
import { OverlayRef } from '../../../../../../core/public';
import { ControlGroupStrings } from './control_group_strings';

export class ControlGroupContainer extends Container<InputControlInput, ControlGroupInput> {
  public readonly type = CONTROL_GROUP_TYPE;

  private nextControlWidth: ControlWidth = DEFAULT_CONTROL_WIDTH;

  constructor(
    initialInput: ControlGroupInput,
    private readonly controlsService: ControlsService,
    private readonly overlays: PresentationOverlaysService,
    parent?: Container
  ) {
    super(initialInput, { embeddableLoaded: {} }, controlsService.getControlFactory, parent);
    this.overlays = overlays;
    this.controlsService = controlsService;
  }

  protected createNewPanelState<TEmbeddableInput extends InputControlInput = InputControlInput>(
    factory: EmbeddableFactory<InputControlInput, InputControlOutput, InputControlEmbeddable>,
    partial: Partial<TEmbeddableInput> = {}
  ): ControlPanelState<TEmbeddableInput> {
    const panelState = super.createNewPanelState(factory, partial);
    return {
      order: 1,
      width: this.nextControlWidth,
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
    if (!factory) throw new EmbeddableFactoryNotFoundError(type);

    const initialInputPromise = new Promise<Omit<InputControlInput, 'id'>>((resolve, reject) => {
      let inputToReturn: Partial<InputControlInput> = {};

      const onCancel = (ref: OverlayRef) => {
        this.overlays
          .openConfirm(ControlGroupStrings.management.discardNewControl.getSubtitle(), {
            confirmButtonText: ControlGroupStrings.management.discardNewControl.getConfirm(),
            cancelButtonText: ControlGroupStrings.management.discardNewControl.getCancel(),
            title: ControlGroupStrings.management.discardNewControl.getTitle(),
            buttonColor: 'danger',
          })
          .then((confirmed) => {
            if (confirmed) {
              reject();
              ref.close();
            }
          });
      };

      const flyoutInstance = this.overlays.openFlyout(
        toMountPoint(
          <ManageControlComponent
            width={this.nextControlWidth}
            updateTitle={(newTitle) => (inputToReturn.title = newTitle)}
            updateWidth={(newWidth) => (this.nextControlWidth = newWidth)}
            controlEditorComponent={(factory as IEditableControlFactory).getControlEditor?.({
              onChange: (partialInput) => {
                inputToReturn = { ...inputToReturn, ...partialInput };
              },
            })}
            onSave={() => {
              resolve(inputToReturn);
              flyoutInstance.close();
            }}
            onCancel={() => onCancel(flyoutInstance)}
          />
        ),
        {
          onClose: (flyout) => onCancel(flyout),
        }
      );
    });
    initialInputPromise.then(
      async (explicitInput) => {
        await this.addNewEmbeddable(type, explicitInput);
      },
      () => {} // swallow promise rejection because it can be part of normal flow
    );
  };

  public editControl = async (embeddableId: string) => {
    const panel = this.getInput().panels[embeddableId];
    const factory = this.getFactory(panel.type);
    const embeddable = await this.untilEmbeddableLoaded(embeddableId);

    if (!factory) throw new EmbeddableFactoryNotFoundError(panel.type);

    const initialExplicitInput = cloneDeep(panel.explicitInput);
    const initialWidth = panel.width;

    const onCancel = (ref: OverlayRef) => {
      this.overlays
        .openConfirm(ControlGroupStrings.management.discardChanges.getSubtitle(), {
          confirmButtonText: ControlGroupStrings.management.discardChanges.getConfirm(),
          cancelButtonText: ControlGroupStrings.management.discardChanges.getCancel(),
          title: ControlGroupStrings.management.discardChanges.getTitle(),
          buttonColor: 'danger',
        })
        .then((confirmed) => {
          if (confirmed) {
            embeddable.updateInput(initialExplicitInput);
            this.updateInput({
              panels: {
                ...this.getInput().panels,
                [embeddableId]: { ...this.getInput().panels[embeddableId], width: initialWidth },
              },
            });
            ref.close();
          }
        });
    };

    const flyoutInstance = this.overlays.openFlyout(
      toMountPoint(
        <ManageControlComponent
          width={panel.width}
          title={embeddable.getTitle()}
          removeControl={() => this.removeEmbeddable(embeddableId)}
          updateTitle={(newTitle) => embeddable.updateInput({ title: newTitle })}
          controlEditorComponent={(factory as IEditableControlFactory).getControlEditor?.({
            onChange: (partialInput) => embeddable.updateInput(partialInput),
            initialInput: embeddable.getInput(),
          })}
          onCancel={() => onCancel(flyoutInstance)}
          onSave={() => flyoutInstance.close()}
          updateWidth={(newWidth) =>
            this.updateInput({
              panels: {
                ...this.getInput().panels,
                [embeddableId]: { ...this.getInput().panels[embeddableId], width: newWidth },
              },
            })
          }
        />
      ),
      {
        onClose: (flyout) => onCancel(flyout),
      }
    );
  };

  public editControlGroup = () => {
    const flyoutInstance = this.overlays.openFlyout(
      toMountPoint(
        <ManageControlGroup
          controlStyle={this.getInput().controlStyle}
          setControlStyle={(newStyle) => this.updateInput({ controlStyle: newStyle })}
          deleteAllEmbeddables={() => {
            this.overlays
              .openConfirm(ControlGroupStrings.management.deleteAllControls.getSubtitle(), {
                confirmButtonText: ControlGroupStrings.management.deleteAllControls.getConfirm(),
                cancelButtonText: ControlGroupStrings.management.deleteAllControls.getCancel(),
                title: ControlGroupStrings.management.deleteAllControls.getTitle(),
                buttonColor: 'danger',
              })
              .then((confirmed) => {
                if (confirmed) {
                  Object.keys(this.getInput().panels).forEach((id) => this.removeEmbeddable(id));
                  flyoutInstance.close();
                }
              });
          }}
          setAllPanelWidths={(newWidth) => {
            const newPanels = cloneDeep(this.getInput().panels);
            Object.values(newPanels).forEach((panel) => (panel.width = newWidth));
            this.updateInput({ panels: { ...newPanels, ...newPanels } });
          }}
          panels={this.getInput().panels}
        />
      )
    );
  };

  public render(dom: HTMLElement) {
    ReactDOM.render(<ControlGroup controlGroupContainer={this} />, dom);
  }
}
