/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDom from 'react-dom';
import { Subscription } from 'rxjs';
import type { ErrorLike } from '@kbn/expressions-plugin/common';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { Container } from '../../../containers';
import { EmbeddableOutput, Embeddable, EmbeddableInput } from '../../../embeddables';
import { CONTACT_CARD_EMBEDDABLE } from './contact_card_embeddable_factory';
import { ContactCardEmbeddableComponent } from './contact_card';

export interface ContactCardEmbeddableInput extends EmbeddableInput {
  firstName: string;
  lastName?: string;
  nameTitle?: string;
}

export interface ContactCardEmbeddableOutput extends EmbeddableOutput {
  fullName: string;
  originalLastName?: string;
}

export interface ContactCardEmbeddableOptions {
  execAction: UiActionsStart['executeTriggerActions'];
  outputOverrides?: Partial<ContactCardEmbeddableOutput>;
}

function getFullName(input: ContactCardEmbeddableInput) {
  const { nameTitle, firstName, lastName } = input;
  const nameParts = [nameTitle, firstName, lastName].filter((name) => name !== undefined);
  return nameParts.join(' ');
}

export class ContactCardEmbeddable extends Embeddable<
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput
> {
  private subscription: Subscription;
  private node?: Element;
  public readonly type: string = CONTACT_CARD_EMBEDDABLE;

  constructor(
    initialInput: ContactCardEmbeddableInput,
    protected readonly options: ContactCardEmbeddableOptions,
    parent?: Container
  ) {
    super(
      initialInput,
      {
        fullName: getFullName(initialInput),
        originalLastName: initialInput.lastName,
        defaultTitle: `Hello ${getFullName(initialInput)}`,
        ...options.outputOverrides,
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
    ReactDom.render(
      <ContactCardEmbeddableComponent embeddable={this} execTrigger={this.options.execAction} />,
      node
    );
  }

  public catchError?(error: ErrorLike, node: HTMLElement) {
    ReactDom.render(<div data-test-subj="error">{error.message}</div>, node);

    return () => ReactDom.unmountComponentAtNode(node);
  }

  public destroy() {
    super.destroy();
    this.subscription.unsubscribe();
    if (this.node) {
      ReactDom.unmountComponentAtNode(this.node);
    }
  }

  public reload() {}

  public triggerError(error: ErrorLike, fatal = false) {
    if (fatal) {
      this.onFatalError(error);
    } else {
      this.updateOutput({ error });
    }
  }
}

export const CONTACT_USER_TRIGGER = 'CONTACT_USER_TRIGGER';
