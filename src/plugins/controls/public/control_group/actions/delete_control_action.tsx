/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { ViewMode, isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { ACTION_DELETE_CONTROL } from '.';
import { pluginServices } from '../../services';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlEmbeddable, DataControlInput } from '../../types';
import { isControlGroup } from '../embeddable/control_group_helpers';

export interface DeleteControlActionContext {
  embeddable: ControlEmbeddable<DataControlInput>;
}

export class DeleteControlAction implements Action<DeleteControlActionContext> {
  public readonly type = ACTION_DELETE_CONTROL;
  public readonly id = ACTION_DELETE_CONTROL;
  public order = 100; // should always be last

  private openConfirm;

  constructor() {
    ({
      overlays: { openConfirm: this.openConfirm },
    } = pluginServices.getServices());
  }

  public readonly MenuItem = ({ context }: { context: DeleteControlActionContext }) => {
    return (
      <EuiToolTip content={this.getDisplayName(context)}>
        <EuiButtonIcon
          data-test-subj={`control-action-${context.embeddable.id}-delete`}
          aria-label={this.getDisplayName(context)}
          iconType={this.getIconType(context)}
          onClick={() => this.execute(context)}
          color="danger"
        />
      </EuiToolTip>
    );
  };

  public getDisplayName({ embeddable }: DeleteControlActionContext) {
    if (!embeddable.parent || !isControlGroup(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return ControlGroupStrings.floatingActions.getRemoveButtonTitle();
  }

  public getIconType({ embeddable }: DeleteControlActionContext) {
    if (!embeddable.parent || !isControlGroup(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return 'trash';
  }

  public async isCompatible({ embeddable }: DeleteControlActionContext) {
    if (isErrorEmbeddable(embeddable)) return false;
    const controlGroup = embeddable.parent;
    return Boolean(
      controlGroup &&
        isControlGroup(controlGroup) &&
        controlGroup.getInput().viewMode === ViewMode.EDIT
    );
  }

  public async execute({ embeddable }: DeleteControlActionContext) {
    if (!embeddable.parent || !isControlGroup(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    this.openConfirm(ControlGroupStrings.management.deleteControls.getSubtitle(), {
      confirmButtonText: ControlGroupStrings.management.deleteControls.getConfirm(),
      cancelButtonText: ControlGroupStrings.management.deleteControls.getCancel(),
      title: ControlGroupStrings.management.deleteControls.getDeleteTitle(),
      buttonColor: 'danger',
    }).then((confirmed) => {
      if (confirmed) {
        embeddable.parent?.removeEmbeddable(embeddable.id);
      }
    });
  }
}
