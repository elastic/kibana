/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container } from '../../../containers';
import { ContactCardEmbeddableInput } from './contact_card_embeddable';
import { ContactCardEmbeddableFactory } from './contact_card_embeddable_factory';
import { ContactCardEmbeddableReact } from './contact_card_embeddable_react';

export const CONTACT_CARD_EMBEDDABLE_REACT = 'CONTACT_CARD_EMBEDDABLE_REACT';

export class ContactCardEmbeddableReactFactory extends ContactCardEmbeddableFactory {
  public readonly type = CONTACT_CARD_EMBEDDABLE_REACT as ContactCardEmbeddableFactory['type'];

  public create = async (initialInput: ContactCardEmbeddableInput, parent?: Container) => {
    return new ContactCardEmbeddableReact(
      initialInput,
      {
        execAction: this.execTrigger,
      },
      parent
    );
  };
}
