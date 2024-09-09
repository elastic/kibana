/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { SavedObjectDecoratorFactory } from './types';
import { SavedObjectKibanaServices, SavedObject } from '../../types';

export interface SavedObjectDecoratorConfig<T extends SavedObject = SavedObject> {
  /**
   * The id of the decorator
   */
  id: string;
  /**
   * Highest priority will be called **last**
   * (the decoration will be at the highest level)
   */
  priority: number;
  /**
   * The factory to use to create the decorator
   */
  factory: SavedObjectDecoratorFactory<T>;
}

export type ISavedObjectDecoratorRegistry = PublicMethodsOf<SavedObjectDecoratorRegistry>;

export class SavedObjectDecoratorRegistry {
  private readonly registry = new Map<string, SavedObjectDecoratorConfig<any>>();

  public register(config: SavedObjectDecoratorConfig<any>) {
    if (this.registry.has(config.id)) {
      throw new Error(`A decorator is already registered for id ${config.id}`);
    }
    if ([...this.registry.values()].find(({ priority }) => priority === config.priority)) {
      throw new Error(`A decorator is already registered for priority ${config.priority}`);
    }
    this.registry.set(config.id, config);
  }

  public getOrderedDecorators(services: SavedObjectKibanaServices) {
    return [...this.registry.values()]
      .sort((a, b) => a.priority - b.priority)
      .map(({ factory }) => factory(services));
  }
}
