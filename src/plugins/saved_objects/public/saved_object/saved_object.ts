/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * @name SavedObject
 *
 * NOTE: SavedObject seems to track a reference to an object in ES,
 * and surface methods for CRUD functionality (save and delete). This seems
 * similar to how Backbone Models work.
 *
 * This class seems to interface with ES primarily through the es Angular
 * service and the saved object api.
 */
import { SavedObject, SavedObjectConfig, SavedObjectKibanaServices } from '../types';
import { ISavedObjectDecoratorRegistry } from './decorators';
import { buildSavedObject } from './helpers/build_saved_object';

export function createSavedObjectClass(
  services: SavedObjectKibanaServices,
  decoratorRegistry: ISavedObjectDecoratorRegistry
) {
  /**
   * The SavedObject class is a base class for saved objects loaded from the server and
   * provides additional functionality besides loading/saving/deleting/etc.
   *
   * It is overloaded and configured to provide type-aware functionality.
   * @param {*} config
   */
  class SavedObjectClass {
    constructor(config: SavedObjectConfig = {}) {
      // @ts-ignore
      const self: SavedObject = this;
      buildSavedObject(self, config, services, decoratorRegistry.getOrderedDecorators(services));
    }
  }

  return SavedObjectClass as new (config: SavedObjectConfig) => SavedObject;
}
