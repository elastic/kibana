/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
