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

import { Plugin } from 'kibana/public';

export interface SavedObjectDefinition {
  type: string;
  urlFor: (id: string) => string;
  fieldOrder?: string[];
  mapping: object;
  searchSource: boolean;
  // confirm overwrite, id, attributes. Maps to calling applyESResp and save() on a saved object class
  // that has correct migration version and id.
  save: (options: any) => Promise<void>;
}

export interface SavedObjectsPluginSetup {
  register(definition: SavedObjectDefinition): void;
}

export interface SavedObjectsPluginStart {
  get(type: string): SavedObjectDefinition | undefined;
  getAll(): SavedObjectDefinition[];
}

export class SavedObjectsPlugin
  implements Plugin<SavedObjectsPluginSetup, SavedObjectsPluginStart> {
  savedObjectDefinitions = new Map<string, SavedObjectDefinition>();

  setup() {
    return {
      register: (savedObjectDefinition: SavedObjectDefinition) => {
        if (this.savedObjectDefinitions.has(savedObjectDefinition.type)) {
          throw new Error(
            `Saved object with type ${savedObjectDefinition.type} already registered.`
          );
        }
        this.savedObjectDefinitions.set(savedObjectDefinition.type, savedObjectDefinition);
      },
    };
  }

  start() {
    return {
      get: (type: string) => this.savedObjectDefinitions.get(type),
      getAll: () => [...this.savedObjectDefinitions.values()],
    };
  }
}
