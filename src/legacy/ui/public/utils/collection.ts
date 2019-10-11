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

import _ from 'lodash';

/**
 * move an obj either up or down in the collection by
 * injecting it either before/after the prev/next obj that
 * satisfied the qualifier
 *
 * or, just from one index to another...
 *
 * @param  {array} objs - the list to move the object within
 * @param  {number|any} obj - the object that should be moved, or the index that the object is currently at
 * @param  {number|boolean} below - the index to move the object to, or whether it should be moved up or down
 * @param  {function} qualifier - a lodash-y callback, object = _.where, string = _.pluck
 * @return {array} - the objs argument
 */
export function move(
  objs: object[],
  obj: object | number,
  below: number | boolean,
  qualifier: (object: object, index: number) => any
): object[] {
  const origI = _.isNumber(obj) ? obj : objs.indexOf(obj);
  if (origI === -1) {
    return objs;
  }

  if (_.isNumber(below)) {
    // move to a specific index
    objs.splice(below, 0, objs.splice(origI, 1)[0]);
    return objs;
  }

  below = !!below;
  qualifier = _.callback(qualifier);

  const above = !below;
  const finder = below ? _.findIndex : _.findLastIndex;

  // find the index of the next/previous obj that meets the qualifications
  const targetI = finder(objs, (otherAgg, otherI) => {
    if (below && otherI <= origI) {
      return;
    }
    if (above && otherI >= origI) {
      return;
    }
    return !!qualifier(otherAgg, otherI);
  });

  if (targetI === -1) {
    return objs;
  }

  // place the obj at it's new index
  objs.splice(targetI, 0, objs.splice(origI, 1)[0]);
  return objs;
}

/**
 * Like _.groupBy, but allows specifying multiple groups for a
 * single object.
 *
 * organizeBy([{ a: [1, 2, 3] }, { b: true, a: [1, 4] }], 'a')
 * // Object {1: Array[2], 2: Array[1], 3: Array[1], 4: Array[1]}
 *
 * _.groupBy([{ a: [1, 2, 3] }, { b: true, a: [1, 4] }], 'a')
 * // Object {'1,2,3': Array[1], '1,4': Array[1]}
 *
 * @param  {array} collection - the list of values to organize
 * @param  {Function} callback - either a property name, or a callback.
 * @return {object}
 */
export function organizeBy(collection: object[], callback: (obj: object) => string | string) {
  const buckets: { [key: string]: object[] } = {};
  const prop = typeof callback === 'function' ? false : callback;

  function add(key: string, obj: object) {
    if (!buckets[key]) {
      buckets[key] = [];
    }
    buckets[key].push(obj);
  }

  _.each(collection, (obj: object) => {
    const keys = prop === false ? callback(obj) : obj[prop];

    if (!Array.isArray(keys)) {
      add(keys, obj);
      return;
    }

    let length = keys.length;
    while (length-- > 0) {
      add(keys[length], obj);
    }
  });

  return buckets;
}

/**
 * Efficient and safe version of [].push(dest, source);
 *
 * @param  {Array} source - the array to pull values from
 * @param  {Array} dest   - the array to push values into
 * @return {Array} dest
 */
export function pushAll(source: any[], dest: any[]): any[] {
  const start = dest.length;
  const adding = source.length;

  // allocate - http://goo.gl/e2i0S0
  dest.length = start + adding;

  // fill sparse positions
  let i = -1;
  while (++i < adding) {
    dest[start + i] = source[i];
  }

  return dest;
}
