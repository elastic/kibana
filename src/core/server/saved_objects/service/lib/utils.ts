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

import { SavedObjectsFindOptions } from '../../types';
import { SavedObjectsFindResponse } from '..';

export const DEFAULT_NAMESPACE_STRING = 'default';
export const ALL_NAMESPACES_STRING = '*';
export const FIND_DEFAULT_PAGE = 1;
export const FIND_DEFAULT_PER_PAGE = 20;

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
}
