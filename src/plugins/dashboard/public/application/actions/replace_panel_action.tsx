/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
import { IEmbeddable, ViewMode, EmbeddableStart } from '../../services/embeddable';
import { DASHBOARD_CONTAINER_TYPE, DashboardContainer } from '../embeddable';
import { Action, IncompatibleActionError } from '../../services/ui_actions';
import { openReplacePanelFlyout } from './open_replace_panel_flyout';
import { dashboardReplacePanelAction } from '../../dashboard_strings';

export const ACTION_REPLACE_PANEL = 'replacePanel';

function isDashboard(embeddable: IEmbeddable): embeddable is DashboardContainer {
  return embeddable.type === DASHBOARD_CONTAINER_TYPE;
}

export interface ReplacePanelActionContext {
  embeddable: IEmbeddable;
}

export class ReplacePanelAction implements Action<ReplacePanelActionContext> {
  public readonly type = ACTION_REPLACE_PANEL;
  public readonly id = ACTION_REPLACE_PANEL;
  public order = 3;

  constructor(
    private core: CoreStart,
    private savedobjectfinder: React.ComponentType<any>,
    private notifications: CoreStart['notifications'],
    private getEmbeddableFactories: EmbeddableStart['getEmbeddableFactories']
  ) {}

  public getDisplayName({ embeddable }: ReplacePanelActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return dashboardReplacePanelAction.getDisplayName();
  }

  public getIconType({ embeddable }: ReplacePanelActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return 'kqlOperand';
  }

  public async isCompatible({ embeddable }: ReplacePanelActionContext) {
    if (embeddable.getInput().viewMode) {
      if (embeddable.getInput().viewMode === ViewMode.VIEW) {
        return false;
      }
    }

    return Boolean(embeddable.parent && isDashboard(embeddable.parent));
  }

  public async execute({ embeddable }: ReplacePanelActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }

    const view = embeddable;
    const dash = embeddable.parent;
    openReplacePanelFlyout({
      embeddable: dash,
      core: this.core,
      savedObjectFinder: this.savedobjectfinder,
      notifications: this.notifications,
      panelToRemove: view,
      getEmbeddableFactories: this.getEmbeddableFactories,
    });
  }
}
