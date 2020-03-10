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
import { i18n } from '@kbn/i18n';
import { SavedObjectsClientContract, OverlayStart } from 'kibana/public';
import { TodoSavedObjectAttributes } from '../../common';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import {
  IContainer,
  SavedObjectEmbeddableFactory,
  EmbeddableStart,
  ErrorEmbeddable,
} from '../../../../src/plugins/embeddable/public';
import {
  TodoSoEmbeddable,
  TODO_SO_EMBEDDABLE,
  TodoSoEmbeddableInput,
  TodoSoEmbeddableOutput,
} from './todo_so_embeddable';
import { CreateEditTodoComponent } from './create_edit_todo_component';

interface StartServices {
  getEmbeddableFactory: EmbeddableStart['getEmbeddableFactory'];
  savedObjectsClient: SavedObjectsClientContract;
  openModal: OverlayStart['openModal'];
}

export class TodoSoEmbeddableFactory extends SavedObjectEmbeddableFactory<
  TodoSoEmbeddableInput,
  TodoSoEmbeddableOutput,
  TodoSoEmbeddable,
  TodoSavedObjectAttributes
> {
  public readonly type = TODO_SO_EMBEDDABLE;

  constructor(private getStartServices: () => Promise<StartServices>) {
    super({
      savedObjectMetaData: {
        name: 'Todo',
        includeFields: ['task'],
        type: 'todo',
        getIconForSavedObject: () => 'pencil',
      },
    });
  }

  public async isEditable() {
    return true;
  }

  canSave = (todoEmbeddable: TodoSoEmbeddable) => {
    const { attributes } = todoEmbeddable.getInput();
    const { savedAttributes } = todoEmbeddable.getOutput();

    if (!savedAttributes && attributes && attributes.task) return true;

    if (savedAttributes && !_.isEqual(savedAttributes, attributes)) return true;

    return false;
  };

  save = async (todoEmbeddable: TodoSoEmbeddable) => {
    const { savedObjectsClient } = await this.getStartServices();
    const { attributes, savedObjectId } = todoEmbeddable.getInput();
    if (!todoEmbeddable.getInput().savedObjectId) {
      return savedObjectsClient.create(this.savedObjectMetaData.type, {
        ...attributes,
      });
    } else if (savedObjectId) {
      return savedObjectsClient.update(this.savedObjectMetaData.type, savedObjectId, {
        ...(todoEmbeddable.getOutput().savedAttributes ?? {}),
        ...attributes,
      });
    }
    throw new Error('something went wrong');
  };

  public createFromSavedObject = async (
    savedObjectId: string,
    input: Partial<TodoSoEmbeddableInput> & { id: string },
    parent?: IContainer
  ): Promise<TodoSoEmbeddable | ErrorEmbeddable> => {
    const { savedObjectsClient } = await this.getStartServices();
    const todoSavedObject = await savedObjectsClient.get<TodoSavedObjectAttributes>(
      'todo',
      savedObjectId
    );
    return this.create({ ...input, savedObjectId, attributes: todoSavedObject.attributes }, parent);
  };

  public async create(initialInput: TodoSoEmbeddableInput, parent?: IContainer) {
    const { savedObjectsClient } = await this.getStartServices();
    return new TodoSoEmbeddable(initialInput, {
      parent,
      savedObjectsClient,
    });
  }

  public getDisplayName() {
    return i18n.translate('embeddableExamples.todo.displayName', {
      defaultMessage: 'Todo item (optionally backed by saved object)',
    });
  }

  /**
   * This function is used when dynamically creating a new embeddable to add to a
   * container. Some input may be inherited from the container, but not all. This can be
   * used to collect specific embeddable input that the container will not provide, like
   * in this case, the task string.
   */
  public async getExplicitInput(): Promise<{
    savedObjectId?: string;
    attributes?: { task: string };
  }> {
    const { openModal, savedObjectsClient } = await this.getStartServices();
    return new Promise<{
      savedObjectId?: string;
      attributes?: { task: string };
    }>(resolve => {
      const onSave = async (attributes: TodoSavedObjectAttributes, includeInLibrary: boolean) => {
        if (includeInLibrary) {
          const savedItem = await savedObjectsClient.create('todo', attributes);
          resolve({ savedObjectId: savedItem.id });
        } else {
          resolve({ attributes });
        }
      };
      const overlay = openModal(
        toMountPoint(
          <CreateEditTodoComponent
            onSave={(attributes: TodoSavedObjectAttributes, includeInLibrary: boolean) => {
              onSave(attributes, includeInLibrary);
              overlay.close();
            }}
          />
        )
      );
    });
  }
}
