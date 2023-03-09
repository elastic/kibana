/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { isErrorEmbeddable, ViewMode } from '@kbn/embeddable-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { ControlGroupContainer } from '..';
import { pluginServices } from '../../services';
import { EditControlFlyout } from './edit_control_flyout';
import { DeleteControlAction } from './delete_control_action';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlEmbeddable, DataControlInput } from '../../types';
import { isControlGroup, setFlyoutRef } from '../embeddable/control_group_container';

export const ACTION_EDIT_CONTROL = 'editControl';

export interface EditControlActionContext {
  embeddable: ControlEmbeddable<DataControlInput>;
}

export class EditControlAction implements Action<EditControlActionContext> {
  public readonly type = ACTION_EDIT_CONTROL;
  public readonly id = ACTION_EDIT_CONTROL;
  public order = 1;

  private getEmbeddableFactory;
  private openFlyout;
  private theme$;

  constructor(private deleteControlAction: DeleteControlAction) {
    ({
      embeddable: { getEmbeddableFactory: this.getEmbeddableFactory },
      overlays: { openFlyout: this.openFlyout },
      theme: { theme$: this.theme$ },
    } = pluginServices.getServices());
  }

  public readonly MenuItem = ({ context }: { context: EditControlActionContext }) => {
    const { embeddable } = context;
    return (
      <EuiToolTip content={this.getDisplayName(context)}>
        <EuiButtonIcon
          data-test-subj={`control-action-${embeddable.id}-edit`}
          aria-label={this.getDisplayName(context)}
          iconType={this.getIconType(context)}
          onClick={() => this.execute(context)}
          color="text"
        />
      </EuiToolTip>
    );
  };

  public getDisplayName({ embeddable }: EditControlActionContext) {
    if (!embeddable.parent || !isControlGroup(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return ControlGroupStrings.floatingActions.getEditButtonTitle();
  }

  public getIconType({ embeddable }: EditControlActionContext) {
    if (!embeddable.parent || !isControlGroup(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return 'pencil';
  }

  public async isCompatible({ embeddable }: EditControlActionContext) {
    if (isErrorEmbeddable(embeddable)) return false;
    const controlGroup = embeddable.parent;
    const factory = this.getEmbeddableFactory(embeddable.type);
    return Boolean(
      !isErrorEmbeddable(embeddable) &&
        controlGroup &&
        isControlGroup(controlGroup) &&
        controlGroup.getInput().viewMode === ViewMode.EDIT &&
        factory &&
        (await factory.isEditable())
    );
  }

  public async execute({ embeddable }: EditControlActionContext) {
    if (!embeddable.parent || !isControlGroup(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    const controlGroup = embeddable.parent as ControlGroupContainer;
    const ControlsServicesProvider = pluginServices.getContextProvider();
    const ReduxWrapper = controlGroup.getReduxEmbeddableTools().Wrapper;

    const flyoutInstance = this.openFlyout(
      toMountPoint(
        <ControlsServicesProvider>
          <ReduxWrapper>
            <EditControlFlyout
              embeddable={embeddable}
              removeControl={() => this.deleteControlAction.execute({ embeddable })}
              closeFlyout={() => {
                flyoutInstance.close();
                setFlyoutRef(undefined);
              }}
            />
          </ReduxWrapper>
        </ControlsServicesProvider>,
        { theme$: this.theme$ }
      ),
      {
        'aria-label': ControlGroupStrings.manageControl.getFlyoutEditTitle(),
        outsideClickCloses: false,
        onClose: (flyout) => {
          flyout.close();
          setFlyoutRef(undefined);
        },
        ownFocus: true,
      }
    );
    setFlyoutRef(flyoutInstance);
  }
}
