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
import {
  MAX_SEMANTIC_SEARCH_FIELDS,
  SEMANTIC_FIELD_SUFFIX,
  resolveSemanticInferenceId,
} from './semantic_search';

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

/** Resolved semantic-search metadata stored outside the frozen type object (flag C). */
interface ResolvedSemanticDefinition {
  readonly fields: readonly string[];
  readonly inferenceId: string;
  readonly embedding: 'sync' | 'deferred';
}

/**
 * Core internal implementation of {@link ISavedObjectTypeRegistry}.
 *
 * @internal should only be used outside of Core for testing purposes.
 */
export class SavedObjectTypeRegistry implements ISavedObjectTypeRegistryInternal {
  private readonly types = new Map<string, SavedObjectsType>();
  private readonly legacyTypesMap: Set<string>;
  private readonly resolvedSemanticDefinitions = new Map<string, ResolvedSemanticDefinition>();

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

    // Compute and cache derived semantic state before the type object is frozen.
    // Copy the fields array so the stored definition is independent of the frozen type object;
    // freeze the definition to prevent callers from mutating the registry's cached state.
    if (type.semanticSearch) {
      this.resolvedSemanticDefinitions.set(
        type.name,
        Object.freeze({
          fields: Object.freeze([...type.semanticSearch.fields]) as readonly string[],
          inferenceId: resolveSemanticInferenceId(type),
          embedding: type.semanticSearch.embedding ?? 'sync',
        })
      );
    }

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

  /** {@inheritDoc ISavedObjectTypeRegistry.getSemanticSearchDefinition} */
  public getSemanticSearchDefinition(typeName: string): ResolvedSemanticDefinition | undefined {
    return this.resolvedSemanticDefinitions.get(typeName);
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

const validateType = ({
  name,
  management,
  hidden,
  hiddenFromHttpApis,
  semanticSearch,
  mappings,
}: SavedObjectsType) => {
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

  if (semanticSearch) {
    validateSemanticSearch(name, semanticSearch.fields, mappings.properties ?? {});
  }
};

/**
 * Alphanumerics, underscores, and hyphens are allowed in type names and field names used in
 * Painless scripts. Hyphens are safe because the builder uses single-quoted bracket notation
 * (e.g. ctx._source.get('index-pattern')), which is inert for hyphens. The characters that
 * would actually break a Painless script — quotes, backslashes, braces — remain excluded.
 */
const SAFE_IDENTIFIER_RE = /^[a-zA-Z0-9_-]+$/;

const validateSemanticSearch = (
  typeName: string,
  fields: string[],
  properties: Record<string, { type?: string }>
): void => {
  // Type name safety: the type name is interpolated into Painless scripts. Reject any
  // character that could break the script (quotes, backslashes, etc.).
  if (!SAFE_IDENTIFIER_RE.test(typeName)) {
    throw new Error(
      `Type ${typeName}: type name must match /^[a-zA-Z0-9_-]+$/ to be used with semanticSearch (got '${typeName}')`
    );
  }

  if (fields.length === 0) {
    throw new Error(
      `Type ${typeName}: 'semanticSearch.fields' must contain at least one field name`
    );
  }
  if (fields.length > MAX_SEMANTIC_SEARCH_FIELDS) {
    throw new Error(
      `Type ${typeName}: 'semanticSearch.fields' exceeds the maximum of ${MAX_SEMANTIC_SEARCH_FIELDS} fields`
    );
  }

  const seen = new Set<string>();
  for (const field of fields) {
    if (seen.has(field)) {
      throw new Error(
        `Type ${typeName}: 'semanticSearch.fields' contains duplicate field '${field}'`
      );
    }
    seen.add(field);

    // Field name safety: field names are also interpolated into Painless scripts.
    if (!SAFE_IDENTIFIER_RE.test(field)) {
      throw new Error(
        `Type ${typeName}: semanticSearch field '${field}' must match /^[a-zA-Z0-9_-]+$/ (got '${field}')`
      );
    }

    const mapping = properties[field];
    if (!mapping) {
      throw new Error(
        `Type ${typeName}: semanticSearch field '${field}' does not exist in mappings.properties`
      );
    }
    if (mapping.type !== 'text') {
      throw new Error(
        `Type ${typeName}: semanticSearch field '${field}' must have mapping type 'text', got '${mapping.type}'`
      );
    }
  }

  // Reserve the '_semantic' suffix: no hand-written property name may end with it.
  // POC limitation: only top-level properties are scanned; nested `properties` and
  // multi-field `fields` are not recursed into. Track as a Phase 2 hardening item.
  for (const propName of Object.keys(properties)) {
    if (propName.endsWith(SEMANTIC_FIELD_SUFFIX)) {
      throw new Error(
        `Type ${typeName}: mapping property '${propName}' uses the reserved suffix '${SEMANTIC_FIELD_SUFFIX}'`
      );
    }
  }

  // Reject hand-written 'semantic_text' or 'dense_vector' field types for types declaring
  // semanticSearch — the platform must remain in control of shadow-field creation (flag F).
  // POC limitation: same as above — only top-level properties are checked.
  for (const [propName, mapping] of Object.entries(properties)) {
    if (mapping.type === 'semantic_text' || mapping.type === 'dense_vector') {
      throw new Error(
        `Type ${typeName}: mapping property '${propName}' uses type '${mapping.type}', which is reserved for platform-managed shadow fields; remove it and use 'semanticSearch.fields' instead`
      );
    }
  }
};
