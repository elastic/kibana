/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { SavedObjectReference } from 'kibana/server';
import { merge, Subscription } from 'rxjs';
import { SearchableListSavedObjectAttributes } from 'examples/embeddable_examples/common';
import {
  Container,
  SavedObjectContainerInput,
  EmbeddableInput,
  PanelState,
  ContainerOutput,
} from '../../../../src/plugins/embeddable/public';
import { SearchableListContainerComponent } from './searchable_list_container_component';
import { StartServices } from './searchable_list_container_factory';

export const SEARCHABLE_LIST_CONTAINER = 'SEARCHABLE_LIST_CONTAINER';

export interface SearchableContainerInput extends SavedObjectContainerInput {
  search?: string;
}

export interface SearchableContainerOutput extends ContainerOutput {
  savedPanels?: {
    [key: string]: PanelState<{ [id: string]: unknown } & { id: string }>;
  };
  savedTitle?: string;
  savedSearch?: string;
}

interface ChildInput extends EmbeddableInput {
  search?: string;
}

export class SearchableListContainer extends Container<
  ChildInput,
  SearchableContainerInput,
  SearchableContainerOutput
> {
  public readonly type = SEARCHABLE_LIST_CONTAINER;
  private node?: HTMLElement;
  private mySubscription: Subscription;
  private savedObjectId?: string;

  constructor(input: SearchableContainerInput, private services: StartServices) {
    super({ panels: {}, ...input }, { embeddableLoaded: {} }, services.getEmbeddableFactory);

    this.mySubscription = merge(this.getOutput$(), this.getInput$()).subscribe(async () => {
      const { savedObjectId } = this.getInput();
      if (this.savedObjectId !== savedObjectId) {
        this.savedObjectId = savedObjectId;
        if (savedObjectId !== undefined) {
          this.reload();
        }
      }
    });
  }

  // TODO: add a more advanced example here where inherited child input is derived from container
  // input and not just an exact pass through.
  getInheritedInput(id: string) {
    return {
      id,
      search: this.getInput().search,
      viewMode: this.getInput().viewMode,
    };
  }

  public isDirty() {
    return (
      !_.isEqual(this.input.panels, this.output.savedPanels) ||
      this.input.title !== this.output.savedTitle
    );
  }

  public async reload() {
    if (this.savedObjectId !== undefined) {
      const savedObject = await this.services.savedObject.client.get<
        SearchableListSavedObjectAttributes
      >('list', this.savedObjectId);
      const panels = JSON.parse(savedObject.attributes.panelsJSON);
      this.updateOutput({
        savedPanels: panels,
        savedTitle: savedObject.attributes.title,
        defaultTitle: savedObject.attributes.title,
        savedSearch: savedObject.attributes.search,
        title: this.input.hidePanelTitles ? '' : savedObject.attributes.title,
      });
      this.updateInput({ panels });
    }
  }

  public render(node: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;
    ReactDOM.render(
      <SearchableListContainerComponent embeddable={this} services={this.services} />,
      node
    );
  }

  public destroy() {
    super.destroy();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.mySubscription.unsubscribe();
  }
}
