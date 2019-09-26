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

import { IAction, IncompatibleActionError } from '../../ui_actions';
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

interface ActionContext {
  embeddable: Embeddable<EmbeddableInput, FullNameEmbeddableOutput>;
  message?: string;
}

export class SayHelloAction implements IAction<ActionContext> {
  public readonly type = SAY_HELLO_ACTION;
  public readonly id = SAY_HELLO_ACTION;

  private sayHello: (name: string) => void;

  // Taking in a function, instead of always directly interacting with the dom,
  // can make testing the execute part of the action easier.
  constructor(sayHello: (name: string) => void) {
    this.sayHello = sayHello;
  }

  getDisplayName() {
    return 'Say hello';
  }

  getIconType() {
    return undefined;
  }

  // Can use typescript generics to get compiler time warnings for immediate feedback if
  // the context is not compatible.
  async isCompatible(context: ActionContext) {
    // Option 1: only compatible with Greeting Embeddables.
    // return context.embeddable.type === CONTACT_CARD_EMBEDDABLE;

    // Option 2: require an embeddable with a specific input or output shape
    return hasFullNameOutput(context.embeddable);
  }

  async execute(context: ActionContext) {
    if (!(await this.isCompatible(context))) {
      throw new IncompatibleActionError();
    }

    const greeting = `Hello, ${context.embeddable.getOutput().fullName}`;

    if (context.message) {
      this.sayHello(`${greeting}.  ${context.message}`);
    } else {
      this.sayHello(greeting);
    }
  }
}
