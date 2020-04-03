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
import { TodoSavedObjectAttributes, NOTE_SAVED_OBJECT, NoteSavedObjectAttributes } from '../common';

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

  await client.create<NoteSavedObjectAttributes>(
    NOTE_SAVED_OBJECT,
    {
      to: 'Sue',
      from: 'Bob',
      message: 'Remember to pick up more bleach.',
    },
    {
      id: 'sample-note-saved-object',
      overwrite,
    }
  );
}
