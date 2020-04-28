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

import { SavedObjectsManagementAction } from './action_types';

export type ISavedObjectsManagementActionRegistry = PublicMethodsOf<
  SavedObjectsManagementActionRegistry
>;

export class SavedObjectsManagementActionRegistry {
  private readonly actions = new Map<string, SavedObjectsManagementAction>();

  /**
   * register given action in the registry.
   */
  register(action: SavedObjectsManagementAction) {
    if (this.actions.has(action.id)) {
      throw new Error(`Saved Objects Management Action with id '${action.id}' already exists`);
    }
    this.actions.set(action.id, action);
  }

  /**
   * return true if the registry contains given action, false otherwise.
   */
  has(actionId: string) {
    return this.actions.has(actionId);
  }

  /**
   * return all {@link SavedObjectsManagementAction | actions} currently registered.
   */
  getAll() {
    return [...this.actions.values()];
  }
}
