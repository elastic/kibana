/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from './saved_objects_type';
/**
 * Registry holding information about all the registered {@link SavedObjectsType | saved object types}.
 */
export interface ISavedObjectTypeRegistry {
  /**
   * Return the {@link SavedObjectsType | type} definition for given type name.
   */
  getType(type: string): SavedObjectsType | undefined;

  /**
   * Returns all visible {@link SavedObjectsType | types}.
   *
   * A visible type is a type that doesn't explicitly define `hidden=true` during registration.
   */
  getVisibleTypes(): SavedObjectsType[];

  /**
   * Returns all visible {@link SavedObjectsType | types} exposed to the global SO HTTP APIs
   *
   * A visibleToHttpApis type is a type that doesn't explicitly define `hidden=true` nor `hiddenFromHttpApis=true` during registration.
   */
  getVisibleToHttpApisTypes(): SavedObjectsType[];

  /**
   * Return all {@link SavedObjectsType | types} currently registered, including the hidden ones.
   *
   * To only get the visible types (which is the most common use case), use `getVisibleTypes` instead.
   */
  getAllTypes(): SavedObjectsType[];

  /**
   * Return all {@link SavedObjectsType | types} currently registered that are importable/exportable.
   */
  getImportableAndExportableTypes(): SavedObjectsType[];

  /**
   * Returns whether the type is namespace-agnostic (global);
   * resolves to `false` if the type is not registered
   */
  isNamespaceAgnostic(type: string): boolean;

  /**
   * Returns whether the type is single-namespace (isolated);
   * resolves to `true` if the type is not registered
   */
  isSingleNamespace(type: string): boolean;

  /**
   * Returns whether the type is multi-namespace (shareable *or* isolated);
   * resolves to `false` if the type is not registered
   */
  isMultiNamespace(type: string): boolean;

  /**
   * Returns whether the type is multi-namespace (shareable);
   * resolves to `false` if the type is not registered
   */
  isShareable(type: string): boolean;

  /**
   * Returns the `hidden` property for given type, or `false` if
   * the type is not registered.
   */
  isHidden(type: string): boolean;

  /**
   * Returns the `hiddenFromHttpApis` property for a given type, or `false` if
   * the type is not registered
   */
  isHiddenFromHttpApis(type: string): boolean;
  /**
   * Returns the `indexPattern` property for given type, or `undefined` if
   * the type is not registered.
   */
  getIndex(type: string): string | undefined;

  /**
   * Returns the `management.importableAndExportable` property for given type, or
   * `false` if the type is not registered or does not define a management section.
   */
  isImportableAndExportable(type: string): boolean;

  /**
   * Returns the `nameAttribute` property for given type, or `unknown` if
   * the property/type is not registered.
   */
  getNameAttribute(type: string): string;
}
