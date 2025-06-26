/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isFunction } from 'lodash';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import type {
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
} from '@kbn/core-saved-objects-api-server';
import type {
  SavedObjectMigration,
  SavedObjectMigrationFn,
  SavedObject,
} from '@kbn/core-saved-objects-server';

export const DEFAULT_NAMESPACE_STRING = 'default';
export const ALL_NAMESPACES_STRING = '*';
export const FIND_DEFAULT_PAGE = 1;
export const FIND_DEFAULT_PER_PAGE = 20;
const UUID_REGEX =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;

/**
 * @public
 */
export class SavedObjectsUtils {
  /**
   * Converts a given saved object namespace ID to its string representation. All namespace IDs have an identical string representation, with
   * the exception of the `undefined` namespace ID (which has a namespace string of `'default'`).
   *
   * @param namespace The namespace ID, which must be either a non-empty string or `undefined`.
   */
  public static namespaceIdToString = (namespace?: string) => {
    if (namespace === '') {
      throw new TypeError('namespace cannot be an empty string');
    }

    return namespace ?? DEFAULT_NAMESPACE_STRING;
  };

  /**
   * Converts a given saved object namespace string to its ID representation. All namespace strings have an identical ID representation, with
   * the exception of the `'default'` namespace string (which has a namespace ID of `undefined`).
   *
   * @param namespace The namespace string, which must be non-empty.
   */
  public static namespaceStringToId = (namespace: string) => {
    if (!namespace) {
      throw new TypeError('namespace must be a non-empty string');
    }

    return namespace !== DEFAULT_NAMESPACE_STRING ? namespace : undefined;
  };

  /**
   * Creates an empty response for a find operation.
   */
  public static createEmptyFindResponse = <T, A>({
    page = FIND_DEFAULT_PAGE,
    perPage = FIND_DEFAULT_PER_PAGE,
  }: SavedObjectsFindOptions): SavedObjectsFindResponse<T, A> => ({
    page,
    per_page: perPage,
    total: 0,
    saved_objects: [],
  });

  /**
   * Generates a random ID for a saved objects.
   */
  public static generateId() {
    return uuidv4();
  }

  /**
   * Validates that a saved object ID has been randomly generated.
   *
   * @param {string} id The ID of a saved object.
   * @todo Use `uuid.validate` once upgraded to v5.3+
   */
  public static isRandomId(id: string | undefined) {
    return typeof id === 'string' && UUID_REGEX.test(id);
  }

  /**
   * Uses a single-namespace object's "legacy ID" to determine what its new ID will be after it is converted to a multi-namespace type.
   *
   * @param {string} namespace The namespace of the saved object before it is converted.
   * @param {string} type The type of the saved object before it is converted.
   * @param {string} id The ID of the saved object before it is converted.
   * @returns {string} The ID of the saved object after it is converted.
   */
  public static getConvertedObjectId(namespace: string | undefined, type: string, id: string) {
    if (SavedObjectsUtils.namespaceIdToString(namespace) === DEFAULT_NAMESPACE_STRING) {
      return id; // Objects that exist in the Default space do not get new IDs when they are converted.
    }
    return uuidv5(`${namespace}:${type}:${id}`, uuidv5.DNS); // The uuidv5 namespace constant (uuidv5.DNS) is arbitrary.
  }

  /**
   * Gets the transform function from a migration object.
   * @param migration Migration object or a migration function.
   * @returns A migration function.
   */
  public static getMigrationFunction<InputAttributes, MigratedAttributes>(
    migration: SavedObjectMigration<InputAttributes, MigratedAttributes>
  ): SavedObjectMigrationFn<InputAttributes, MigratedAttributes> {
    return isFunction(migration) ? migration : migration.transform;
  }

  public static getName(
    nameAttribute: string,
    savedObject?: Pick<SavedObject<unknown>, 'attributes'> | null
  ): string | undefined {
    if (!savedObject) {
      return undefined;
    }

    const attributes = savedObject?.attributes as {
      name?: string;
      title?: string;
      // needed to allow index signature below
      [key: string]: string | undefined;
    };

    const fallbackTitle = attributes?.name || attributes?.title;

    if (nameAttribute !== 'unknown') {
      return attributes?.[nameAttribute] || fallbackTitle;
    }

    return fallbackTitle;
  }

  public static getIncludedNameFields(type: string, nameAttribute: string) {
    const sourceIncludes =
      nameAttribute !== 'unknown'
        ? [`${type}.${nameAttribute}`]
        : [`${type}.name`, `${type}.title`];

    return sourceIncludes;
  }
}
