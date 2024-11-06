/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BulkGetResult } from '@kbn/content-management-plugin/common';
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

class TodosStorage implements ContentStorage<Todo> {
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
    return {
      item: this.db.get(id)!,
    };
  }

  async bulkGet(ctx: StorageContext, ids: string[]): Promise<BulkGetResult<Todo>> {
    return {
      hits: ids.map((id) => ({ item: this.db.get(id)! })),
    };
  }

  async create(ctx: StorageContext, data: TodoCreateIn['data']): Promise<TodoCreateOut> {
    const todo: Todo = {
      ...data,
      completed: false,
      id: v4(),
    };

    this.db.set(todo.id, todo);

    return {
      item: todo,
    };
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

    return {
      item: updatedContent,
    };
  }

  async delete(ctx: StorageContext, id: string): Promise<TodoDeleteOut> {
    this.db.delete(id);
    return { success: true };
  }

  async search(
    ctx: StorageContext,
    _: TodoSearchIn['query'],
    options: TodoSearchIn['options']
  ): Promise<TodoSearchOut> {
    let hits = Array.from(this.db.values());

    if (options?.filter === 'todo') {
      hits = hits.filter((t) => !t.completed);
    }

    if (options?.filter === 'completed') {
      hits = hits.filter((t) => t.completed);
    }

    return {
      hits,
      pagination: {
        total: hits.length,
      },
    };
  }
}
