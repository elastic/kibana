/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { deepFreeze } from '@kbn/std';
import { SavedObjectsType } from './types';

/**
 * See {@link SavedObjectTypeRegistry} for documentation.
 *
 * @public
 */
export type ISavedObjectTypeRegistry = Omit<SavedObjectTypeRegistry, 'registerType'>;

/**
 * Registry holding information about all the registered {@link SavedObjectsType | saved object types}.
 *
 * @public
 */
export class SavedObjectTypeRegistry {
  private readonly types = new Map<string, SavedObjectsType>();

  /**
   * Register a {@link SavedObjectsType | type} inside the registry.
   * A type can only be registered once. subsequent calls with the same type name will throw an error.
   */
  public registerType(type: SavedObjectsType) {
    if (this.types.has(type.name)) {
      throw new Error(`Type '${type.name}' is already registered`);
    }
    this.types.set(type.name, deepFreeze(type));
  }

  /**
   * Return the {@link SavedObjectsType | type} definition for given type name.
   */
  public getType(type: string) {
    return this.types.get(type);
  }

  /**
   * Returns all visible {@link SavedObjectsType | types}.
   *
   * A visible type is a type that doesn't explicitly define `hidden=true` during registration.
   */
  public getVisibleTypes() {
    return [...this.types.values()].filter((type) => !this.isHidden(type.name));
  }

  /**
   * Return all {@link SavedObjectsType | types} currently registered, including the hidden ones.
   *
   * To only get the visible types (which is the most common use case), use `getVisibleTypes` instead.
   */
  public getAllTypes() {
    return [...this.types.values()];
  }

  /**
   * Return all {@link SavedObjectsType | types} currently registered that are importable/exportable.
   */
  public getImportableAndExportableTypes() {
    return this.getAllTypes().filter((type) => this.isImportableAndExportable(type.name));
  }

  /**
   * Returns whether the type is namespace-agnostic (global);
   * resolves to `false` if the type is not registered
   */
  public isNamespaceAgnostic(type: string) {
    return this.types.get(type)?.namespaceType === 'agnostic';
  }

  /**
   * Returns whether the type is single-namespace (isolated);
   * resolves to `true` if the type is not registered
   */
  public isSingleNamespace(type: string) {
    // in the case we somehow registered a type with an invalid `namespaceType`, treat it as single-namespace
    return !this.isNamespaceAgnostic(type) && !this.isMultiNamespace(type);
  }

  /**
   * Returns whether the type is multi-namespace (shareable);
   * resolves to `false` if the type is not registered
   */
  public isMultiNamespace(type: string) {
    return this.types.get(type)?.namespaceType === 'multiple';
  }

  /**
   * Returns the `hidden` property for given type, or `false` if
   * the type is not registered.
   */
  public isHidden(type: string) {
    return this.types.get(type)?.hidden ?? false;
  }

  /**
   * Returns the `indexPattern` property for given type, or `undefined` if
   * the type is not registered.
   */
  public getIndex(type: string) {
    return this.types.get(type)?.indexPattern;
  }

  /**
   * Returns the `management.importableAndExportable` property for given type, or
   * `false` if the type is not registered or does not define a management section.
   */
  public isImportableAndExportable(type: string) {
    return this.types.get(type)?.management?.importableAndExportable ?? false;
  }
}
