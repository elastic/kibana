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

import { SavedObject } from '../service';

interface SavedObjectsManagementTypeDefinition {
  isImportableAndExportable?: boolean;
  defaultSearchField?: string;
  icon?: string;
  getTitle?: (savedObject: SavedObject) => string;
  getEditUrl?: (savedObject: SavedObject) => string;
  getInAppUrl?: (savedObject: SavedObject) => { path: string; uiCapabilitiesPath: string };
}

export interface SavedObjectsManagementDefinition {
  [key: string]: SavedObjectsManagementTypeDefinition;
}

export class SavedObjectsManagement {
  private readonly definition?: SavedObjectsManagementDefinition;

  constructor(managementDefinition?: SavedObjectsManagementDefinition) {
    this.definition = managementDefinition;
  }

  public isImportAndExportable(type: string) {
    if (this.definition && this.definition.hasOwnProperty(type)) {
      return this.definition[type].isImportableAndExportable === true;
    }

    return false;
  }

  public getDefaultSearchField(type: string) {
    if (this.definition && this.definition.hasOwnProperty(type)) {
      return this.definition[type].defaultSearchField;
    }
  }

  public getIcon(type: string) {
    if (this.definition && this.definition.hasOwnProperty(type)) {
      return this.definition[type].icon;
    }
  }

  public getTitle(savedObject: SavedObject) {
    const { type } = savedObject;
    if (this.definition && this.definition.hasOwnProperty(type) && this.definition[type].getTitle) {
      const { getTitle } = this.definition[type];
      if (getTitle) {
        return getTitle(savedObject);
      }
    }
  }

  public getEditUrl(savedObject: SavedObject) {
    const { type } = savedObject;
    if (this.definition && this.definition.hasOwnProperty(type)) {
      const { getEditUrl } = this.definition[type];
      if (getEditUrl) {
        return getEditUrl(savedObject);
      }
    }
  }

  public getInAppUrl(savedObject: SavedObject) {
    const { type } = savedObject;
    if (this.definition && this.definition.hasOwnProperty(type)) {
      const { getInAppUrl } = this.definition[type];
      if (getInAppUrl) {
        return getInAppUrl(savedObject);
      }
    }
  }
}
