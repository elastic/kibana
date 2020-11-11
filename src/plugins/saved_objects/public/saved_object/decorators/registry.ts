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
