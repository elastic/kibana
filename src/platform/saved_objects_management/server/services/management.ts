/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { ISavedObjectTypeRegistry, SavedObject } from '@kbn/core/server';

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

  public isHidden(savedObject: SavedObject) {
    return this.registry.getType(savedObject.type)?.hidden ?? false;
  }
}
