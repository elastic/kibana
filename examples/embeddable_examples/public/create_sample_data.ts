/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract } from '@kbn/core/public';
import { TodoSavedObjectAttributes, BookSavedObjectAttributes, BOOK_SAVED_OBJECT } from '../common';

export async function createSampleData(client: SavedObjectsClientContract, overwrite = true) {
  await client.create<TodoSavedObjectAttributes>(
    'todo',
    {
      task: 'Take the garbage out',
      title: 'Garbage',
      icon: 'trash',
    },
    {
      id: 'sample-todo-saved-object',
      overwrite,
    }
  );

  await client.create<BookSavedObjectAttributes>(
    BOOK_SAVED_OBJECT,
    {
      title: 'Pillars of the Earth',
      author: 'Ken Follett',
      readIt: true,
    },
    {
      id: 'sample-book-saved-object',
      overwrite,
    }
  );
}
