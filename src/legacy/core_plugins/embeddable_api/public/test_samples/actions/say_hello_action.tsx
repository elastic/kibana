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
import { npStart } from 'ui/new_platform';
import { EuiFlyoutBody } from '@elastic/eui';
import { triggerRegistry, CONTEXT_MENU_TRIGGER, attachAction } from '../../triggers';
import { Action, ActionContext, actionRegistry, IncompatibleActionError } from '../../actions';
import { EmbeddableInput, Embeddable, EmbeddableOutput, IEmbeddable } from '../../embeddables';

export const SAY_HELLO_ACTION = 'SAY_HELLO_ACTION';

export interface FullNameEmbeddableOutput extends EmbeddableOutput {
  fullName: string;
}

export function hasFullNameOutput(
  embeddable: IEmbeddable | Embeddable<EmbeddableInput, FullNameEmbeddableOutput>
) {
  return (
    (embeddable as Embeddable<EmbeddableInput, FullNameEmbeddableOutput>).getOutput().fullName !==
    undefined
  );
}

function openSayHelloFlyout(hello: string) {
  npStart.core.overlays.openFlyout(<EuiFlyoutBody>{hello}</EuiFlyoutBody>);
}

export class SayHelloAction extends Action {
  public readonly type = SAY_HELLO_ACTION;
  private sayHello: (name: string) => void;

  // Taking in a function, instead of always directly interacting with the dom,
  // can make testing the execute part of the action easier.
  constructor(sayHello: (name: string) => void = openSayHelloFlyout) {
    super(SAY_HELLO_ACTION);
    this.sayHello = sayHello;
  }

  getDisplayName() {
    return 'Say hello';
  }

  // Can use typescript generics to get compiler time warnings for immediate feedback if
  // the context is not compatible.
  async isCompatible(
    context: ActionContext<Embeddable<EmbeddableInput, FullNameEmbeddableOutput>>
  ) {
    // Option 1: only compatible with Greeting Embeddables.
    // return context.embeddable.type === CONTACT_CARD_EMBEDDABLE;

    // Option 2: require an embeddable with a specific input or output shape
    return hasFullNameOutput(context.embeddable);
  }

  async execute(
    context: ActionContext<
      Embeddable<EmbeddableInput, FullNameEmbeddableOutput>,
      { message?: string }
    >
  ) {
    if (!(await this.isCompatible(context))) {
      throw new IncompatibleActionError();
    }

    const greeting = `Hello, ${context.embeddable.getOutput().fullName}`;

    if (context.triggerContext && context.triggerContext.message) {
      this.sayHello(`${greeting}.  ${context.triggerContext.message}`);
    } else {
      this.sayHello(greeting);
    }
  }
}

actionRegistry.set(SAY_HELLO_ACTION, new SayHelloAction());
attachAction(triggerRegistry, { triggerId: CONTEXT_MENU_TRIGGER, actionId: SAY_HELLO_ACTION });
