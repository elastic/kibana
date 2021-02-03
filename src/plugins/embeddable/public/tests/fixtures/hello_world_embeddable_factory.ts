/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { IContainer, EmbeddableInput, EmbeddableFactoryDefinition, EmbeddableFactory } from '../..';
import { HelloWorldEmbeddable, HELLO_WORLD_EMBEDDABLE } from './hello_world_embeddable';

export type HelloWorldEmbeddableFactory = EmbeddableFactory;
export class HelloWorldEmbeddableFactoryDefinition implements EmbeddableFactoryDefinition {
  public readonly type = HELLO_WORLD_EMBEDDABLE;

  /**
   * In our simple example, we let everyone have permissions to edit this. Most
   * embeddables should check the UI Capabilities service to be sure of
   * the right permissions.
   */
  public async isEditable() {
    return true;
  }

  public async create(initialInput: EmbeddableInput, parent?: IContainer) {
    return new HelloWorldEmbeddable(initialInput, parent);
  }

  public getDisplayName() {
    return i18n.translate('embeddableApi.helloworld.displayName', {
      defaultMessage: 'hello world',
    });
  }
}
