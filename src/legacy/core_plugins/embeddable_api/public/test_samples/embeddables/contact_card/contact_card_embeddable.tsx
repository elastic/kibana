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
import ReactDom from 'react-dom';
import { Subscription } from 'rxjs';
import { Container } from '../../../containers';
import { triggerRegistry } from '../../../triggers';
import { EmbeddableOutput, Embeddable, EmbeddableInput } from '../../../embeddables';
import { CONTACT_CARD_EMBEDDABLE } from './contact_card_embeddable_factory';
import { ContactCardEmbeddableComponent } from './contact_card';
import { SEND_MESSAGE_ACTION } from '../../actions/send_message_action';

export interface ContactCardEmbeddableInput extends EmbeddableInput {
  firstName: string;
  lastName?: string;
  nameTitle?: string;
}

export interface ContactCardEmbeddableOutput extends EmbeddableOutput {
  fullName: string;
  originalLastName?: string;
}

function getFullName(input: ContactCardEmbeddableInput) {
  const { nameTitle, firstName, lastName } = input;
  const nameParts = [nameTitle, firstName, lastName].filter(name => name !== undefined);
  return nameParts.join(' ');
}

export class ContactCardEmbeddable extends Embeddable<
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput
> {
  private subscription: Subscription;
  private node?: Element;
  public readonly type: string = CONTACT_CARD_EMBEDDABLE;

  constructor(initialInput: ContactCardEmbeddableInput, parent?: Container) {
    super(
      initialInput,
      {
        fullName: getFullName(initialInput),
        originalLastName: initialInput.lastName,
        defaultTitle: `Hello ${getFullName(initialInput)}`,
      },
      parent
    );

    this.subscription = this.getInput$().subscribe(() => {
      const fullName = getFullName(this.input);
      this.updateOutput({
        fullName,
        defaultTitle: `Hello ${fullName}`,
      });
    });
  }

  public render(node: HTMLElement) {
    this.node = node;
    ReactDom.render(<ContactCardEmbeddableComponent embeddable={this} />, node);
  }

  public destroy() {
    super.destroy();
    this.subscription.unsubscribe();
    if (this.node) {
      ReactDom.unmountComponentAtNode(this.node);
    }
  }

  public reload() {}
}

export const CONTACT_USER_TRIGGER = 'CONTACT_USER_TRIGGER';

triggerRegistry.set(CONTACT_USER_TRIGGER, {
  id: CONTACT_USER_TRIGGER,
  actionIds: [SEND_MESSAGE_ACTION],
});
