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
import { Embeddable, EmbeddableInput } from 'plugins/embeddable_api/index';
import React from 'react';
import ReactDom from 'react-dom';
import { EmbeddableOutput } from 'plugins/embeddable_api/embeddables';
import { Container } from 'plugins/embeddable_api/containers';
import { Subscription } from 'rxjs';
import { triggerRegistry } from 'plugins/embeddable_api/triggers';
import { GREETING_EMBEDDABLE } from './greeting_embeddable_factory';
import { GreetingEmbeddableComponent } from './greeting_embeddable_component';
import { SAY_HELLO_ACTION } from '../../actions/say_hello_action';

export interface GreetingEmbeddableInput extends EmbeddableInput {
  firstName: string;
  lastName?: string;
  nameTitle?: string;
}

export interface GreetingEmbeddableOutput extends EmbeddableOutput {
  fullName: string;
  originalLastName?: string;
}

function getFullName(input: GreetingEmbeddableInput) {
  const { nameTitle, firstName, lastName } = input;
  const nameParts = [nameTitle, firstName, lastName].filter(name => name !== undefined);
  return nameParts.join(' ');
}

export const CONTACT_USER_TRIGGER = 'CONTACT_USER_TRIGGER';

export class GreetingEmbeddable extends Embeddable<
  GreetingEmbeddableInput,
  GreetingEmbeddableOutput
> {
  private subscription: Subscription;
  private node?: Element;

  constructor(initialInput: GreetingEmbeddableInput, parent?: Container) {
    super(
      GREETING_EMBEDDABLE,
      initialInput,
      {
        fullName: getFullName(initialInput),
        originalLastName: initialInput.lastName,
      },
      parent
    );
    this.subscription = this.getInput$().subscribe(() => {
      const fullName = getFullName(this.input);
      this.updateOutput({
        fullName,
        title: `Hello ${fullName}`,
      });
    });
  }

  public graduateWithPhd() {
    this.updateInput({ nameTitle: 'Dr.' });
  }

  public getMarried(newLastName: string) {
    this.updateInput({ lastName: newLastName });
  }

  public getDivorced() {
    this.updateInput({ lastName: this.output.originalLastName });
  }

  public render(node: HTMLElement) {
    this.node = node;
    ReactDom.render(<GreetingEmbeddableComponent embeddable={this} />, node);
  }

  public destroy() {
    super.destroy();
    this.subscription.unsubscribe();
    if (this.node) {
      ReactDom.unmountComponentAtNode(this.node);
    }
  }
}

triggerRegistry.registerTrigger({
  id: CONTACT_USER_TRIGGER,
  title: 'Contact user',
  actionIds: [SAY_HELLO_ACTION],
});
