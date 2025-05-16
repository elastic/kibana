/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Logger } from '@kbn/logging';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import {
  SavedObjectsTypeValidator,
  modelVersionToVirtualVersion,
} from '@kbn/core-saved-objects-base-server-internal';
import {
  SavedObjectsErrorHelpers,
  type SavedObjectSanitizedDoc,
} from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';

export type IValidationHelper = PublicMethodsOf<ValidationHelper>;

export class ValidationHelper {
  private registry: ISavedObjectTypeRegistry;
  private logger: Logger;
  private kibanaVersion: string;
  private typeValidatorMap: Record<string, SavedObjectsTypeValidator> = {};

  constructor({
    registry,
    logger,
    kibanaVersion,
  }: {
    registry: ISavedObjectTypeRegistry;
    logger: Logger;
    kibanaVersion: string;
  }) {
    this.registry = registry;
    this.logger = logger;
    this.kibanaVersion = kibanaVersion;
  }

  /** The `initialNamespaces` field (create, bulkCreate) is used to create an object in an initial set of spaces. */
  public validateInitialNamespaces(type: string, initialNamespaces: string[] | undefined) {
    if (!initialNamespaces) {
      return;
    }

    if (this.registry.isNamespaceAgnostic(type)) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        '"initialNamespaces" cannot be used on space-agnostic types'
      );
    } else if (!initialNamespaces.length) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        '"initialNamespaces" must be a non-empty array of strings'
      );
    } else if (
      !this.registry.isShareable(type) &&
      (initialNamespaces.length > 1 || initialNamespaces.includes(ALL_NAMESPACES_STRING))
    ) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        '"initialNamespaces" can only specify a single space when used with space-isolated types'
      );
    }
  }

  /** The object-specific `namespaces` field (bulkGet) is used to check if an object exists in any of a given number of spaces. */
  public validateObjectNamespaces(type: string, id: string, namespaces: string[] | undefined) {
    if (!namespaces) {
      return;
    }

    if (this.registry.isNamespaceAgnostic(type)) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        '"namespaces" cannot be used on space-agnostic types'
      );
    } else if (!namespaces.length) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    } else if (
      !this.registry.isShareable(type) &&
      (namespaces.length > 1 || namespaces.includes(ALL_NAMESPACES_STRING))
    ) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        '"namespaces" can only specify a single space when used with space-isolated types'
      );
    }
  }

  /** Validate a migrated doc against the registered saved object type's schema. */
  public validateObjectForCreate(type: string, doc: SavedObjectSanitizedDoc) {
    if (!this.registry.getType(type)) {
      return;
    }
    const validator = this.getTypeValidator(type);
    try {
      validator.validate(doc);
    } catch (error) {
      throw SavedObjectsErrorHelpers.createBadRequestError(error.message);
    }
  }

  private getTypeValidator(type: string): SavedObjectsTypeValidator {
    if (!this.typeValidatorMap[type]) {
      const savedObjectType = this.registry.getType(type);

      const stackVersionSchemas =
        typeof savedObjectType?.schemas === 'function'
          ? savedObjectType.schemas()
          : savedObjectType?.schemas ?? {};

      const modelVersionCreateSchemas =
        typeof savedObjectType?.modelVersions === 'function'
          ? savedObjectType.modelVersions()
          : savedObjectType?.modelVersions ?? {};

      const combinedSchemas = { ...stackVersionSchemas };
      Object.entries(modelVersionCreateSchemas).reduce((map, [key, modelVersion]) => {
        if (modelVersion.schemas?.create) {
          const virtualVersion = modelVersionToVirtualVersion(key);
          combinedSchemas[virtualVersion] = modelVersion.schemas!.create!;
        }
        return map;
      }, {});

      this.typeValidatorMap[type] = new SavedObjectsTypeValidator({
        logger: this.logger.get('type-validator'),
        type,
        validationMap: combinedSchemas,
        defaultVersion: this.kibanaVersion,
      });
    }
    return this.typeValidatorMap[type]!;
  }

  /** This is used when objects are created. */
  public validateOriginId(type: string, objectOrOptions: { originId?: string }) {
    if (
      Object.keys(objectOrOptions).includes('originId') &&
      !this.registry.isMultiNamespace(type)
    ) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        '"originId" can only be set for multi-namespace object types'
      );
    }
  }
}
