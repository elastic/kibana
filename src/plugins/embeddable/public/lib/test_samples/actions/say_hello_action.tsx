/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IncompatibleActionError, Action } from '../../ui_actions';
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

export interface SayHelloActionContext {
  embeddable: Embeddable<EmbeddableInput, FullNameEmbeddableOutput>;
  message?: string;
}

export class SayHelloAction implements Action<SayHelloActionContext> {
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
  async isCompatible(context: SayHelloActionContext) {
    // Option 1: only compatible with Greeting Embeddables.
    // return context.embeddable.type === CONTACT_CARD_EMBEDDABLE;

    // Option 2: require an embeddable with a specific input or output shape
    return hasFullNameOutput(context.embeddable);
  }

  async execute(context: SayHelloActionContext) {
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
