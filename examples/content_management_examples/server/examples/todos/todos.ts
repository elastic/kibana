/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ContentStorage,
  StorageContext,
  ContentManagementServerSetup,
} from '@kbn/content-management-plugin/server';
import { v4 } from 'uuid';
import {
  Todo,
  TODO_CONTENT_ID,
  TodoSearchOut,
  TodoCreateOut,
  TodoUpdateOut,
  TodoDeleteOut,
  TodoGetOut,
  TodoUpdateIn,
  TodoSearchIn,
  TodoCreateIn,
} from '../../../common/examples/todos';

export const registerTodoContentType = ({
  contentManagement,
}: {
  contentManagement: ContentManagementServerSetup;
}) => {
  contentManagement.register({
    id: TODO_CONTENT_ID,
    storage: new TodosStorage(),
    version: {
      latest: 1,
    },
  });
};

class TodosStorage implements ContentStorage {
  private db: Map<string, Todo> = new Map();

  constructor() {
    const id1 = v4();
    this.db.set(id1, {
      id: id1,
      title: 'Learn Elasticsearch',
      completed: true,
    });
    const id2 = v4();
    this.db.set(id2, {
      id: id2,
      title: 'Learn Kibana',
      completed: false,
    });
  }

  async get(ctx: StorageContext, id: string): Promise<TodoGetOut> {
    return this.db.get(id)!;
  }

  async bulkGet(ctx: StorageContext, ids: string[]): Promise<TodoGetOut[]> {
    return ids.map((id) => this.db.get(id)!);
  }

  async create(ctx: StorageContext, data: TodoCreateIn['data']): Promise<TodoCreateOut> {
    const todo: Todo = {
      ...data,
      completed: false,
      id: v4(),
    };

    this.db.set(todo.id, todo);

    return todo;
  }

  async update(
    ctx: StorageContext,
    id: string,
    data: TodoUpdateIn['data']
  ): Promise<TodoUpdateOut> {
    const content = this.db.get(id);
    if (!content) {
      throw new Error(`Content to update not found [${id}].`);
    }

    const updatedContent = {
      ...content,
      ...data,
    };

    this.db.set(id, updatedContent);

    return updatedContent;
  }

  async delete(ctx: StorageContext, id: string): Promise<TodoDeleteOut> {
    this.db.delete(id);
  }

  async search(ctx: StorageContext, query: TodoSearchIn['query']): Promise<TodoSearchOut> {
    const hits = Array.from(this.db.values());
    if (query.filter === 'todo') return { hits: hits.filter((t) => !t.completed) };
    if (query.filter === 'completed') return { hits: hits.filter((t) => t.completed) };
    return { hits };
  }
}
