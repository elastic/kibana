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
import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';
import {
  Embeddable,
  EmbeddableInput,
  IContainer,
  EmbeddableOutput,
} from '../../../../src/plugins/embeddable/public';
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
