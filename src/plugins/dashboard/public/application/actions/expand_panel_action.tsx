/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardContainerInput } from '../..';
import { IEmbeddable } from '../../services/embeddable';
import { dashboardExpandPanelAction } from '../../dashboard_strings';
import { Action, IncompatibleActionError } from '../../services/ui_actions';
import { DASHBOARD_CONTAINER_TYPE, DashboardContainer } from '../embeddable';

export const ACTION_EXPAND_PANEL = 'togglePanel';

function isDashboard(embeddable: IEmbeddable): embeddable is DashboardContainer {
  return embeddable.type === DASHBOARD_CONTAINER_TYPE;
}

function isExpanded(embeddable: IEmbeddable) {
  if (!embeddable.parent || !isDashboard(embeddable.parent)) {
    throw new IncompatibleActionError();
  }

  return (
    embeddable.id === (embeddable.parent.getInput() as DashboardContainerInput).expandedPanelId
  );
}

export interface ExpandPanelActionContext {
  embeddable: IEmbeddable;
}

export class ExpandPanelAction implements Action<ExpandPanelActionContext> {
  public readonly type = ACTION_EXPAND_PANEL;
  public readonly id = ACTION_EXPAND_PANEL;
  public order = 7;

  constructor() {}

  public getDisplayName({ embeddable }: ExpandPanelActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }

    return isExpanded(embeddable)
      ? dashboardExpandPanelAction.getMinimizeTitle()
      : dashboardExpandPanelAction.getMaximizeTitle();
  }

  public getIconType({ embeddable }: ExpandPanelActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    // TODO: use 'minimize' when an eui-icon of such is available.
    return isExpanded(embeddable) ? 'expand' : 'expand';
  }

  public async isCompatible({ embeddable }: ExpandPanelActionContext) {
    return Boolean(embeddable.parent && isDashboard(embeddable.parent));
  }

  public async execute({ embeddable }: ExpandPanelActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    const newValue = isExpanded(embeddable) ? undefined : embeddable.id;
    embeddable.parent.updateInput({
      expandedPanelId: newValue,
    });
  }
}
