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

import { SavedObject } from '../../../types';

export type SavedObjectComparator = (a: SavedObject, b: SavedObject) => number;

export const getObjKey = (obj: SavedObject) => `${obj.type}|${obj.id}`;

export const byIdAscComparator: SavedObjectComparator = (a: SavedObject, b: SavedObject) =>
  a.id > b.id ? 1 : -1;

/**
 * Create a comparator that will sort objects depending on their position in the provided array.
 * Objects not present in the array will be appended at the end of the list, and sorted by id asc.
 *
 * @example
 * ```ts
 * const comparator = getPreservedOrderComparator([objA, objB, objC]);
 * const list = [newB, objB, objC, newA, objA]; // with obj.title matching their variable name
 * list.sort()
 * // list = [objA, objB, objC, newA, newB]
 * ```
 */
export const getPreservedOrderComparator = (objects: SavedObject[]): SavedObjectComparator => {
  const orderedKeys = objects.map(getObjKey);
  return (a: SavedObject, b: SavedObject) => {
    const indexA = orderedKeys.indexOf(getObjKey(a));
    const indexB = orderedKeys.indexOf(getObjKey(b));
    if (indexA > -1 && indexB > -1) {
      return indexA - indexB > 0 ? 1 : -1;
    }
    if (indexA > -1) {
      return -1;
    }
    if (indexB > -1) {
      return 1;
    }
    return byIdAscComparator(a, b);
  };
};
