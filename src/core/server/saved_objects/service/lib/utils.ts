/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import uuid from 'uuid';
import { SavedObjectsFindOptions } from '../../types';
import { SavedObjectsFindResponse } from '..';

export const DEFAULT_NAMESPACE_STRING = 'default';
export const ALL_NAMESPACES_STRING = '*';
export const FIND_DEFAULT_PAGE = 1;
export const FIND_DEFAULT_PER_PAGE = 20;
const UUID_REGEX = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;

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
   * Creates an empty response for a find operation. This is only intended to be used by saved objects client wrappers.
   */
  public static createEmptyFindResponse = <T>({
    page = FIND_DEFAULT_PAGE,
    perPage = FIND_DEFAULT_PER_PAGE,
  }: SavedObjectsFindOptions): SavedObjectsFindResponse<T> => ({
    page,
    per_page: perPage,
    total: 0,
    saved_objects: [],
  });

  /**
   * Generates a random ID for a saved objects.
   */
  public static generateId() {
    return uuid.v1();
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
}
