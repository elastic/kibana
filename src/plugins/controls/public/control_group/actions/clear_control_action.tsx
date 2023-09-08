/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { SyntheticEvent } from 'react';

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { ACTION_CLEAR_CONTROL } from '.';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlEmbeddable, DataControlInput, isClearableControl } from '../../types';
import { isControlGroup } from '../embeddable/control_group_helpers';

export interface ClearControlActionContext {
  embeddable: ControlEmbeddable<DataControlInput>;
}

export class ClearControlAction implements Action<ClearControlActionContext> {
  public readonly type = ACTION_CLEAR_CONTROL;
  public readonly id = ACTION_CLEAR_CONTROL;
  public order = 1;

  constructor() {}

  public readonly MenuItem = ({ context }: { context: ClearControlActionContext }) => {
    return (
      <EuiToolTip content={this.getDisplayName(context)}>
        <EuiButtonIcon
          data-test-subj={`control-action-${context.embeddable.id}-erase`}
          aria-label={this.getDisplayName(context)}
          iconType={this.getIconType(context)}
          onClick={(event: SyntheticEvent<HTMLButtonElement>) => {
            (event.target as HTMLButtonElement).blur();
            this.execute(context);
          }}
          color="text"
        />
      </EuiToolTip>
    );
  };

  public getDisplayName({ embeddable }: ClearControlActionContext) {
    if (!embeddable.parent || !isControlGroup(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return ControlGroupStrings.floatingActions.getClearButtonTitle();
  }

  public getIconType({ embeddable }: ClearControlActionContext) {
    if (!embeddable.parent || !isControlGroup(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return 'eraser';
  }

  public async isCompatible({ embeddable }: ClearControlActionContext) {
    if (isErrorEmbeddable(embeddable)) return false;
    const controlGroup = embeddable.parent;
    return Boolean(controlGroup && isControlGroup(controlGroup)) && isClearableControl(embeddable);
  }

  public async execute({ embeddable }: ClearControlActionContext) {
    if (
      !embeddable.parent ||
      !isControlGroup(embeddable.parent) ||
      !isClearableControl(embeddable)
    ) {
      throw new IncompatibleActionError();
    }
    embeddable.clearSelections();
  }
}
