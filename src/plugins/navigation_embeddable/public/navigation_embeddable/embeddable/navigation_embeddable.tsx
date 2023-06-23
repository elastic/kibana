/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ReactDOM from 'react-dom';
import { batch } from 'react-redux';
import { isEmpty, isEqual } from 'lodash';
import React, { createContext, useContext } from 'react';
import { distinctUntilChanged, Subscription } from 'rxjs';

import { Embeddable } from '@kbn/embeddable-plugin/public';
import type { IContainer } from '@kbn/embeddable-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { DashboardItem } from '@kbn/dashboard-plugin/common/content_management';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import { ReduxEmbeddableTools, ReduxToolsPackage } from '@kbn/presentation-util-plugin/public';

import { navigationEmbeddableReducers } from '../navigation_embeddable_reducers';
import { NavigationEmbeddableInput, NavigationEmbeddableReduxState } from '../types';
import { coreServices, dashboardServices } from '../services/navigation_embeddable_services';
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

interface NavigationEmbeddableConfig {
  editable: boolean;
}

export class NavigationEmbeddable extends Embeddable<NavigationEmbeddableInput> {
  public readonly type = NAVIGATION_EMBEDDABLE_TYPE;

  private node?: HTMLElement;
  private subscriptions: Subscription = new Subscription();

  // state management
  public select: NavigationReduxEmbeddableTools['select'];
  public getState: NavigationReduxEmbeddableTools['getState'];
  public dispatch: NavigationReduxEmbeddableTools['dispatch'];
  public onStateChange: NavigationReduxEmbeddableTools['onStateChange'];

  private cleanupStateTools: () => void;

  constructor(
    reduxToolsPackage: ReduxToolsPackage,
    config: NavigationEmbeddableConfig,
    initialInput: NavigationEmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, { editable: config.editable }, parent);

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

    this.initialize();
  }

  private async initialize() {
    const parentDashboardId = (this.parent as DashboardContainer | undefined)?.getState()
      .componentState.lastSavedId;
    if (parentDashboardId) {
      this.dispatch.setCurrentDashboardId(parentDashboardId);
    }
    await this.updateDashboardLinks();

    this.setupSubscriptions();
    this.setInitializationFinished();
  }

  private setupSubscriptions() {
    /**
     * when input dashboard links changes, update component state to match
     **/
    this.subscriptions.add(
      this.getInput$()
        .pipe(distinctUntilChanged((a, b) => isEqual(a.dashboardLinks, b.dashboardLinks)))
        .subscribe(async () => {
          await this.updateDashboardLinks();
        })
    );
  }

  private async updateDashboardLinks() {
    const { dashboardLinks } = this.getInput();

    if (dashboardLinks && !isEmpty(dashboardLinks)) {
      this.dispatch.setLoading(true);
      const findDashboardsService = await dashboardServices.findDashboardsService();
      const responses = await findDashboardsService.findByIds(
        dashboardLinks.map((link) => link.id)
      );
      const updatedDashboardLinks = responses.map((response, i) => {
        if (response.status === 'error') {
          throw new Error('failure');
        }
        return {
          id: response.id,
          label: dashboardLinks[i].label,
          title: response.attributes.title,
          description: response.attributes.description,
        };
      });
      batch(() => {
        this.dispatch.setDashboardLinks(updatedDashboardLinks);
        this.dispatch.setLoading(false);
      });
    } else {
      this.dispatch.setDashboardLinks([]);
    }
  }

  public async fetchDashboardList(
    search: string = '',
    size: number = 10
  ): Promise<DashboardItem[]> {
    const findDashboardsService = await dashboardServices.findDashboardsService();
    const responses = await findDashboardsService.search({
      search,
      size,
    });

    const { currentDashboardId } = this.getState().componentState;
    const sortedDashboards = responses.hits.sort((hit) => {
      return hit.id === currentDashboardId ? -1 : 1; // force the current dashboard to the top of the list - we might not actually want this ¯\_(ツ)_/¯
    });

    batch(() => {
      this.dispatch.setDashboardList(sortedDashboards);
      this.dispatch.setDashboardCount(responses.total);
    });

    return responses.hits;
  }

  public async reload() {
    await this.updateDashboardLinks();
  }

  public destroy() {
    super.destroy();
    this.cleanupStateTools();
    this.subscriptions.unsubscribe();
    if (this.node) ReactDOM.unmountComponentAtNode(this.node);
  }

  public render(node: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;

    ReactDOM.render(
      <KibanaThemeProvider theme$={coreServices.theme.theme$}>
        <NavigationEmbeddableContext.Provider value={this}>
          <NavigationEmbeddableComponent />
        </NavigationEmbeddableContext.Provider>
      </KibanaThemeProvider>,
      node
    );
  }
}
