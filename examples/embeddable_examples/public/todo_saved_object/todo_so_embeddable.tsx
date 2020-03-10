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
import * as Rx from 'rxjs';
import { SavedObjectsClientContract } from 'kibana/public';
import { TodoSavedObjectAttributes } from '../../common';
import {
  Embeddable,
  IContainer,
  EmbeddableOutput,
  SavedObjectEmbeddableInput,
} from '../../../../src/plugins/embeddable/public';
import { TodoSoEmbeddableComponent } from './todo_so_component';

// Notice this is not the same value as the 'note' saved object type. Many of our
// cases in prod today use the same value, but this is unnecessary.
export const TODO_SO_EMBEDDABLE = 'TODO_SO_EMBEDDABLE';

export function getTitle(note: TodoSoEmbeddable): string | undefined {
  const title = note.getInput().attributes?.title;
  const savedTitle = note.getOutput().savedAttributes?.title;

  return title || savedTitle;
}

export function getTask(note: TodoSoEmbeddable): string | undefined {
  const unsavedTask = note.getInput().attributes?.task;
  const savedTask = note.getOutput().savedAttributes?.task;

  return unsavedTask || savedTask;
}

export function getIcon(note: TodoSoEmbeddable): string | undefined {
  const icon = note.getInput().attributes?.icon;
  const savedIcon = note.getOutput().savedAttributes?.icon;

  return icon || savedIcon;
}

export interface TodoSoEmbeddableInput extends SavedObjectEmbeddableInput {
  search?: string;
  attributes: TodoSavedObjectAttributes;
}

export interface TodoSoEmbeddableOutput extends EmbeddableOutput {
  hasMatch: boolean;
  savedAttributes?: TodoSavedObjectAttributes;
}

function getHasMatch(todo: TodoSoEmbeddable): boolean {
  const task = getTask(todo);
  const title = getTitle(todo);
  const { search } = todo.getInput();
  if (!search) return true;
  if (!task) return false;
  return todo.getInput().search ? Boolean(task?.match(search) || title?.match(search)) : true;
}

/**
 * This is an example of an embeddable that can optionally be backed by a saved object.
 */

export class TodoSoEmbeddable extends Embeddable<TodoSoEmbeddableInput, TodoSoEmbeddableOutput> {
  public readonly type = TODO_SO_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;
  private savedObjectsClient: SavedObjectsClientContract;
  private savedObjectId?: string;

  constructor(
    initialInput: TodoSoEmbeddableInput,
    {
      parent,
      savedObjectsClient,
    }: {
      parent?: IContainer;
      savedObjectsClient: SavedObjectsClientContract;
    }
  ) {
    super(initialInput, { hasMatch: false }, parent);
    this.savedObjectsClient = savedObjectsClient;

    this.subscription = Rx.merge(this.getOutput$(), this.getInput$()).subscribe(async () => {
      const { savedObjectId } = this.getInput();
      if (this.savedObjectId !== savedObjectId) {
        this.savedObjectId = savedObjectId;
        if (savedObjectId !== undefined) {
          this.reload();
        }
      }
    });
  }

  public render(node: HTMLElement) {
    this.node = node;
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    ReactDOM.render(<TodoSoEmbeddableComponent embeddable={this} />, node);
  }

  public async reload() {
    if (this.savedObjectId !== undefined) {
      const savedObject = await this.savedObjectsClient.get<TodoSavedObjectAttributes>(
        'todo',
        this.savedObjectId
      );
      if (!this.input.attributes) {
        this.updateInput({ attributes: savedObject.attributes });
      }
      this.updateOutput({
        hasMatch: getHasMatch(this),
        savedAttributes: savedObject.attributes,
      });
      if (this.node) {
        this.render(this.node);
      }
    }
  }

  public destroy() {
    super.destroy();
    this.subscription.unsubscribe();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
