/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
