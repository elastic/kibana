/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { SavedObjectsClientContract } from '@kbn/core/public';
import {
  IContainer,
  EmbeddableStart,
  ErrorEmbeddable,
  EmbeddableFactoryDefinition,
  EmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { TodoSavedObjectAttributes } from '../../common';
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
    >
{
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
