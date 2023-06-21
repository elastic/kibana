/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { Embeddable } from '@kbn/embeddable-plugin/public';
import type { EmbeddableInput, IContainer } from '@kbn/embeddable-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { DashboardList } from '../types';
import { dashboardServices, untilPluginStartServicesReady } from '../services/services';
import { NavigationEmbeddableDashboardPicker } from '../components/navigation_embeddable_dashboard_picker';

export const NAVIGATION_EMBEDDABLE_TYPE = 'navigation';

export class NavigationEmbeddable extends Embeddable {
  public readonly type = NAVIGATION_EMBEDDABLE_TYPE;

  private node?: HTMLElement;

  constructor(initialInput: EmbeddableInput, parent?: IContainer) {
    super(initialInput, {}, parent);
  }

  public render(node: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;

    ReactDOM.render(<NavigationEmbeddableDashboardPicker embeddable={this} />, node);
  }

  public async getDashboardList(search: string = '', size: number = 10): Promise<DashboardList> {
    await untilPluginStartServicesReady();
    const findDashboardsService = await dashboardServices.findDashboardsService();
    const responses = await findDashboardsService.search({
      search,
      size,
    });

    const parentDashboardId = (this.parent as DashboardContainer | undefined)?.getState()
      .componentState.lastSavedId;

    let currentDashboard: DashboardList['currentDashboard'];
    const otherDashboards: DashboardList['otherDashboards'] = [];
    responses.hits.forEach((hit) => {
      if (hit.id === parentDashboardId) {
        currentDashboard = hit;
      } else {
        otherDashboards.push(hit);
      }
    });

    return {
      otherDashboards,
      currentDashboard,
      total: responses.total,
    };
  }

  public reload() {}
}
