/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HasUniqueId, EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError, type Action } from '@kbn/ui-actions-plugin/public';

import { ACTION_DELETE_CONTROL } from '.';
import { coreServices } from '../services/kibana_services';

export class DeleteControlAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_DELETE_CONTROL;
  public readonly id = ACTION_DELETE_CONTROL;
  public order = 100; // should always be last

  constructor() {}

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    return (
      <EuiToolTip content={this.getDisplayName(context)}>
        <EuiButtonIcon
          data-test-subj={`control-action-${(context.embeddable as HasUniqueId).uuid}-delete`}
          aria-label={this.getDisplayName(context)}
          iconType={this.getIconType(context)}
          onClick={() => this.execute(context)}
          color="danger"
        />
      </EuiToolTip>
    );
  };

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    return i18n.translate('controls.controlGroup.floatingActions.removeTitle', {
      defaultMessage: 'Delete',
    });
  }

  public getIconType({ embeddable }: EmbeddableApiContext) {
    return 'trash';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    const { isCompatible } = await import('./delete_control_action_compatibility_check');
    return isCompatible(embeddable);
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    const { compatibilityCheck } = await import('./delete_control_action_compatibility_check');
    if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();

    coreServices.overlays
      .openConfirm(
        i18n.translate('controls.controlGroup.management.delete.sub', {
          defaultMessage: 'Controls are not recoverable once removed.',
        }),
        {
          confirmButtonText: i18n.translate('controls.controlGroup.management.delete.confirm', {
            defaultMessage: 'Delete',
          }),
          cancelButtonText: i18n.translate('controls.controlGroup.management.delete.cancel', {
            defaultMessage: 'Cancel',
          }),
          title: i18n.translate('controls.controlGroup.management.delete.deleteTitle', {
            defaultMessage: 'Delete control?',
          }),
          buttonColor: 'danger',
        }
      )
      .then((confirmed) => {
        if (confirmed) {
          embeddable.parentApi.removePanel(embeddable.uuid);
          embeddable?.clearVariables?.();
        }
      });
  }
}
