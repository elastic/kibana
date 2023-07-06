/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ReactDOM from 'react-dom';
import React, { createContext, useContext } from 'react';
import { Subscription } from 'rxjs';

import { OverlayRef } from '@kbn/core-mount-utils-browser';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { Embeddable, EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import { ReduxEmbeddableTools, ReduxToolsPackage } from '@kbn/presentation-util-plugin/public';

import { NavigationEmbeddableInput, NavigationEmbeddableReduxState } from './types';
import { coreServices } from '../services/kibana_services';
import { navigationEmbeddableReducers } from './navigation_embeddable_reducers';
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

export class NavigationEmbeddable extends Embeddable<NavigationEmbeddableInput, EmbeddableOutput> {
  public readonly type = NAVIGATION_EMBEDDABLE_TYPE;

  private node?: HTMLElement;
  private subscriptions: Subscription = new Subscription();

  // state management
  public select: NavigationReduxEmbeddableTools['select'];
  public getState: NavigationReduxEmbeddableTools['getState'];
  public dispatch: NavigationReduxEmbeddableTools['dispatch'];
  public onStateChange: NavigationReduxEmbeddableTools['onStateChange'];

  private cleanupStateTools: () => void;

  private editorFlyout?: OverlayRef;

  constructor(
    reduxToolsPackage: ReduxToolsPackage,
    // config: NavigationEmbeddableConfig,
    initialInput: NavigationEmbeddableInput,
    parent?: DashboardContainer
  ) {
    super(
      initialInput,
      {
        editable: true,
        editableWithExplicitInput: true,
      },
      parent
    );

    /** Build redux embeddable tools */
    const reduxEmbeddableTools = reduxToolsPackage.createReduxEmbeddableTools<
      NavigationEmbeddableReduxState,
      typeof navigationEmbeddableReducers
    >({
      embeddable: this,
      reducers: navigationEmbeddableReducers,
      initialComponentState: {},
    });

    this.select = reduxEmbeddableTools.select;
    this.getState = reduxEmbeddableTools.getState;
    this.dispatch = reduxEmbeddableTools.dispatch;
    this.cleanupStateTools = reduxEmbeddableTools.cleanup;
    this.onStateChange = reduxEmbeddableTools.onStateChange;
    this.initialize();
  }

  private async initialize() {
    this.setupSubscriptions();
    this.setInitializationFinished();
  }

  private setupSubscriptions() {
    /**
     * If this embeddable is contained in a parent dashboard, it should refetch its parent's saved object info in response
     * to changes to its parent's id (which means the parent dashboard was cloned/"saved as"), title, and/or description. This
     * is so that the dashboard list can be populated with the updated information, including updating the "Current" badge
     **/
    // if (this.parent) {
    //   this.subscriptions.add(
    //     this.parent
    //       .getInput$()
    //       .pipe(
    //         skip(1),
    //         distinctUntilChanged(
    //           (a, b) => a.id === b.id && a.title === b.title && a.description === b.description
    //         )
    //       )
    //       .subscribe(async () => {
    //         this.dispatch.setCurrentDashboardId(
    //           (this.parent as DashboardContainer).getState().componentState.lastSavedId
    //         );
    //       })
    //   );
    // }
  }

  private closeEditorFlyout() {
    if (this.editorFlyout) {
      this.editorFlyout.close();
      this.editorFlyout = undefined;
    }
  }

  public async reload() {}

  public destroy() {
    super.destroy();
    this.closeEditorFlyout();
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
