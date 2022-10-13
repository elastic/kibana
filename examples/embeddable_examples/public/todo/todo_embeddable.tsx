/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';
import {
  Embeddable,
  EmbeddableInput,
  IContainer,
  EmbeddableOutput,
} from '@kbn/embeddable-plugin/public';
import { TodoEmbeddableComponent } from './todo_component';

export const TODO_EMBEDDABLE = 'TODO_EMBEDDABLE';

export interface TodoInput extends EmbeddableInput {
  task: string;
  icon?: string;
  search?: string;
}

export interface TodoOutput extends EmbeddableOutput {
  hasMatch: boolean;
}

function getOutput(input: TodoInput): TodoOutput {
  return {
    hasMatch: input.search
      ? Boolean(input.task.match(input.search) || (input.title && input.title.match(input.search)))
      : true,
  };
}

export class TodoEmbeddable extends Embeddable<TodoInput, TodoOutput> {
  // The type of this embeddable. This will be used to find the appropriate factory
  // to instantiate this kind of embeddable.
  public readonly type = TODO_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;

  constructor(initialInput: TodoInput, parent?: IContainer) {
    super(initialInput, getOutput(initialInput), parent);

    // If you have any output state that changes as a result of input state changes, you
    // should use an subcription.  Here, we use output to indicate whether this task
    // matches the search string.
    this.subscription = this.getInput$().subscribe(() => {
      this.updateOutput(getOutput(this.input));
    });
  }

  public render(node: HTMLElement) {
    this.node = node;
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    ReactDOM.render(<TodoEmbeddableComponent embeddable={this} />, node);
  }

  /**
   * Not relevant.
   */
  public reload() {}

  public destroy() {
    super.destroy();
    this.subscription.unsubscribe();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
