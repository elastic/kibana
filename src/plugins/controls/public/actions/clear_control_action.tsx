/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { SyntheticEvent } from 'react';

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EmbeddableApiContext, HasUniqueId } from '@kbn/presentation-publishing';
import { IncompatibleActionError, type Action } from '@kbn/ui-actions-plugin/public';

import { ACTION_CLEAR_CONTROL } from '.';

export class ClearControlAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_CLEAR_CONTROL;
  public readonly id = ACTION_CLEAR_CONTROL;
  public order = 1;

  constructor() {}

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    return (
      <EuiToolTip content={this.getDisplayName(context)}>
        <EuiButtonIcon
          data-test-subj={`control-action-${(context.embeddable as HasUniqueId).uuid}-erase`}
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

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    return i18n.translate('controls.controlGroup.floatingActions.clearTitle', {
      defaultMessage: 'Clear',
    });
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    return 'eraser';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    const { isCompatible } = await import('./clear_control_action_compatibility_check');
    return isCompatible(embeddable);
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    const { compatibilityCheck } = await import('./clear_control_action_compatibility_check');
    if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();

    embeddable.clearSelections();
  }
}
