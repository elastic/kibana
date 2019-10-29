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
import { CoreStart } from 'src/core/public';
import { TGetActionsCompatibleWithTrigger } from 'src/plugins/ui_actions/public';
import { Start as InspectorStartContract } from 'src/plugins/inspector/public';
import { Container, ViewMode, ContainerInput } from '../..';
import { HelloWorldContainerComponent } from './hello_world_container_component';
import { GetEmbeddableFactory, GetEmbeddableFactories } from '../../types';

export const HELLO_WORLD_CONTAINER = 'HELLO_WORLD_CONTAINER';

/**
 * interfaces are not allowed to specify a sub-set of the required types until
 * https://github.com/microsoft/TypeScript/issues/15300 is fixed so we use a type
 * here instead
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type InheritedInput = {
  id: string;
  viewMode: ViewMode;
  lastName: string;
};

interface HelloWorldContainerInput extends ContainerInput {
  lastName?: string;
}

interface HelloWorldContainerOptions {
  getActions: TGetActionsCompatibleWithTrigger;
  getEmbeddableFactory: GetEmbeddableFactory;
  getAllEmbeddableFactories: GetEmbeddableFactories;
  overlays: CoreStart['overlays'];
  notifications: CoreStart['notifications'];
  inspector: InspectorStartContract;
  SavedObjectFinder: React.ComponentType<any>;
}

export class HelloWorldContainer extends Container<InheritedInput, HelloWorldContainerInput> {
  public readonly type = HELLO_WORLD_CONTAINER;

  constructor(
    input: ContainerInput<{ firstName: string; lastName: string }>,
    private readonly options: HelloWorldContainerOptions
  ) {
    super(input, { embeddableLoaded: {} }, options.getEmbeddableFactory);
  }

  public getInheritedInput(id: string) {
    return {
      id,
      viewMode: this.input.viewMode || ViewMode.EDIT,
      lastName: this.input.lastName || 'foo',
    };
  }

  public render(node: HTMLElement) {
    ReactDOM.render(
      <I18nProvider>
        <HelloWorldContainerComponent
          container={this}
          getActions={this.options.getActions}
          getAllEmbeddableFactories={this.options.getAllEmbeddableFactories}
          getEmbeddableFactory={this.options.getEmbeddableFactory}
          overlays={this.options.overlays}
          notifications={this.options.notifications}
          inspector={this.options.inspector}
          SavedObjectFinder={this.options.SavedObjectFinder}
        />
      </I18nProvider>,
      node
    );
  }
}
