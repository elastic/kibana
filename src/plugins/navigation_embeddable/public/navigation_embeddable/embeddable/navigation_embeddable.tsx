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
import { NavigationEmbeddableDashboardPicker } from '../components/navigation_embeddable_dashboard_picker';
import { dashboardServices, untilPluginStartServicesReady } from '../services/services';
import { SearchDashboardsResponse } from '@kbn/dashboard-plugin/public/services/dashboard_content_management/lib/find_dashboards';

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

  public async getDashboardList(
    search: string = '',
    size: number = 10
  ): Promise<SearchDashboardsResponse> {
    await untilPluginStartServicesReady();
    const findDashboardsService = await dashboardServices.findDashboardsService();
    const responses = await findDashboardsService.search({
      search,
      size,
    });
    return responses;
  }

  public reload() {}
}
