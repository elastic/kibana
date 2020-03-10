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

import { SavedObjectsClientContract } from 'kibana/public';
import { PanelState } from 'src/plugins/embeddable/public';
import { TodoSavedObjectAttributes, SearchableListSavedObjectAttributes } from '../common';
import { TODO_SO_EMBEDDABLE } from './todo_saved_object';

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

  await client.create<TodoSavedObjectAttributes>(
    'todo',
    {
      task: 'Disinfect the house. Spare no bugs!',
      title: 'Disinfect',
      icon: 'bug',
    },
    {
      id: 'sample-todo-saved-object-2',
      overwrite,
    }
  );

  const panels: { [key: string]: PanelState } = {
    '1': {
      type: TODO_SO_EMBEDDABLE,
      explicitInput: {
        id: '1',
        savedObjectId: 'sample-todo-saved-object',
      },
    },
    '2': {
      type: TODO_SO_EMBEDDABLE,
      explicitInput: {
        id: '2',
        task: 'Sweep & mop the floors',
        title: 'Floors',
        icon: 'broom',
      },
    },
    '3': {
      type: TODO_SO_EMBEDDABLE,
      explicitInput: {
        id: '3',
        savedObjectId: 'sample-todo-saved-object-2',
      },
    },
  };

  await client.create<SearchableListSavedObjectAttributes>(
    'list',
    {
      panelsJSON: JSON.stringify(panels),
      title: 'My todo list',
      search: 'foo',
    },
    {
      id: 'sample-list-saved-object',
      overwrite,
      references: [
        { name: 'sample-todo-saved-object-2', id: 'sample-todo-saved-object-2', type: 'todo' },
        { name: 'sample-todo-saved-object', id: 'sample-todo-saved-object', type: 'todo' },
      ],
    }
  );
}
