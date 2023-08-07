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

import { pluginServices } from '../../services';
import { EditControlFlyout } from './edit_control_flyout';
import { DeleteControlAction } from './delete_control_action';
import { ControlGroupStrings } from '../control_group_strings';
import { ACTION_EDIT_CONTROL, ControlGroupContainer } from '..';
import { ControlEmbeddable, DataControlInput } from '../../types';
import { ControlGroupContainerContext, setFlyoutRef } from '../embeddable/control_group_container';
import { isControlGroup } from '../embeddable/control_group_helpers';

export interface EditControlActionContext {
  embeddable: ControlEmbeddable<DataControlInput>;
}

export class EditControlAction implements Action<EditControlActionContext> {
  public readonly type = ACTION_EDIT_CONTROL;
  public readonly id = ACTION_EDIT_CONTROL;
  public order = 2;

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

    const flyoutInstance = this.openFlyout(
      toMountPoint(
        <ControlGroupContainerContext.Provider value={controlGroup}>
          <EditControlFlyout
            embeddable={embeddable}
            removeControl={() => this.deleteControlAction.execute({ embeddable })}
            closeFlyout={() => {
              setFlyoutRef(undefined);
              flyoutInstance.close();
            }}
          />
        </ControlGroupContainerContext.Provider>,

        { theme$: this.theme$ }
      ),
      {
        'aria-label': ControlGroupStrings.manageControl.getFlyoutEditTitle(),
        outsideClickCloses: false,
        onClose: (flyout) => {
          setFlyoutRef(undefined);
          flyout.close();
        },
        ownFocus: true,
      }
    );
    setFlyoutRef(flyoutInstance);
  }
}
