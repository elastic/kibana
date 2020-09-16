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

import { ISavedObjectTypeRegistry, SavedObject } from 'src/core/server';

export type ISavedObjectsManagement = PublicMethodsOf<SavedObjectsManagement>;

export class SavedObjectsManagement {
  constructor(private readonly registry: ISavedObjectTypeRegistry) {}

  public isImportAndExportable(type: string) {
    return this.registry.isImportableAndExportable(type);
  }

  public getDefaultSearchField(type: string) {
    return this.registry.getType(type)?.management?.defaultSearchField;
  }

  public getIcon(type: string) {
    return this.registry.getType(type)?.management?.icon;
  }

  public getTitle(savedObject: SavedObject) {
    const getTitle = this.registry.getType(savedObject.type)?.management?.getTitle;
    return getTitle ? getTitle(savedObject) : undefined;
  }

  public getEditUrl(savedObject: SavedObject) {
    const getEditUrl = this.registry.getType(savedObject.type)?.management?.getEditUrl;
    return getEditUrl ? getEditUrl(savedObject) : undefined;
  }

  public getInAppUrl(savedObject: SavedObject) {
    const getInAppUrl = this.registry.getType(savedObject.type)?.management?.getInAppUrl;
    return getInAppUrl ? getInAppUrl(savedObject) : undefined;
  }

  public getNamespaceType(savedObject: SavedObject) {
    return this.registry.getType(savedObject.type)?.namespaceType;
  }
}
