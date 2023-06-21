/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Action, IncompatibleActionError } from '../../../ui_actions';
import { ViewMode } from '../../../types';
import { IEmbeddable } from '../../../embeddables';

export const REMOVE_PANEL_ACTION = 'deletePanel';

interface ActionContext {
  embeddable: IEmbeddable;
}
export class RemovePanelAction implements Action<ActionContext> {
  public readonly type = REMOVE_PANEL_ACTION;
  public readonly id = REMOVE_PANEL_ACTION;
  public order = 1;

  constructor() {}

  public getDisplayName() {
    return i18n.translate('embeddableApi.panel.removePanel.displayName', {
      defaultMessage: 'Delete from dashboard',
    });
  }

  public getIconType() {
    return 'trash';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    const isPanelExpanded =
      // TODO - we need a common embeddable extension pattern to allow actions to call methods on generic embeddables
      // Casting to a type that has the method will do for now.
      (
        embeddable.parent as unknown as { getExpandedPanelId: () => string | undefined }
      )?.getExpandedPanelId?.() === embeddable.id;

    return Boolean(
      embeddable.parent && embeddable.getInput().viewMode === ViewMode.EDIT && !isPanelExpanded
    );
  }

  public async execute({ embeddable }: ActionContext) {
    if (!embeddable.parent || !(await this.isCompatible({ embeddable }))) {
      throw new IncompatibleActionError();
    }
    embeddable.parent.removeEmbeddable(embeddable.id);
  }
}
