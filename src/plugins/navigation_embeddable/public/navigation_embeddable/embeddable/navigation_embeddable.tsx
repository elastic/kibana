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
import { DashboardAttributes } from '@kbn/dashboard-plugin/common/content_management';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import { ReduxEmbeddableTools, ReduxToolsPackage } from '@kbn/presentation-util-plugin/public';

import { navigationEmbeddableReducers } from '../navigation_embeddable_reducers';
import {
  DashboardItem,
  DashboardLink,
  isDashboardLink,
  NavigationEmbeddableInput,
  NavigationEmbeddableReduxState,
} from '../types';
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
  private currentDashboardId?: string;
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
      this.currentDashboardId = parentDashboardId;
      const currentDashboard = await this.fetchCurrentDashboard();
      this.dispatch.setCurrentDashboard(currentDashboard);
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
        .pipe(distinctUntilChanged((a, b) => isEqual(a.links, b.links)))
        .subscribe(async () => {
          await this.updateDashboardLinks();
        })
    );
  }

  private async updateDashboardLinks() {
    const { links } = this.getInput();

    if (links) {
      this.dispatch.setLoading(true);

      // Get all of the dashboard IDs that are referenced so we can fetch their saved objects
      const uniqueDashboardIds = new Set<string>();
      Object.keys(links).forEach((linkId) => {
        const link = links[linkId];
        if (isDashboardLink(link)) {
          uniqueDashboardIds.add(link.id);
        }
      });

      // Fetch the dashboard saved objects from their IDs and store the attributes
      const dashboardAttributes: { [dashboardId: string]: DashboardAttributes } = {};
      if (!isEmpty(uniqueDashboardIds)) {
        const findDashboardsService = await dashboardServices.findDashboardsService();
        const responses = await findDashboardsService.findByIds(Array.from(uniqueDashboardIds));
        responses.forEach((response) => {
          if (response.status === 'error') {
            throw new Error('failure'); // TODO: better error handling
          }
          dashboardAttributes[response.id] = response.attributes;
        });
      }

      // Convert the explicit input `links` object to a sorted array for component state
      const sortedLinks = Object.keys(links)
        .sort(function (a, b) {
          return links[a].order - links[b].order;
        })
        .map((linkId) => {
          const link = links[linkId];
          if (isDashboardLink(link)) {
            const dashboardId = link.id;
            return {
              id: dashboardId,
              label: link.label,
              order: link.order,
              title: dashboardAttributes[dashboardId].title,
              description: dashboardAttributes[dashboardId].description,
            };
          }
          return link;
        });

      // Update component state to keep in sync with changes to explicit input
      batch(() => {
        this.dispatch.setLinks(sortedLinks);
        this.dispatch.setLoading(false);
      });
    } else {
      this.dispatch.setLinks([]);
    }
  }

  private async fetchCurrentDashboard(): Promise<DashboardItem | undefined> {
    if (this.currentDashboardId) {
      const findDashboardsService = await dashboardServices.findDashboardsService();
      const response = (await findDashboardsService.findByIds([this.currentDashboardId]))[0];
      if (response.status === 'error') {
        throw new Error('failure'); // TODO: better error handling
      }
      return response;
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
      options: { onlyTitle: true },
    });

    let currentDashboard: DashboardLink | undefined;
    const dashboardList = responses.hits
      /** filter out the current dashboard because it will be re-added in the component */
      .filter((hit) => {
        const isCurrentDashboard = hit.id === this.currentDashboardId;
        if (isCurrentDashboard) {
          currentDashboard = hit;
        }
        return !isCurrentDashboard;
      })
      /** then, only return the parts of the dashboard object that we need */
      .map((hit) => {
        return { id: hit.id, attributes: hit.attributes };
      });

    if (!currentDashboard) {
      currentDashboard = await this.fetchCurrentDashboard();
    }

    batch(() => {
      this.dispatch.setDashboardList(dashboardList);
      this.dispatch.setDashboardCount(responses.total); // TODO: Remove this if we don't actually need it
      this.dispatch.setCurrentDashboard(currentDashboard);
    });

    return dashboardList;
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
