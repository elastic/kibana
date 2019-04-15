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

interface SavedObjectsSchemaTypeDefinition {
  isNamespaceAgnostic: boolean;
  hidden?: boolean;
  isImportableAndExportable?: boolean;
  titleSearchField?: string;
  icon?: string;
  getTitle?: (savedObject: SavedObject) => string;
  getEditUrl?: (savedObject: SavedObject) => string;
  getInAppUrl?: (savedObject: SavedObject) => string;
}

export interface SavedObjectsSchemaDefinition {
  [key: string]: SavedObjectsSchemaTypeDefinition;
}

export class SavedObjectsSchema {
  private readonly definition?: SavedObjectsSchemaDefinition;
  constructor(schemaDefinition?: SavedObjectsSchemaDefinition) {
    this.definition = schemaDefinition;
  }

  public isHiddenType(type: string) {
    if (this.definition && this.definition.hasOwnProperty(type)) {
      return Boolean(this.definition[type].hidden);
    }

    return false;
  }

  public isNamespaceAgnostic(type: string) {
    // if no plugins have registered a uiExports.savedObjectSchemas,
    // this.schema will be undefined, and no types are namespace agnostic
    if (!this.definition) {
      return false;
    }

    const typeSchema = this.definition[type];
    if (!typeSchema) {
      return false;
    }
    return Boolean(typeSchema.isNamespaceAgnostic);
  }

  public isImportAndExportable(type: string) {
    // import and exportable by default unless isImportableAndExportable set explicitly to false
    if (this.definition && this.definition.hasOwnProperty(type)) {
      return this.definition[type].isImportableAndExportable !== false;
    }

    return true;
  }

  public getTitleSearchField(type: string) {
    if (this.definition && this.definition.hasOwnProperty(type)) {
      return this.definition[type].titleSearchField;
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
