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

export const DESCRIPTIVE_CONTACT_CARD_EMBEDDABLE = 'DESCRIPTIVE_CONTACT_CARD_EMBEDDABLE';

export class DescriptiveContactCardEmbeddableFactory
  implements EmbeddableFactoryDefinition<ContactCardEmbeddableInput>
{
  public readonly type = DESCRIPTIVE_CONTACT_CARD_EMBEDDABLE;

  constructor(protected readonly execTrigger: UiActionsStart['executeTriggerActions']) {}

  public async isEditable() {
    return true;
  }

  public getDisplayName() {
    return 'descriptive contact card';
  }

  public create = async (initialInput: ContactCardEmbeddableInput, parent?: Container) => {
    return new ContactCardEmbeddable(
      initialInput,
      {
        execAction: this.execTrigger,
        outputOverrides: {
          defaultDescription: 'This is a family friend',
        },
      },
      parent
    );
  };
}
