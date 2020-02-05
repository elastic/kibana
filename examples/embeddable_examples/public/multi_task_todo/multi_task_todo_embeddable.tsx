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
import { MultiTaskTodoEmbeddableComponent } from './multi_task_todo_component';

export const MULTI_TASK_TODO_EMBEDDABLE = 'MULTI_TASK_TODO_EMBEDDABLE';

export interface MultiTaskTodoInput extends EmbeddableInput {
  tasks: string[];
  icon?: string;
  search?: string;
  title: string;
}

// This embeddable has output! It's the tasks list that is filtered.
// Output state is something only the embeddable itself can update. It
// can be something completely internal, or it can be state that is
// derived from input state and updates when input does.
export interface MultiTaskTodoOutput extends EmbeddableOutput {
  tasks: string[];
}

function getFilteredTasks(tasks: string[], search?: string) {
  const filteredTasks: string[] = [];
  if (search === undefined) return tasks;

  tasks.forEach(task => {
    if (task.match(search)) {
      filteredTasks.push(task);
    }
  });

  return filteredTasks;
}

function getOutput(input: MultiTaskTodoInput) {
  const tasks = getFilteredTasks(input.tasks, input.search);
  return { tasks, hasMatch: tasks.length > 0 || (input.search && input.title.match(input.search)) };
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
