/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext } from 'react';
import { isEmpty } from 'lodash';

import { Embeddable } from '@kbn/embeddable-plugin/public';
import { ReduxEmbeddableTools, ReduxToolsPackage } from '@kbn/presentation-util-plugin/public';

import { DashboardItem, DashboardLinkInput, DashboardLinkReduxState } from '../types';
import { coreServices, dashboardServices } from '../../services/kibana_services';
import { DASHBOARD_LINK_EMBEDDABLE_TYPE } from './dashboard_link_embeddable_factory';
import { NavigationContainer } from '../../navigation_container/embeddable/navigation_container';
import { dashboardLinkReducers } from '../dashboard_link_reducers';
import ReactDOM from 'react-dom';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { DashboardLinkEditor } from '../components/dashboard_link_editor';
import { EuiButtonEmpty } from '@elastic/eui';
import { DashboardLinkComponent } from '../components/dashboard_link_component';

export const DashboardLinkContext = createContext<DashboardLinkEmbeddable | null>(null);
export const useDashboardLinkEmbeddable = (): DashboardLinkEmbeddable => {
  const linkEmbeddable = useContext<DashboardLinkEmbeddable | null>(DashboardLinkContext);
  if (linkEmbeddable == null) {
    throw new Error('useDashboardLinkEmbeddable must be used inside DashboardLinkContext.');
  }
  return linkEmbeddable!;
};

type DashboardLinkReduxEmbeddableTools = ReduxEmbeddableTools<
  DashboardLinkReduxState,
  typeof dashboardLinkReducers
>;

export class DashboardLinkEmbeddable extends Embeddable<DashboardLinkInput> {
  public readonly type = DASHBOARD_LINK_EMBEDDABLE_TYPE;

  private node?: HTMLElement;

  private currentDashboardId?: string;

  // state management
  public select: DashboardLinkReduxEmbeddableTools['select'];
  public getState: DashboardLinkReduxEmbeddableTools['getState'];
  public dispatch: DashboardLinkReduxEmbeddableTools['dispatch'];
  public onStateChange: DashboardLinkReduxEmbeddableTools['onStateChange'];

  private cleanupStateTools: () => void;

  constructor(
    reduxToolsPackage: ReduxToolsPackage,
    initialInput: DashboardLinkInput,
    parent: NavigationContainer
  ) {
    super(initialInput, {}, parent);

    /** Build redux embeddable tools */
    const reduxEmbeddableTools = reduxToolsPackage.createReduxEmbeddableTools<
      DashboardLinkReduxState,
      typeof dashboardLinkReducers
    >({
      embeddable: this,
      reducers: dashboardLinkReducers,
      initialComponentState: {}, // getDefaultComponentState
    });

    this.select = reduxEmbeddableTools.select;
    this.getState = reduxEmbeddableTools.getState;
    this.dispatch = reduxEmbeddableTools.dispatch;
    this.cleanupStateTools = reduxEmbeddableTools.cleanup;
    this.onStateChange = reduxEmbeddableTools.onStateChange;

    this.currentDashboardId = parent.getParentDashboardId();
    if (this.currentDashboardId) this.dispatch.setCurrentDashboardId(this.currentDashboardId);
  }

  public async fetchDashboard(): Promise<DashboardItem> {
    const dashboardId = this.input.dashboardId;
    const findDashboardsService = await dashboardServices.findDashboardsService();
    const response = (await findDashboardsService.findByIds([dashboardId]))[0];
    if (response.status === 'error') {
      throw new Error('failure'); // TODO: better error handling
    }
    return response;
  }

  public render(node: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;

    ReactDOM.render(
      <KibanaThemeProvider theme$={coreServices.theme.theme$}>
        <DashboardLinkContext.Provider value={this}>
          <DashboardLinkComponent />
        </DashboardLinkContext.Provider>
      </KibanaThemeProvider>,
      node
    );
  }

  public destroy() {
    super.destroy();
    this.cleanupStateTools();
    // this.subscriptions.unsubscribe();
    if (this.node) ReactDOM.unmountComponentAtNode(this.node);
  }

  public reload() {}
}
