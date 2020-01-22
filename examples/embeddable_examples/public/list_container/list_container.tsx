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
} from '../../../../src/plugins/embeddable/public';
import { ListContainerComponent } from './list_container_component';

export const LIST_CONTAINER = 'LIST_CONTAINER';

export class ListContainer extends Container<{}, ContainerInput> {
  public readonly type = LIST_CONTAINER;
  private node?: HTMLElement;

  constructor(input: ContainerInput, getEmbeddableFactory: GetEmbeddableFactory) {
    super(input, { embeddableLoaded: {} }, getEmbeddableFactory);
  }

  // This container has no input itself.
  getInheritedInput(id: string) {
    return {};
  }

  public render(node: HTMLElement) {
    this.node = node;
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    ReactDOM.render(<ListContainerComponent embeddable={this} />, node);
  }

  public destroy() {
    super.destroy();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
