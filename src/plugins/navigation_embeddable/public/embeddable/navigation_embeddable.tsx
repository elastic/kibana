/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext } from 'react';
import { Subscription } from 'rxjs';

import {
  AttributeService,
  Embeddable,
  ReferenceOrValueEmbeddable,
  SavedObjectEmbeddableInput,
} from '@kbn/embeddable-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import { ReduxEmbeddableTools, ReduxToolsPackage } from '@kbn/presentation-util-plugin/public';

import { navigationEmbeddableReducers } from './navigation_embeddable_reducers';
import {
  NavigationEmbeddableByReferenceInput,
  NavigationEmbeddableByValueInput,
  NavigationEmbeddableReduxState,
} from './types';
import { NavigationEmbeddableComponent } from '../components/navigation_embeddable_component';
import { NavigationEmbeddableInput, NavigationEmbeddableOutput } from './types';
import { NavigationEmbeddableAttributes } from '../../common/content_management';
import { NAVIGATION_EMBEDDABLE_TYPE } from '../../common/constants';

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

export interface NavigationEmbeddableConfig {
  editable: boolean;
}

export class NavigationEmbeddable
  extends Embeddable<NavigationEmbeddableInput, NavigationEmbeddableOutput>
  implements
    ReferenceOrValueEmbeddable<
      NavigationEmbeddableByValueInput,
      NavigationEmbeddableByReferenceInput
    >
{
  public readonly type = NAVIGATION_EMBEDDABLE_TYPE;
  deferEmbeddableLoad = true;

  private isDestroyed?: boolean;
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
    private attributeService: AttributeService<NavigationEmbeddableAttributes>,
    parent?: DashboardContainer
  ) {
    super(
      initialInput,
      {
        editable: config.editable,
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

    this.initializeSavedLinks(initialInput)
      .then(() => this.setInitializationFinished())
      .catch((e: Error) => this.onFatalError(e));
  }

  private async initializeSavedLinks(input: NavigationEmbeddableInput) {
    const { metaInfo, attributes } = await this.attributeService.unwrapAttributes(input);
    if (this.isDestroyed) return;

    // TODO handle metaInfo

    this.updateInput({ attributes });

    await this.initializeOutput();
  }

  private async initializeOutput() {
    const { attributes } = this.getInput() as NavigationEmbeddableByValueInput;
    const { title, description } = this.getInput();
    this.updateOutput({
      defaultTitle: attributes.title,
      defaultDescription: attributes.description,
      title: title ?? attributes.title,
      description: description ?? attributes.description,
    });
  }

  public inputIsRefType(
    input: NavigationEmbeddableByValueInput | NavigationEmbeddableByReferenceInput
  ): input is NavigationEmbeddableByReferenceInput {
    return this.attributeService.inputIsRefType(input);
  }

  public async getInputAsRefType(): Promise<SavedObjectEmbeddableInput> {
    return this.attributeService.getInputAsRefType(this.getExplicitInput(), {
      showSaveModal: false,
    });
  }

  public async getInputAsValueType(): Promise<NavigationEmbeddableByValueInput> {
    return this.attributeService.getInputAsValueType(this.getExplicitInput());
  }

  public async reload() {
    if (this.isDestroyed) return;
    await this.initializeSavedLinks(this.getInput());
    this.render();
  }

  public destroy() {
    this.isDestroyed = true;
    super.destroy();
    this.subscriptions.unsubscribe();
    this.cleanupStateTools();
  }

  public render() {
    if (this.isDestroyed) return;
    return (
      <NavigationEmbeddableContext.Provider value={this}>
        <NavigationEmbeddableComponent />
      </NavigationEmbeddableContext.Provider>
    );
  }
}
