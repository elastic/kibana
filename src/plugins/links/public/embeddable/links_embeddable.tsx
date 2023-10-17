/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext } from 'react';
import { Subscription, distinctUntilChanged, skip } from 'rxjs';
import deepEqual from 'fast-deep-equal';

import {
  AttributeService,
  Embeddable,
  ReferenceOrValueEmbeddable,
  SavedObjectEmbeddableInput,
} from '@kbn/embeddable-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import { ReduxEmbeddableTools, ReduxToolsPackage } from '@kbn/presentation-util-plugin/public';

import { linksReducers } from './links_reducers';
import { LinksByReferenceInput, LinksByValueInput, LinksReduxState } from './types';
import { LinksComponent } from '../components/links_component';
import { LinksInput, LinksOutput } from './types';
import { LinksAttributes } from '../../common/content_management';
import { CONTENT_ID } from '../../common';

export const LinksContext = createContext<LinksEmbeddable | null>(null);
export const useLinks = (): LinksEmbeddable => {
  const linksEmbeddable = useContext<LinksEmbeddable | null>(LinksContext);
  if (linksEmbeddable == null) {
    throw new Error('useLinks must be used inside LinksContext.');
  }
  return linksEmbeddable!;
};

type LinksReduxEmbeddableTools = ReduxEmbeddableTools<LinksReduxState, typeof linksReducers>;

export interface LinksConfig {
  editable: boolean;
}

export class LinksEmbeddable
  extends Embeddable<LinksInput, LinksOutput>
  implements ReferenceOrValueEmbeddable<LinksByValueInput, LinksByReferenceInput>
{
  public readonly type = CONTENT_ID;
  deferEmbeddableLoad = true;

  private isDestroyed?: boolean;
  private subscriptions: Subscription = new Subscription();

  // state management
  /**
   * TODO: Keep track of the necessary state without the redux embeddable tools; it's kind of overkill here.
   *       Related issue: https://github.com/elastic/kibana/issues/167577
   */
  public select: LinksReduxEmbeddableTools['select'];
  public getState: LinksReduxEmbeddableTools['getState'];
  public dispatch: LinksReduxEmbeddableTools['dispatch'];
  public onStateChange: LinksReduxEmbeddableTools['onStateChange'];

  private cleanupStateTools: () => void;

  constructor(
    reduxToolsPackage: ReduxToolsPackage,
    config: LinksConfig,
    initialInput: LinksInput,
    private attributeService: AttributeService<LinksAttributes>,
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
      LinksReduxState,
      typeof linksReducers
    >({
      embeddable: this,
      reducers: linksReducers,
      initialComponentState: {
        title: '',
      },
    });

    this.select = reduxEmbeddableTools.select;
    this.getState = reduxEmbeddableTools.getState;
    this.dispatch = reduxEmbeddableTools.dispatch;
    this.cleanupStateTools = reduxEmbeddableTools.cleanup;
    this.onStateChange = reduxEmbeddableTools.onStateChange;

    this.initializeSavedLinks()
      .then(() => this.setInitializationFinished())
      .catch((e: Error) => this.onFatalError(e));

    // By-value panels should update the componentState when input changes
    this.subscriptions.add(
      this.getInput$()
        .pipe(distinctUntilChanged(deepEqual), skip(1))
        .subscribe(async () => await this.initializeSavedLinks())
    );
  }

  private async initializeSavedLinks() {
    const { attributes } = await this.attributeService.unwrapAttributes(this.getInput());
    if (this.isDestroyed) return;

    this.dispatch.setAttributes(attributes);

    await this.initializeOutput();
  }

  private async initializeOutput() {
    const attributes = this.getState().componentState;
    const { title, description } = this.getInput();
    this.updateOutput({
      defaultTitle: attributes.title,
      defaultDescription: attributes.description,
      title: title ?? attributes.title,
      description: description ?? attributes.description,
    });
  }

  public inputIsRefType(
    input: LinksByValueInput | LinksByReferenceInput
  ): input is LinksByReferenceInput {
    return this.attributeService.inputIsRefType(input);
  }

  public async getInputAsRefType(): Promise<SavedObjectEmbeddableInput> {
    return this.attributeService.getInputAsRefType(this.getExplicitInput(), {
      showSaveModal: true,
      saveModalTitle: this.getTitle(),
    });
  }

  public async getInputAsValueType(): Promise<LinksByValueInput> {
    return this.attributeService.getInputAsValueType(this.getExplicitInput());
  }

  public async reload() {
    if (this.isDestroyed) return;
    // By-reference embeddable panels are reloaded when changed, so update the componentState
    this.initializeSavedLinks();
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
      <LinksContext.Provider value={this}>
        <LinksComponent />
      </LinksContext.Provider>
    );
  }
}
