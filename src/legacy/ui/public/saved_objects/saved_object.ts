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
import _ from 'lodash';
import { PromiseService } from 'ui/promises';
import { buildSavedObject } from 'ui/saved_objects/helpers/build_saved_object';
import { SavedObjectsClientProvider } from './saved_objects_client_provider';
import { IndexPatterns } from '../../../core_plugins/data/public/index_patterns/index_patterns';

export interface SaveOptions {
  confirmOverwrite: boolean;
  isTitleDuplicateConfirmed: boolean;
  onTitleDuplicate: () => void;
}

export interface SavedObject {
  save: (saveOptions: SaveOptions) => Promise<string>;
  copyOnSave: boolean;
  id?: string;
}

export function SavedObjectProvider(
  Promise: PromiseService,
  Private: any,
  confirmModalPromise: any,
  indexPatterns: IndexPatterns
) {
  const savedObjectsClient = Private(SavedObjectsClientProvider);

  /**
   * The SavedObject class is a base class for saved objects loaded from the server and
   * provides additional functionality besides loading/saving/deleting/etc.
   *
   * It is overloaded and configured to provide type-aware functionality.
   * To just retrieve the attributes of saved objects, it is recommended to use SavedObjectLoader
   * which returns instances of SimpleSavedObject which don't introduce additional type-specific complexity.
   * @param {*} config
   */
  function SavedObject(config: any) {
    if (!_.isObject(config)) config = {};

    return buildSavedObject(
      // @ts-ignore
      this,
      config,
      indexPatterns,
      savedObjectsClient,
      confirmModalPromise,
      Promise
    );
  }

  return SavedObject;
}
