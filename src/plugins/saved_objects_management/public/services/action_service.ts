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

import { SavedObjectsManagementAction } from './types';

export interface SavedObjectsManagementActionServiceSetup {
  /**
   * register given action in the registry.
   */
  register: (action: SavedObjectsManagementAction) => void;
}

export interface SavedObjectsManagementActionServiceStart {
  /**
   * return true if the registry contains given action, false otherwise.
   */
  has: (actionId: string) => boolean;
  /**
   * return all {@link SavedObjectsManagementAction | actions} currently registered.
   */
  getAll: () => SavedObjectsManagementAction[];
}

export class SavedObjectsManagementActionService {
  private readonly actions = new Map<string, SavedObjectsManagementAction>();

  setup(): SavedObjectsManagementActionServiceSetup {
    return {
      register: (action) => {
        if (this.actions.has(action.id)) {
          throw new Error(`Saved Objects Management Action with id '${action.id}' already exists`);
        }
        this.actions.set(action.id, action);
      },
    };
  }

  start(): SavedObjectsManagementActionServiceStart {
    return {
      has: (actionId) => this.actions.has(actionId),
      getAll: () => [...this.actions.values()],
    };
  }
}
