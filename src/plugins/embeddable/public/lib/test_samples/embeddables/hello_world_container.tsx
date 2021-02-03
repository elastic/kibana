/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { Container, ViewMode, ContainerInput } from '../..';
import { HelloWorldContainerComponent } from './hello_world_container_component';
import { EmbeddableStart } from '../../../plugin';

export const HELLO_WORLD_CONTAINER = 'HELLO_WORLD_CONTAINER';

/**
 * interfaces are not allowed to specify a sub-set of the required types until
 * https://github.com/microsoft/TypeScript/issues/15300 is fixed so we use a type
 * here instead
 */
type InheritedInput = {
  id: string;
  viewMode: ViewMode;
  lastName: string;
};

interface HelloWorldContainerInput extends ContainerInput {
  lastName?: string;
}

interface HelloWorldContainerOptions {
  getEmbeddableFactory: EmbeddableStart['getEmbeddableFactory'];
  panelComponent: EmbeddableStart['EmbeddablePanel'];
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
          panelComponent={this.options.panelComponent}
        />
      </I18nProvider>,
      node
    );
  }
}
