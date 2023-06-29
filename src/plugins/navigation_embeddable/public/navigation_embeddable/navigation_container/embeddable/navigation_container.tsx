/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ReactDOM from 'react-dom';
import { isEmpty } from 'lodash';
import React, { createContext, useContext } from 'react';
import { distinctUntilChanged, skip, Subject, Subscription } from 'rxjs';

import { Container, ContainerOutput } from '@kbn/embeddable-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import { ReduxEmbeddableTools, ReduxToolsPackage } from '@kbn/presentation-util-plugin/public';

import {
  LinkInput,
  LinkPanelState,
  NavigationContainerInput,
  NavigationContainerReduxState,
} from '../../types';
import { navigationEmbeddableReducers } from '../navigation_container_reducers';
import { coreServices, dashboardServices } from '../../services/kibana_services';
import { NavigationEmbeddableComponent } from '../components/navigation_embeddable_component';
import { linksService } from '../../services/links_service';
import { DashboardItem, DashboardLinkInput } from '../../dashboard_link/types';
import { DASHBOARD_LINK_EMBEDDABLE_TYPE } from '../../dashboard_link/embeddable/dashboard_link_embeddable_factory';
import { getNextPanelOrder } from '../navigation_container_helpers';
import { ExternalLinkInput } from '../../external_link/types';
import { EXTERNAL_LINK_EMBEDDABLE_TYPE } from '../../external_link/embeddable/external_link_embeddable_factory';

export const NAVIGATION_EMBEDDABLE_TYPE = 'navigation';

export const NavigationEmbeddableContext = createContext<NavigationContainer | null>(null);
export const useNavigationEmbeddable = (): NavigationContainer => {
  const navigation = useContext<NavigationContainer | null>(NavigationEmbeddableContext);
  if (navigation == null) {
    throw new Error('useNavigation must be used inside NavigationEmbeddableContext.');
  }
  return navigation!;
};

type NavigationReduxEmbeddableTools = ReduxEmbeddableTools<
  NavigationContainerReduxState,
  typeof navigationEmbeddableReducers
>;

// interface NavigationEmbeddableConfig {
//   editable: boolean;
// }

export class NavigationContainer extends Container<
  LinkInput,
  NavigationContainerInput,
  ContainerOutput
> {
  public readonly type = NAVIGATION_EMBEDDABLE_TYPE;

  private node?: HTMLElement;
  private subscriptions: Subscription = new Subscription();

  // public parentDashboardId?: string;

  private parentDashboardSubject = new Subject<string>();

  // state management
  public select: NavigationReduxEmbeddableTools['select'];
  public getState: NavigationReduxEmbeddableTools['getState'];
  public dispatch: NavigationReduxEmbeddableTools['dispatch'];
  public onStateChange: NavigationReduxEmbeddableTools['onStateChange'];

  private cleanupStateTools: () => void;

  constructor(
    reduxToolsPackage: ReduxToolsPackage,
    // config: NavigationEmbeddableConfig,
    initialInput: NavigationContainerInput,
    parent?: DashboardContainer
  ) {
    super(
      initialInput,
      {
        embeddableLoaded: {},
      },
      linksService.getLinkFactory,
      parent
    );

    /** Build redux embeddable tools */
    const reduxEmbeddableTools = reduxToolsPackage.createReduxEmbeddableTools<
      NavigationContainerReduxState,
      typeof navigationEmbeddableReducers
    >({
      embeddable: this,
      reducers: navigationEmbeddableReducers,
      initialComponentState: {
        currentDashboardId: parent?.getState().componentState.lastSavedId,
      },
    });

    this.select = reduxEmbeddableTools.select;
    this.getState = reduxEmbeddableTools.getState;
    this.dispatch = reduxEmbeddableTools.dispatch;
    this.cleanupStateTools = reduxEmbeddableTools.cleanup;
    this.onStateChange = reduxEmbeddableTools.onStateChange;
    console.log('INITIALIZE CONTAINER');
    this.initialize();
  }

  protected getInheritedInput(id: string): LinkInput {
    // console.log('get inherited input');
    // const { viewMode } = this.getInput();
    return { id };
  }

  private async initialize() {
    // currentDashboardId

    // this.parentDashboardId = (
    //   this.parent as DashboardContainer
    // ).getState().componentState.lastSavedId;
    this.setupSubscriptions();
    this.setInitializationFinished();
  }

  public addDashboardLink(input: DashboardLinkInput) {
    const panelState: LinkPanelState<DashboardLinkInput> = {
      type: DASHBOARD_LINK_EMBEDDABLE_TYPE,
      explicitInput: input,
      order: getNextPanelOrder(this.getInput().panels),
    };
    return this.createAndSaveEmbeddable(panelState.type, panelState);
  }

  public addExternalLink(input: ExternalLinkInput) {
    const panelState: LinkPanelState<ExternalLinkInput> = {
      type: EXTERNAL_LINK_EMBEDDABLE_TYPE,
      explicitInput: input,
      order: getNextPanelOrder(this.getInput().panels),
    };
    return this.createAndSaveEmbeddable(panelState.type, panelState);
  }

  // public getParentDashboardId(): string | undefined {
  //   const parentDashboardId = (this.parent as DashboardContainer).getState().componentState
  //     .lastSavedId;
  //   this.parentDashboardId = (this.parent as DashboardContainer).getState().componentState
  //   .lastSavedId;
  // }

  private setupSubscriptions() {
    // this.parent.
    // this.parentDashboardSubject.next()
    /**
     * If this embeddable is contained in a parent dashboard, it should refetch its parent's saved object info in response
     * to changes to its parent's id (which means the parent dashboard was cloned/"saved as"), title, and/or description
     **/
    //   if (this.parent) {
    //     this.subscriptions.add(
    //       this.parent
    //         .getInput$()
    //         .pipe(
    //           skip(1),
    //           distinctUntilChanged(
    //             (a, b) => a.id === b.id && a.title === b.title && a.description === b.description
    //           )
    //         )
    //         .subscribe(async (input) => {
    //           this.parentDashboardSubject.next();
    //         })
    //     );
    //   }
    // }
  }

  private async fetchCurrentDashboard(): Promise<DashboardItem> {
    const {
      componentState: { currentDashboardId },
    } = this.getState();

    if (!currentDashboardId) {
      throw new Error('failure'); // TODO: better error handling
    }

    const findDashboardsService = await dashboardServices.findDashboardsService();
    const response = (await findDashboardsService.findByIds([currentDashboardId]))[0];
    if (response.status === 'error') {
      throw new Error('failure'); // TODO: better error handling
    }
    return response;
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

    let currentDashboard: DashboardItem | undefined;
    let dashboardList: DashboardItem[] = responses.hits;

    /** When the parent dashboard has been saved (i.e. it has an ID) and there is no search string ... */
    const {
      componentState: { currentDashboardId },
    } = this.getState();
    if (currentDashboardId && isEmpty(search)) {
      /** ...force the current dashboard (if it is present in the original search results) to the top of the list */
      dashboardList = dashboardList.sort((dashboard) => {
        const isCurrentDashboard = dashboard.id === currentDashboardId;
        if (isCurrentDashboard) {
          currentDashboard = dashboard;
        }
        return isCurrentDashboard ? -1 : 1;
      });

      /**
       * If the current dashboard wasn't returned in the original search, perform another search to find it and
       * force it to the front of the list
       */
      if (!currentDashboard) {
        currentDashboard = await this.fetchCurrentDashboard();
        dashboardList.pop(); // the result should still be of `size,` so remove the dashboard at the end of the list
        dashboardList.unshift(currentDashboard); // in order to force the current dashboard to the start of the list
      }
    }

    /** Then, only return the parts of the dashboard object that we need */
    const simplifiedDashboardList = dashboardList.map((hit) => {
      return { id: hit.id, attributes: hit.attributes };
    });

    return simplifiedDashboardList;
  }

  // public getParentDashboard(): DashboardContainer {
  //   return this.parent as DashboardContainer;
  // }

  public async reload() {
    // await this.updateDashboardLinks();
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

    // console.log('render');

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
