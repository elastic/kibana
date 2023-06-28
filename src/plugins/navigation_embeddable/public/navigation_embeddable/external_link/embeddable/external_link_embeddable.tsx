/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ReactDOM from 'react-dom';
import React, { createContext, useContext } from 'react';

import { Embeddable } from '@kbn/embeddable-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { ReduxEmbeddableTools, ReduxToolsPackage } from '@kbn/presentation-util-plugin/public';

import { externalLinkReducers } from '../external_link_reducers';
import { ExternalLinkComponent } from '../components/external_link_component';
import { coreServices } from '../../services/kibana_services';
import { EXTERNAL_LINK_EMBEDDABLE_TYPE } from './external_link_embeddable_factory';
import { ExternalLinkInput, ExternalLinkReduxState } from '../types';
import { NavigationContainer } from '../../navigation_container/embeddable/navigation_container';

export const ExternalLinkContext = createContext<ExternalLinkEmbeddable | null>(null);
export const useExternalLinkEmbeddable = (): ExternalLinkEmbeddable => {
  const linkEmbeddable = useContext<ExternalLinkEmbeddable | null>(ExternalLinkContext);
  if (linkEmbeddable == null) {
    throw new Error('useExternalLinkEmbeddable must be used inside ExternalLinkContext.');
  }
  return linkEmbeddable!;
};

type ExternalLinkReduxEmbeddableTools = ReduxEmbeddableTools<
  ExternalLinkReduxState,
  typeof externalLinkReducers
>;

export class ExternalLinkEmbeddable extends Embeddable<ExternalLinkInput> {
  public readonly type = EXTERNAL_LINK_EMBEDDABLE_TYPE;

  private node?: HTMLElement;

  // state management
  public select: ExternalLinkReduxEmbeddableTools['select'];
  public getState: ExternalLinkReduxEmbeddableTools['getState'];
  public dispatch: ExternalLinkReduxEmbeddableTools['dispatch'];
  public onStateChange: ExternalLinkReduxEmbeddableTools['onStateChange'];

  private cleanupStateTools: () => void;

  constructor(
    reduxToolsPackage: ReduxToolsPackage,
    initialInput: ExternalLinkInput,
    parent: NavigationContainer
  ) {
    super(initialInput, {}, parent);

    /** Build redux embeddable tools */
    const reduxEmbeddableTools = reduxToolsPackage.createReduxEmbeddableTools<
      ExternalLinkReduxState,
      typeof externalLinkReducers
    >({
      embeddable: this,
      reducers: externalLinkReducers,
      initialComponentState: {},
    });

    this.select = reduxEmbeddableTools.select;
    this.getState = reduxEmbeddableTools.getState;
    this.dispatch = reduxEmbeddableTools.dispatch;
    this.cleanupStateTools = reduxEmbeddableTools.cleanup;
    this.onStateChange = reduxEmbeddableTools.onStateChange;
  }

  public render(node: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;

    ReactDOM.render(
      <KibanaThemeProvider theme$={coreServices.theme.theme$}>
        <ExternalLinkContext.Provider value={this}>
          <ExternalLinkComponent />
        </ExternalLinkContext.Provider>
      </KibanaThemeProvider>,
      node
    );
  }

  public destroy() {
    super.destroy();
    this.cleanupStateTools();
    if (this.node) ReactDOM.unmountComponentAtNode(this.node);
  }

  public reload() {}
}
