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
} from '../../../../src/plugins/embeddable/public';
import { TodoEmbeddableComponent } from './todo_component';
import { TodoSavedObjectAttributes } from '../../common';

export const TODO_EMBEDDABLE = 'TODO_EMBEDDABLE';

export interface TodoComboInput extends EmbeddableInput {
  attributes: TodoSavedObjectAttributes;
  search?: string;
}

export interface TodoComboRefInput extends SavedObjectEmbeddableInput {
  search?: string;
}

export interface TodoComboOutput extends EmbeddableOutput {
  hasMatch: boolean;
}

function getOutput(input: TodoComboInput | TodoComboRefInput): TodoComboOutput {
  return {
    hasMatch: input.search
      ? Boolean(input.task.match(input.search) || (input.title && input.title.match(input.search)))
      : true,
  };
}

export class TodoComboEmbeddable extends Embeddable<
  TodoComboInput | TodoComboRefInput,
  TodoComboOutput
> {
  // The type of this embeddable. This will be used to find the appropriate factory
  // to instantiate this kind of embeddable.
  public readonly type = TODO_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;
  private savedObjectsClient: SavedObjectsClientContract;
  private savedObjectId?: string;

  constructor(
    initialInput: TodoInput | TodoRefInput,
    {
      parent,
      savedObjectsClient,
    }: {
      parent?: IContainer;
      savedObjectsClient: SavedObjectsClientContract;
    }
  ) {
    super(initialInput, getOutput(initialInput), parent);
    this.savedObjectsClient = savedObjectsClient;

    this.subscription = this.getInput$().subscribe(async () => {
      // There is a little more work today for this embeddable because it has
      // more output it needs to update in response to input state changes.
      let savedAttributes: TodoSavedObjectAttributes | undefined;

      // Since this is an expensive task, we save a local copy of the previous
      // savedObjectId locally and only retrieve the new saved object if the id
      // actually changed.
      if (this.savedObjectId !== this.input.savedObjectId) {
        this.savedObjectId = this.input.savedObjectId;
        const todoSavedObject = await this.savedObjectsClient.get<TodoSavedObjectAttributes>(
          'todo',
          this.input.savedObjectId
        );
        savedAttributes = todoSavedObject?.attributes;
      }

      // The search string might have changed as well so we need to make sure we recalculate
      // hasMatch.
      this.updateOutput(getOutput(this.input));

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
