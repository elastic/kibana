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
import { inflector } from './inflector';
import { organizeBy } from '../utils/collection';

const pathGetter = _(_.get)
  .rearg(1, 0)
  .ary(2);
const inflectIndex = inflector('by');
const inflectOrder = inflector('in', 'Order');

const CLEAR_CACHE = {};
const OPT_NAMES = ['index', 'group', 'order', 'initialSet', 'immutable'];

/**
 *  Generic extension of Array class, which will index (and reindex) the
 *  objects it contains based on their properties.
 *
 *  @param {Object} config describes the properties of this registry object
 *  @param {Array<string>} [config.index] a list of props/paths that should be used to index the docs.
 *  @param {Array<string>} [config.group] a list of keys/paths to group docs by.
 *  @param {Array<string>} [config.order] a list of keys/paths to order the keys by.
 *  @param {Array<any>} [config.initialSet] the initial dataset the IndexedArray should contain.
 *  @param {boolean} [config.immutable] a flag that hints to people reading the implementation that this IndexedArray
 *                                      should not be modified
 */

export class IndexedArray {
  static OPT_NAMES = OPT_NAMES;

  constructor(config) {
    config = _.pick(config || {}, OPT_NAMES);

    // use defineProperty so that value can't be changed
    Object.defineProperty(this, 'raw', { value: [] });

    this._indexNames = _.union(
      this._setupIndex(config.group, inflectIndex, organizeByIndexedArray(config)),
      this._setupIndex(config.index, inflectIndex, _.indexBy),
      this._setupIndex(config.order, inflectOrder, (raw, pluckValue) => {
        return [...raw].sort((itemA, itemB) => {
          const a = pluckValue(itemA);
          const b = pluckValue(itemB);
          if (typeof a === 'number' && typeof b === 'number') {
            return a - b;
          }
          return String(a)
            .toLowerCase()
            .localeCompare(String(b).toLowerCase());
        });
      })
    );

    if (config.initialSet) {
      this.push.apply(this, config.initialSet);
    }

    Object.defineProperty(this, 'immutable', { value: !!config.immutable });
  }

  /**
   * Remove items from this based on a predicate
   * @param {Function|Object|string} predicate - the predicate used to decide what is removed
   * @return {array} - the removed data
   */
  remove(predicate) {
    this._assertMutable('remove');
    const out = _.remove(this, predicate);
    _.remove(this.raw, predicate);
    this._clearIndices();
    return out;
  }

  /**
   * provide a hook for the JSON serializer
   * @return {array} - a plain, vanilla array with our same data
   */
  toJSON() {
    return this.raw;
  }

  // wrappers for mutable Array methods
  copyWithin(...args) {
    return this._mutation('copyWithin', args);
  }
  fill(...args) {
    return this._mutation('fill', args);
  }
  pop(...args) {
    return this._mutation('pop', args);
  }
  push(...args) {
    return this._mutation('push', args);
  }
  reverse(...args) {
    return this._mutation('reverse', args);
  }
  shift(...args) {
    return this._mutation('shift', args);
  }
  sort(...args) {
    return this._mutation('sort', args);
  }
  splice(...args) {
    return this._mutation('splice', args);
  }
  unshift(...args) {
    return this._mutation('unshift', args);
  }

  /**
   *  If this instance of IndexedArray is not mutable, throw an error
   *  @private
   *  @param  {String} methodName - user facing method name, for error message
   *  @return {undefined}
   */
  _assertMutable(methodName) {
    if (this.immutable) {
      throw new Error(`${methodName}() is not allowed on immutable IndexedArray instances`);
    }
  }

  /**
   *  Execute some mutable method from the Array prototype
   *  on the IndexedArray and this.raw
   *
   *  @private
   *  @param  {string} methodName
   *  @param  {Array<any>} args
   *  @return {any}
   */
  _mutation(methodName, args) {
    this._assertMutable(methodName);
    super[methodName].apply(this, args);
    this._clearIndices();
    return super[methodName].apply(this.raw, args);
  }

  /**
   * Create indices for a group of object properties. getters and setters are used to
   * read and control the indices.
   * @private
   * @param  {string[]} props   - the properties that should be used to index docs
   * @param  {function} inflect - a function that will be called with a property name, and
   *                            creates the public property at which the index will be exposed
   * @param  {function} op      - the function that will be used to create the indices, it is passed
   *                            the raw representation of the registry, and a getter for reading the
   *                            right prop
   *
   * @returns {string[]}        - the public keys of all indices created
   */
  _setupIndex(props, inflect, op) {
    // shortcut for empty props
    if (!props || props.length === 0) return;

    return props.map(prop => {
      const indexName = inflect(prop);
      const getIndexValueFromItem = pathGetter.partial(prop).value();
      let cache;

      Object.defineProperty(this, indexName, {
        enumerable: false,
        configurable: false,

        set: val => {
          // can't set any value other than the CLEAR_CACHE constant
          if (val === CLEAR_CACHE) {
            cache = false;
          } else {
            throw new TypeError(indexName + ' can not be set, it is a computed index of values');
          }
        },
        get: () => {
          if (!cache) {
            cache = op(this.raw, getIndexValueFromItem);
          }

          return cache;
        },
      });

      return indexName;
    });
  }

  /**
   * Clear cached index/group/order caches so they will be recreated
   * on next access
   * @private
   * @return {undefined}
   */
  _clearIndices() {
    this._indexNames.forEach(name => {
      this[name] = CLEAR_CACHE;
    });
  }
}

// using traditional `extends Array` syntax doesn't work with babel
// See https://babeljs.io/docs/usage/caveats/
Object.setPrototypeOf(IndexedArray.prototype, Array.prototype);

// Similar to `organizeBy` but returns IndexedArrays instead of normal Arrays.
function organizeByIndexedArray(config) {
  return (...args) => {
    const grouped = organizeBy(...args);

    return _.reduce(
      grouped,
      (acc, value, group) => {
        acc[group] = new IndexedArray({
          ...config,
          initialSet: value,
        });

        return acc;
      },
      {}
    );
  };
}
