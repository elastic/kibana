/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type IEmbeddable, ViewMode } from '@kbn/embeddable-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { openReplacePanelFlyout } from './open_replace_panel_flyout';
import { dashboardReplacePanelActionStrings } from './_dashboard_actions_strings';
import { type DashboardContainer, DASHBOARD_CONTAINER_TYPE } from '../dashboard_container';

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

  constructor(private savedobjectfinder: React.ComponentType<any>) {}

  public getDisplayName({ embeddable }: ReplacePanelActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return dashboardReplacePanelActionStrings.getDisplayName();
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
      savedObjectFinder: this.savedobjectfinder,
      panelToRemove: view,
    });
  }
}
