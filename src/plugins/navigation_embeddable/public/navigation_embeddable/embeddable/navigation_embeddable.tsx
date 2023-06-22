/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext } from 'react';
import ReactDOM from 'react-dom';

import { Embeddable } from '@kbn/embeddable-plugin/public';
import type { IContainer } from '@kbn/embeddable-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { ReduxEmbeddableTools, ReduxToolsPackage } from '@kbn/presentation-util-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { DashboardList, NavigationEmbeddableInput, NavigationEmbeddableReduxState } from '../types';
import {
  coreServices,
  dashboardServices,
  untilPluginStartServicesReady,
} from '../services/services';
import { navigationEmbeddableReducers } from '../navigation_embeddable_reducers';
import { NavigationEmbeddableComponent } from '../components/navigation_embeddable_component';

export const NAVIGATION_EMBEDDABLE_TYPE = 'navigation';

export const NavigationEmbeddableContext = createContext<NavigationEmbeddable | null>(null);
export const useNavigationEmbeddable = (): NavigationEmbeddable => {
  const navigation = useContext<NavigationEmbeddable | null>(NavigationEmbeddableContext);
  if (navigation == null) {
    throw new Error('useNavigation must be used inside NavigationEmbeddableContext.');
  }
  return navigation!;
};

type NavigationReduxEmbeddableTools = ReduxEmbeddableTools<
  NavigationEmbeddableReduxState,
  typeof navigationEmbeddableReducers
>;

export class NavigationEmbeddable extends Embeddable<NavigationEmbeddableInput> {
  public readonly type = NAVIGATION_EMBEDDABLE_TYPE;

  private node?: HTMLElement;

  // state management
  public select: NavigationReduxEmbeddableTools['select'];
  public getState: NavigationReduxEmbeddableTools['getState'];
  public dispatch: NavigationReduxEmbeddableTools['dispatch'];
  public onStateChange: NavigationReduxEmbeddableTools['onStateChange'];

  private cleanupStateTools: () => void;

  constructor(
    reduxToolsPackage: ReduxToolsPackage,
    initialInput: NavigationEmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, {}, parent);

    // build redux embeddable tools
    const reduxEmbeddableTools = reduxToolsPackage.createReduxEmbeddableTools<
      NavigationEmbeddableReduxState,
      typeof navigationEmbeddableReducers
    >({
      embeddable: this,
      reducers: navigationEmbeddableReducers,
      initialComponentState: {}, // getDefaultComponentState
    });

    this.select = reduxEmbeddableTools.select;
    this.getState = reduxEmbeddableTools.getState;
    this.dispatch = reduxEmbeddableTools.dispatch;
    this.cleanupStateTools = reduxEmbeddableTools.cleanup;
    this.onStateChange = reduxEmbeddableTools.onStateChange;
  }

  public destroy() {
    super.destroy();
    this.cleanupStateTools();
    if (this.node) ReactDOM.unmountComponentAtNode(this.node);
  }

  public render(node: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;

    untilPluginStartServicesReady().then(() =>
      ReactDOM.render(
        <KibanaThemeProvider theme$={coreServices.theme.theme$}>
          <NavigationEmbeddableContext.Provider value={this}>
            <NavigationEmbeddableComponent />
          </NavigationEmbeddableContext.Provider>
        </KibanaThemeProvider>,
        node
      )
    );
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
