/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import {
  IContainer,
  EmbeddableInput,
  EmbeddableFactoryDefinition,
  EmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { SimpleEmbeddable } from './migrations_embeddable';
import { migration730 } from './migration.7.3.0';

export const SIMPLE_EMBEDDABLE = 'SIMPLE_EMBEDDABLE';

// in 7.3.0 we added `title` to the input and renamed the `number` variable to `value`
export type SimpleEmbeddableInput = EmbeddableInput & {
  title: string;
  value: number;
};

export type SimpleEmbeddableFactory = EmbeddableFactory;
export class SimpleEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition<SimpleEmbeddableInput>
{
  public readonly type = SIMPLE_EMBEDDABLE;

  // we need to provide migration function every time we change the interface of our state
  public readonly migrations = {
    '7.3.0': migration730,
  };

  public extract(state: EmbeddableStateWithType) {
    // this embeddable does not store references to other saved objects
    return { state, references: [] };
  }

  public inject(state: EmbeddableStateWithType) {
    // this embeddable does not store references to other saved objects
    return state;
  }

  /**
   * In our simple example, we let everyone have permissions to edit this. Most
   * embeddables should check the UI Capabilities service to be sure of
   * the right permissions.
   */
  public async isEditable() {
    return true;
  }

  public async create(initialInput: SimpleEmbeddableInput, parent?: IContainer) {
    return new SimpleEmbeddable(initialInput, parent);
  }

  public getDisplayName() {
    return i18n.translate('embeddableExamples.migrations.displayName', {
      defaultMessage: 'hello world',
    });
  }
}
