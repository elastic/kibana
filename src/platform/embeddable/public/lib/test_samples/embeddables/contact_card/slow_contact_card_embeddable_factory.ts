/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { Container, EmbeddableFactoryDefinition } from '../../..';
import { ContactCardEmbeddable, ContactCardEmbeddableInput } from './contact_card_embeddable';
import { CONTACT_CARD_EMBEDDABLE } from './contact_card_embeddable_factory';

interface SlowContactCardEmbeddableFactoryOptions {
  execAction: UiActionsStart['executeTriggerActions'];
  loadTickCount?: number;
}

export class SlowContactCardEmbeddableFactory
  implements EmbeddableFactoryDefinition<ContactCardEmbeddableInput>
{
  private loadTickCount = 0;
  public readonly type = CONTACT_CARD_EMBEDDABLE;

  constructor(private readonly options: SlowContactCardEmbeddableFactoryOptions) {
    if (options.loadTickCount) {
      this.loadTickCount = options.loadTickCount;
    }
  }

  public async isEditable() {
    return true;
  }

  public getDisplayName() {
    return 'slow to load contact card';
  }

  public create = async (initialInput: ContactCardEmbeddableInput, parent?: Container) => {
    for (let i = 0; i < this.loadTickCount; i++) {
      await Promise.resolve();
    }
    return new ContactCardEmbeddable(initialInput, { execAction: this.options.execAction }, parent);
  };
}
