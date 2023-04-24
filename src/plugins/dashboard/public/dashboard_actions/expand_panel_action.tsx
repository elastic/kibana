/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { DASHBOARD_CONTAINER_TYPE, type DashboardContainer } from '../dashboard_container';
import { dashboardExpandPanelActionStrings } from './_dashboard_actions_strings';

export const ACTION_EXPAND_PANEL = 'togglePanel';

function isDashboard(embeddable: IEmbeddable): embeddable is DashboardContainer {
  return embeddable.type === DASHBOARD_CONTAINER_TYPE;
}

function isExpanded(embeddable: IEmbeddable) {
  if (!embeddable.parent || !isDashboard(embeddable.parent)) {
    throw new IncompatibleActionError();
  }

  return embeddable.id === (embeddable.parent as DashboardContainer).getExpandedPanelId();
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
      ? dashboardExpandPanelActionStrings.getMinimizeTitle()
      : dashboardExpandPanelActionStrings.getMaximizeTitle();
  }

  public getIconType({ embeddable }: ExpandPanelActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return isExpanded(embeddable) ? 'minimize' : 'expand';
  }

  public async isCompatible({ embeddable }: ExpandPanelActionContext) {
    return Boolean(embeddable.parent && isDashboard(embeddable.parent));
  }

  public async execute({ embeddable }: ExpandPanelActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    const newValue = isExpanded(embeddable) ? undefined : embeddable.id;
    (embeddable.parent as DashboardContainer).setExpandedPanelId(newValue);

    if (!newValue) {
      (embeddable.parent as DashboardContainer).setScrollToPanelId(embeddable.id);
    }
  }
}
