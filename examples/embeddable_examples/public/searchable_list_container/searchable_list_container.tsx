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
import {
  Container,
  ContainerInput,
  GetEmbeddableFactory,
  EmbeddableInput,
} from '../../../../src/plugins/embeddable/public';
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

  constructor(input: SearchableContainerInput, getEmbeddableFactory: GetEmbeddableFactory) {
    super(input, { embeddableLoaded: {} }, getEmbeddableFactory);
  }

  // TODO: add a more advanced example here where inherited child input is derived from container
  // input and not just an exact pass through.
  getInheritedInput(id: string) {
    return {
      id,
      search: this.getInput().search,
    };
  }

  public render(node: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;
    ReactDOM.render(<SearchableListContainerComponent embeddable={this} />, node);
  }

  public destroy() {
    super.destroy();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
