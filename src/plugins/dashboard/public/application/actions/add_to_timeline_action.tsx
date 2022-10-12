/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  CellValueContext,
  IEmbeddable,
  isErrorEmbeddable,
  isFilterableEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { DASHBOARD_CONTAINER_TYPE } from '../..';
import { pluginServices } from '../../services/plugin_services';
import type { DashboardContainer } from '../embeddable';

export const ACTION_ADD_TO_TIMELINE = 'addToTimeline';

function isDashboard(embeddable: IEmbeddable): embeddable is DashboardContainer {
  return embeddable.type === DASHBOARD_CONTAINER_TYPE;
}

export type AddToTimelineActionContext = CellValueContext;

export class AddToTimelineAction implements Action<AddToTimelineActionContext> {
  public readonly type = ACTION_ADD_TO_TIMELINE;
  public readonly id = ACTION_ADD_TO_TIMELINE;
  public order = 1;

  private icon = 'timeline';
  private applicationService;

  constructor() {
    ({ application: this.applicationService } = pluginServices.getServices());
  }

  public getDisplayName({ embeddable }: AddToTimelineActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return i18n.translate('dashboard.actions.toggleExpandPanelMenuItem.expandedDisplayName', {
      defaultMessage: 'Add To Timeline',
    });
  }

  public getIconType({ embeddable }: AddToTimelineActionContext) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new IncompatibleActionError();
    }
    return this.icon;
  }

  public async isCompatible({ embeddable }: AddToTimelineActionContext) {
    if (
      !embeddable.parent ||
      !isDashboard(embeddable.parent) ||
      !isFilterableEmbeddable(embeddable) ||
      isErrorEmbeddable(embeddable)
    ) {
      return false;
    }
    return true;
    // const currentAppId = await this.applicationService.currentAppId$.toPromise();
    // return currentAppId === 'securitySolutionUI';
  }

  public async execute({ embeddable, data }: AddToTimelineActionContext) {
    if (
      !embeddable.parent ||
      !isDashboard(embeddable.parent) ||
      !isFilterableEmbeddable(embeddable) ||
      isErrorEmbeddable(embeddable)
    ) {
      throw new IncompatibleActionError();
    }
    // const filters = await embeddable.getFilters();
    // console.log(filters);
    console.log('Dashboards addToTimeline exec', { data });
    // const newValue = isExpanded(embeddable) ? undefined : embeddable.id;
    // embeddable.parent.updateInput({
    //   expandedPanelId: newValue,
    // });
  }
}
