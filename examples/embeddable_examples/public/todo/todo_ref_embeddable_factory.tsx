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
import { i18n } from '@kbn/i18n';
import { SavedObjectsClientContract } from 'kibana/public';
import { TodoSavedObjectAttributes } from 'examples/embeddable_examples/common';
import {
  IContainer,
  EmbeddableStart,
  ErrorEmbeddable,
  EmbeddableFactoryDefinition,
  EmbeddableFactory,
} from '../../../../src/plugins/embeddable/public';
import {
  TodoRefEmbeddable,
  TODO_REF_EMBEDDABLE,
  TodoRefInput,
  TodoRefOutput,
} from './todo_ref_embeddable';

interface StartServices {
  getEmbeddableFactory: EmbeddableStart['getEmbeddableFactory'];
  savedObjectsClient: SavedObjectsClientContract;
}

export type TodoRefEmbeddableFactory = EmbeddableFactory<
  TodoRefInput,
  TodoRefOutput,
  TodoRefEmbeddable,
  TodoSavedObjectAttributes
>;

export class TodoRefEmbeddableFactoryDefinition
  implements
    EmbeddableFactoryDefinition<
      TodoRefInput,
      TodoRefOutput,
      TodoRefEmbeddable,
      TodoSavedObjectAttributes
    > {
  public readonly type = TODO_REF_EMBEDDABLE;
  public readonly savedObjectMetaData = {
    name: 'Todo',
    includeFields: ['task', 'icon', 'title'],
    type: 'todo',
    getIconForSavedObject: () => 'pencil',
  };

  constructor(private getStartServices: () => Promise<StartServices>) {}

  public async isEditable() {
    return true;
  }

  public createFromSavedObject = (
    savedObjectId: string,
    input: Partial<TodoRefInput> & { id: string },
    parent?: IContainer
  ): Promise<TodoRefEmbeddable | ErrorEmbeddable> => {
    return this.create({ ...input, savedObjectId }, parent);
  };

  public async create(input: TodoRefInput, parent?: IContainer) {
    const { savedObjectsClient } = await this.getStartServices();
    return new TodoRefEmbeddable(input, {
      parent,
      savedObjectsClient,
    });
  }

  public getDisplayName() {
    return i18n.translate('embeddableExamples.todo.displayName', {
      defaultMessage: 'Todo (by reference)',
    });
  }
}
