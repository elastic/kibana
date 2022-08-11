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
import { MultiTaskTodoEmbeddableComponent } from './multi_task_todo_component';

export const MULTI_TASK_TODO_EMBEDDABLE = 'MULTI_TASK_TODO_EMBEDDABLE';

export interface MultiTaskTodoInput extends EmbeddableInput {
  tasks: string[];
  icon?: string;
  search?: string;
  title: string;
}

// This embeddable has output! Output state is something only the embeddable itself
// can update. It can be something completely internal, or it can be state that is
// derived from input state and updates when input does.
export interface MultiTaskTodoOutput extends EmbeddableOutput {
  hasMatch: boolean;
}

function getHasMatch(tasks: string[], title?: string, search?: string) {
  if (search === undefined || search === '') return false;

  if (title && title.match(search)) return true;

  const match = tasks.find((task) => task.match(search));
  if (match) return true;

  return false;
}

function getOutput(input: MultiTaskTodoInput) {
  const hasMatch = getHasMatch(input.tasks, input.title, input.search);
  return { hasMatch };
}

export class MultiTaskTodoEmbeddable extends Embeddable<MultiTaskTodoInput, MultiTaskTodoOutput> {
  public readonly type = MULTI_TASK_TODO_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;

  constructor(initialInput: MultiTaskTodoInput, parent?: IContainer) {
    super(initialInput, getOutput(initialInput), parent);

    // If you have any output state that changes as a result of input state changes, you
    // should use an subcription.  Here, any time input tasks list, or the input filter
    // changes, we want to update the output tasks list as well as whether a match has
    // been found.
    this.subscription = this.getInput$().subscribe(() => {
      this.updateOutput(getOutput(this.input));
    });
  }

  public render(node: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;
    ReactDOM.render(<MultiTaskTodoEmbeddableComponent embeddable={this} />, node);
  }

  public reload() {}

  public destroy() {
    super.destroy();
    this.subscription.unsubscribe();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
