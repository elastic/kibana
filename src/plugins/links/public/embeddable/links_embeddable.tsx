/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import deepEqual from 'fast-deep-equal';
import React, { createContext } from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { distinctUntilChanged, skip, Subject, Subscription, switchMap } from 'rxjs';

import type { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import {
  AttributeService,
  Embeddable,
  ReferenceOrValueEmbeddable,
  SavedObjectEmbeddableInput,
  COMMON_EMBEDDABLE_GROUPING,
} from '@kbn/embeddable-plugin/public';

import { CONTENT_ID } from '../../common';
import { LinksAttributes } from '../../common/content_management';
import { LinksComponent } from '../components/links_component';
import { LinksByReferenceInput, LinksByValueInput, LinksInput, LinksOutput } from './types';

export const LinksContext = createContext<LinksEmbeddable | null>(null);

export interface LinksConfig {
  editable: boolean;
}

export class LinksEmbeddable
  extends Embeddable<LinksInput, LinksOutput>
  implements ReferenceOrValueEmbeddable<LinksByValueInput, LinksByReferenceInput>
{
  public readonly type = CONTENT_ID;
  deferEmbeddableLoad = true;

  private domNode?: HTMLElement;
  private isDestroyed?: boolean;
  private subscriptions: Subscription = new Subscription();

  public attributes?: LinksAttributes;
  public attributes$ = new Subject<LinksAttributes>();

  public grouping = [COMMON_EMBEDDABLE_GROUPING.annotation];

  constructor(
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

    this.initializeSavedLinks()
      .then(() => this.setInitializationFinished())
      .catch((e: Error) => this.onFatalError(e));

    // By-value panels should update the links attributes when input changes
    this.subscriptions.add(
      this.getInput$()
        .pipe(
          distinctUntilChanged(deepEqual),
          skip(1),
          switchMap(async () => await this.initializeSavedLinks())
        )
        .subscribe()
    );

    // Keep attributes in sync with subject value so it can be used in output
    this.subscriptions.add(
      this.attributes$.pipe(distinctUntilChanged(deepEqual)).subscribe((attributes) => {
        this.attributes = attributes;
      })
    );
  }

  private async initializeSavedLinks() {
    const { attributes } = await this.attributeService.unwrapAttributes(this.getInput());
    this.attributes$.next(attributes);
    await this.initializeOutput();
  }

  private async initializeOutput() {
    const { title, description } = this.getInput();
    this.updateOutput({
      defaultTitle: this.attributes?.title,
      defaultDescription: this.attributes?.description,
      title: title ?? this.attributes?.title,
      description: description ?? this.attributes?.description,
    });
  }

  public onRender() {
    this.renderComplete.dispatchComplete();
  }

  public onLoading() {
    this.renderComplete.dispatchInProgress();
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
    // By-reference embeddable panels are reloaded when changed, so update the attributes
    this.initializeSavedLinks();
    if (this.domNode) {
      this.render(this.domNode);
    }
  }

  public destroy() {
    this.isDestroyed = true;
    super.destroy();
    this.subscriptions.unsubscribe();
    if (this.domNode) {
      unmountComponentAtNode(this.domNode);
    }
  }

  public render(domNode: HTMLElement) {
    this.domNode = domNode;
    if (this.isDestroyed) return;
    super.render(domNode);

    this.domNode.setAttribute('data-shared-item', '');

    return (
      <LinksContext.Provider value={this}>
        <LinksComponent />
      </LinksContext.Provider>
    );
  }
}
