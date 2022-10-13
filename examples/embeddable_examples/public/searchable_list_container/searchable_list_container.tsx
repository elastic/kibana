/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {
  Container,
  ContainerInput,
  EmbeddableStart,
  EmbeddableInput,
} from '@kbn/embeddable-plugin/public';
import { SearchableListContainerComponent } from './searchable_list_container_component';

export const SEARCHABLE_LIST_CONTAINER = 'SEARCHABLE_LIST_CONTAINER';

export interface SearchableContainerInput extends ContainerInput {
  search?: string;
}

interface ChildInput extends EmbeddableInput {
  search?: string;
}

export class SearchableListContainer extends Container<ChildInput, SearchableContainerInput> {
  public readonly type = SEARCHABLE_LIST_CONTAINER;
  private node?: HTMLElement;

  constructor(input: SearchableContainerInput, private embeddableServices: EmbeddableStart) {
    super(input, { embeddableLoaded: {} }, embeddableServices.getEmbeddableFactory);
  }

  // TODO: add a more advanced example here where inherited child input is derived from container
  // input and not just an exact pass through.
  getInheritedInput(id: string) {
    return {
      id,
      search: this.getInput().search,
      viewMode: this.input.viewMode,
    };
  }

  public render(node: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;
    ReactDOM.render(
      <SearchableListContainerComponent
        embeddable={this}
        embeddableServices={this.embeddableServices}
      />,
      node
    );
  }

  public destroy() {
    super.destroy();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
