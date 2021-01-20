/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { SavedObjectLoader } from '../../../saved_objects/public';

export interface SavedObjectsManagementServiceRegistryEntry {
  id: string;
  service: SavedObjectLoader;
  title: string;
}

export type ISavedObjectsManagementServiceRegistry = PublicMethodsOf<SavedObjectsManagementServiceRegistry>;

export class SavedObjectsManagementServiceRegistry {
  private readonly registry = new Map<string, SavedObjectsManagementServiceRegistryEntry>();

  public register(entry: SavedObjectsManagementServiceRegistryEntry) {
    if (this.registry.has(entry.id)) {
      throw new Error('');
    }
    this.registry.set(entry.id, entry);
  }

  public all(): SavedObjectsManagementServiceRegistryEntry[] {
    return [...this.registry.values()];
  }

  public get(id: string): SavedObjectsManagementServiceRegistryEntry | undefined {
    return this.registry.get(id);
  }
}
