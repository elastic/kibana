/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ContactCardEmbeddableComponent } from './contact_card';
import { ContactCardEmbeddable } from './contact_card_embeddable';

export class ContactCardEmbeddableReact extends ContactCardEmbeddable {
  public render() {
    return (
      <ContactCardEmbeddableComponent embeddable={this} execTrigger={this.options.execAction} />
    );
  }
}
