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
import { I18nProvider } from '@kbn/i18n/react';
import { Container, ViewMode, ContainerInput } from '../..';
import { HelloWorldContainerComponent } from './hello_world_container_component';
import { IRegistry } from '../../types';
import { EmbeddableFactory } from '../../embeddables';

export const HELLO_WORLD_CONTAINER = 'HELLO_WORLD_CONTAINER';

interface InheritedInput {
  id: string;
  viewMode: ViewMode;
  lastName: string;
}

export class HelloWorldContainer extends Container<InheritedInput> {
  public readonly type = HELLO_WORLD_CONTAINER;

  constructor(input: ContainerInput, embeddableFactories: IRegistry<EmbeddableFactory>) {
    super(input, { embeddableLoaded: {} }, embeddableFactories);
  }

  public getInheritedInput(id: string) {
    return {
      id,
      viewMode: this.input.viewMode || ViewMode.EDIT,
      lastName: 'foo',
    };
  }

  public render(node: HTMLElement) {
    ReactDOM.render(
      <I18nProvider>
        <HelloWorldContainerComponent container={this} />
      </I18nProvider>,
      node
    );
  }
}
