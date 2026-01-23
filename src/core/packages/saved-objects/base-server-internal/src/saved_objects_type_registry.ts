/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { deepFreeze } from '@kbn/std';
import type { SavedObjectsType, ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';

export interface SavedObjectTypeRegistryConfig {
  legacyTypes?: string[];
}

export interface ISavedObjectTypeRegistryInternal extends ISavedObjectTypeRegistry {
  /**
   * Register a {@link SavedObjectsType | type} inside the registry.
   * A type can only be registered once. subsequent calls with the same type name will throw an error.
   *
   * @internal
   */
  registerType(type: SavedObjectsType): void;
  /**
   * Sets whether access control is enabled
   *
   * @internal
   */
  setAccessControlEnabled(enabled: boolean): void;
  /**
   * Gets whether access control is enabled
   *
   * @internal
   */
  isAccessControlEnabled(): boolean;
}

/**
 * Core internal implementation of {@link ISavedObjectTypeRegistry}.
 *
 * @internal should only be used outside of Core for testing purposes.
 */
export class SavedObjectTypeRegistry implements ISavedObjectTypeRegistryInternal {
  private readonly types = new Map<string, SavedObjectsType>();
  private readonly legacyTypesMap: Set<string>;

  private accessControlEnabled: boolean = true;

  constructor({ legacyTypes = [] }: SavedObjectTypeRegistryConfig = {}) {
    this.legacyTypesMap = new Set(legacyTypes);
  }

  /** {@inheritDoc ISavedObjectTypeRegistryInternal.registerType} */

  public registerType(type: SavedObjectsType) {
    if (this.types.has(type.name)) {
      throw new Error(`Type '${type.name}' is already registered`);
    }
    if (this.legacyTypesMap.has(type.name)) {
      throw new Error(
        `Type '${type.name}' can't be used because it's been added to the legacy types`
      );
    }

    if (
      type.supportsAccessControl &&
      type.namespaceType !== 'multiple' &&
      type.namespaceType !== 'multiple-isolated'
    ) {
      throw new Error(
        `Type ${type.name}: Cannot specify 'supportsAccessControl' as 'true' unless 'namespaceType' is either 'multiple' or 'multiple-isolated'.`
      );
    }
    const supportsAccessControl = this.accessControlEnabled ? type.supportsAccessControl : false;

    const typeWithAccessControl = { ...type, supportsAccessControl };

    validateType(type);

    if (process.env.NODE_ENV !== 'production') {
      deepFreeze(typeWithAccessControl);
    }
    this.types.set(type.name, typeWithAccessControl);
  }

  /** {@inheritDoc ISavedObjectTypeRegistry.getLegacyTypes} */
  public getLegacyTypes() {
    return Array.from(this.legacyTypesMap);
  }

  /** {@inheritDoc ISavedObjectTypeRegistry.getType} */
  public getType(type: string) {
    return this.types.get(type);
  }

  /** {@inheritDoc ISavedObjectTypeRegistry.getVisibleTypes} */
  public getVisibleTypes() {
    return [...this.types.values()].filter((type) => !this.isHidden(type.name));
  }

  /** {@inheritDoc ISavedObjectTypeRegistry.getVisibleToHttpApisTypes}  */
  public getVisibleToHttpApisTypes() {
    return [...this.types.values()].filter((type) => !this.isHiddenFromHttpApis(type.name));
  }

  /** {@inheritDoc ISavedObjectTypeRegistry.getAllTypes} */
  public getAllTypes() {
    return [...this.types.values()];
  }

  /** {@inheritDoc ISavedObjectTypeRegistry.getImportableAndExportableTypes} */
  public getImportableAndExportableTypes() {
    return this.getAllTypes().filter((type) => this.isImportableAndExportable(type.name));
  }

  /** {@inheritDoc ISavedObjectTypeRegistry.isNamespaceAgnostic} */
  public isNamespaceAgnostic(type: string) {
    return this.types.get(type)?.namespaceType === 'agnostic';
  }

  /** {@inheritDoc ISavedObjectTypeRegistry.isSingleNamespace} */
  public isSingleNamespace(type: string) {
    // in the case we somehow registered a type with an invalid `namespaceType`, treat it as single-namespace
    return !this.isNamespaceAgnostic(type) && !this.isMultiNamespace(type);
  }

  /** {@inheritDoc ISavedObjectTypeRegistry.isMultiNamespace} */
  public isMultiNamespace(type: string) {
    const namespaceType = this.types.get(type)?.namespaceType;
    return namespaceType === 'multiple' || namespaceType === 'multiple-isolated';
  }

  /** {@inheritDoc ISavedObjectTypeRegistry.isShareable} */
  public isShareable(type: string) {
    return this.types.get(type)?.namespaceType === 'multiple';
  }

  /** {@inheritDoc ISavedObjectTypeRegistry.isHidden} */
  public isHidden(type: string) {
    return this.types.get(type)?.hidden ?? false;
  }

  /** {@inheritDoc ISavedObjectTypeRegistry.isHiddenFromHttpApi} */
  public isHiddenFromHttpApis(type: string) {
    return !!this.types.get(type)?.hiddenFromHttpApis;
  }

  /** {@inheritDoc ISavedObjectTypeRegistry.getType} */
  public getIndex(type: string) {
    return this.types.get(type)?.indexPattern;
  }

  /** {@inheritDoc ISavedObjectTypeRegistry.isImportableAndExportable} */
  public isImportableAndExportable(type: string) {
    return this.types.get(type)?.management?.importableAndExportable ?? false;
  }

  public getNameAttribute(type: string) {
    return this.types.get(type)?.nameAttribute || 'unknown';
  }

  public supportsAccessControl(type: string): boolean {
    return this.types.get(type)?.supportsAccessControl ?? false;
  }

  /** {@inheritDoc ISavedObjectTypeRegistryInternal.setAccessControlEnabled} */
  public setAccessControlEnabled(enabled: boolean) {
    this.accessControlEnabled = enabled;
  }

  /** {@inheritDoc ISavedObjectTypeRegistryInternal.isAccessControlEnabled} */
  public isAccessControlEnabled() {
    return this.accessControlEnabled;
  }
}

const validateType = ({ name, management, hidden, hiddenFromHttpApis }: SavedObjectsType) => {
  if (management) {
    if (management.onExport && !management.importableAndExportable) {
      throw new Error(
        `Type ${name}: 'management.importableAndExportable' must be 'true' when specifying 'management.onExport'`
      );
    }
    if (management.visibleInManagement !== undefined && !management.importableAndExportable) {
      throw new Error(
        `Type ${name}: 'management.importableAndExportable' must be 'true' when specifying 'management.visibleInManagement'`
      );
    }
  }
  // throw error if a type is registered as `hidden:true` and `hiddenFromHttpApis:false` explicitly
  if (hidden === true && hiddenFromHttpApis === false) {
    throw new Error(
      `Type ${name}: 'hiddenFromHttpApis' cannot be 'false' when specifying 'hidden' as 'true'`
    );
  }
};
