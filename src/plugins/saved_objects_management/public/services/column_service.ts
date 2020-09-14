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

import { SavedObjectsManagementColumn } from './types';

export interface SavedObjectsManagementColumnServiceSetup {
  /**
   * register given column in the registry.
   */
  register: (column: SavedObjectsManagementColumn<unknown>) => void;
}

export interface SavedObjectsManagementColumnServiceStart {
  /**
   * return all {@link SavedObjectsManagementColumn | columns} currently registered.
   */
  getAll: () => Array<SavedObjectsManagementColumn<unknown>>;
}

export class SavedObjectsManagementColumnService {
  private readonly columns = new Map<string, SavedObjectsManagementColumn<unknown>>();

  setup(): SavedObjectsManagementColumnServiceSetup {
    return {
      register: (column) => {
        if (this.columns.has(column.id)) {
          throw new Error(`Saved Objects Management Column with id '${column.id}' already exists`);
        }
        this.columns.set(column.id, column);
      },
    };
  }

  start(): SavedObjectsManagementColumnServiceStart {
    return {
      getAll: () => [...this.columns.values()],
    };
  }
}
