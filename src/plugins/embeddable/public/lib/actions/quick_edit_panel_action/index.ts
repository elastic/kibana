/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { CoreStart } from 'src/core/public';
import { Action, IncompatibleActionError } from '../../../../../ui_actions/public';
import { IEmbeddable, ViewMode, EmbeddableStateTransfer } from '../..';
import { openQuickEditFlyout } from './open_quick_edit_flyout';

export const ACTION_QUICK_EDIT = 'quickEdit';

export interface QuickEditActionContext {
  embeddable: IEmbeddable;
}

export class QuickEditPanelAction implements Action<QuickEditActionContext> {
  public readonly type = ACTION_QUICK_EDIT;
  public readonly id = ACTION_QUICK_EDIT;
  public order = 999;

  constructor(
    private overlays: CoreStart['overlays'],
    private application: CoreStart['application'],
    private stateTransferService?: EmbeddableStateTransfer
  ) {}

  public getDisplayName({ embeddable }: QuickEditActionContext) {
    return i18n.translate('embeddableApi.panel.quickEdit.displayName', {
      defaultMessage: 'Quick edit',
    });
  }

  public getIconType({ embeddable }: QuickEditActionContext) {
    if (!embeddable.parent) {
      throw new IncompatibleActionError();
    }
    return 'documentEdit';
  }

  public async isCompatible({ embeddable }: QuickEditActionContext) {
    if (embeddable.getInput().viewMode) {
      if (embeddable.getInput().viewMode === ViewMode.VIEW) {
        return false;
      }
    }

    return Boolean(embeddable.parent && embeddable.getQuickEditControl);
  }

  public async execute({ embeddable }: QuickEditActionContext) {
    if (!embeddable.parent) {
      throw new IncompatibleActionError();
    }

    openQuickEditFlyout({
      embeddable,
      overlays: this.overlays,
      application: this.application,
      stateTransferService: this.stateTransferService,
    });
  }
}
