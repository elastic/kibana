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

import { SavedObject, SavedObjectKibanaServices, SavedObjectConfig } from '../../types';

export interface SavedObjectDecorator<T extends SavedObject = SavedObject> {
  /**
   * Id of the decorator
   */
  getId(): string;

  /**
   * Decorate the saved object provided config. This can be used to enhance or alter the object's provided
   * configuration.
   */
  decorateConfig: (config: SavedObjectConfig) => void;
  /**
   * Decorate the saved object instance. Can be used to add additional methods to it.
   *
   * @remarks This will be called before the internal constructor of the object, meaning that
   * wrapping existing methods is not possible (and is not a desired pattern).
   */
  decorateObject: (object: T) => void;
}

export type SavedObjectDecoratorFactory<T extends SavedObject = SavedObject> = (
  services: SavedObjectKibanaServices
) => SavedObjectDecorator<T>;
