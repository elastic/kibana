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
import { SavedObjectsClientContract } from 'kibana/public';
import {
  Embeddable,
  EmbeddableInput,
  IContainer,
  EmbeddableOutput,
  SavedObjectEmbeddableInput,
} from '../../../../../src/plugins/embeddable/public';
import { TodoSavedObjectAttributes } from '../../../common';
import { TodoComboEmbeddableComponent } from './todo_combo_component';

export const TODO_COMBO_EMBEDDABLE = 'TODO_COMBO_EMBEDDABLE';

export type TodoComboInput = TodoComboValInput | TodoComboRefInput;

interface TodoComboValInput extends EmbeddableInput {
  inputType: 'value';
  attributes: TodoSavedObjectAttributes;
  search?: string;
}

interface TodoComboRefInput extends SavedObjectEmbeddableInput {
  inputType: 'reference';
  search?: string;
}

export interface TodoComboOutput extends EmbeddableOutput {
  hasMatch: boolean;
  savedAttributes?: TodoSavedObjectAttributes;
}

/**
 * Returns whether any attributes contain the search string.  If search is empty, true is returned. If
 * there are no savedAttributes, false is returned.
 * @param search - the search string
 * @param savedAttributes - the saved object attributes for the saved object with id `input.savedObjectId`
 */
function getHasMatch(search?: string, savedAttributes?: TodoSavedObjectAttributes): boolean {
  if (!search) return true;
  if (!savedAttributes) return false;
  return Boolean(
    (savedAttributes.task && savedAttributes.task.match(search)) ||
      (savedAttributes.title && savedAttributes.title.match(search))
  );
}

export class TodoComboEmbeddable extends Embeddable<TodoComboInput, TodoComboOutput> {
  public readonly type = TODO_COMBO_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;
  private savedObjectsClient: SavedObjectsClientContract;
  private savedObjectId?: string;

  constructor(
    initialInput: TodoComboInput,
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

    this.subscription = this.getInput$().subscribe(async () => {
      let savedAttributes: TodoSavedObjectAttributes | undefined;
      if (this.input.inputType === 'reference') {
        if (this.savedObjectId !== this.input.savedObjectId) {
          this.savedObjectId = this.input.savedObjectId;
          const todoSavedObject = await this.savedObjectsClient.get<TodoSavedObjectAttributes>(
            'todo',
            this.input.savedObjectId
          );
          savedAttributes = todoSavedObject?.attributes;
        }
      } else {
        this.savedObjectId = undefined;
        savedAttributes = this.input.attributes;
      }

      this.updateOutput({
        hasMatch: getHasMatch(this.input.search, savedAttributes),
        savedAttributes,
      });
    });
  }

  public render(node: HTMLElement) {
    this.node = node;
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    ReactDOM.render(<TodoComboEmbeddableComponent embeddable={this} />, node);
  }

  public async reload() {
    if (this.input.inputType === 'reference') {
      this.savedObjectId = this.input.savedObjectId;
      const todoSavedObject = await this.savedObjectsClient.get<TodoSavedObjectAttributes>(
        'todo',
        this.input.savedObjectId
      );
      const savedAttributes = todoSavedObject?.attributes;
      this.updateOutput({
        hasMatch: getHasMatch(this.input.search, savedAttributes),
        savedAttributes,
      });
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
