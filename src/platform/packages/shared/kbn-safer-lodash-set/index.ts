/*
 * This file is forked from the lodash project (https://lodash.com/),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See `src/platform/packages/shared/kbn-safer-lodash-set/LICENSE` for more information.
 */

// @ts-expect-error lodash internals
import assignValue from 'lodash/_assignValue';
// @ts-expect-error lodash internals
import castPath from 'lodash/_castPath';
import isFunction from 'lodash/isFunction';
// @ts-expect-error lodash internals
import isIndex from 'lodash/_isIndex';
import isObject from 'lodash/isObject';
// @ts-expect-error lodash internals
import toKey from 'lodash/_toKey';

type PropertyPath = string | number | symbol | Array<string | number | symbol>;

/**
 * The base implementation of `set`.
 */
function baseSet<T extends object>(
  object: T,
  path: PropertyPath,
  value: unknown,
  customizer?: (value: unknown, key: string, object: object) => unknown
): T {
  if (!isObject(object)) {
    return object;
  }
  const pathArray = castPath(path, object);

  let index = -1;
  const length = pathArray.length;
  const lastIndex = length - 1;
  let nested: any = object;

  while (nested != null && ++index < length) {
    const key = toKey(pathArray[index]);
    let newValue: unknown = value;

    if (key === 'prototype' && isFunction(nested)) {
      throw new Error('Illegal access of function prototype');
    }

    if (index !== lastIndex) {
      const objValue = Object.prototype.hasOwnProperty.call(nested, key) ? nested[key] : undefined;
      newValue = customizer ? customizer(objValue, key, nested) : undefined;
      if (newValue === undefined) {
        newValue = isObject(objValue) ? objValue : isIndex(pathArray[index + 1]) ? [] : {};
      }
    }
    assignValue(nested, key, newValue);
    nested = nested[key];
  }
  return object;
}

/**
 * Sets the value at `path` of `object`. If a portion of `path` doesn't exist,
 * it's created. Arrays are created for missing index properties while objects
 * are created for all other missing properties.
 *
 * **Note:** This method mutates `object`.
 *
 * @param object The object to modify.
 * @param path The path of the property to set.
 * @param value The value to set.
 * @returns Returns `object`.
 *
 * @example
 * const object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * set(object, 'a[0].b.c', 4);
 * console.log(object.a[0].b.c);
 * // => 4
 *
 * set(object, ['x', '0', 'y', 'z'], 5);
 * console.log(object.x[0].y.z);
 * // => 5
 */
export function set<T extends object>(object: T, path: PropertyPath, value: unknown): T {
  return object == null ? object : baseSet(object, path, value);
}

/**
 * This method is like `set` except that it accepts `customizer` which is
 * invoked to produce the objects of `path`. If `customizer` returns `undefined`
 * path creation is handled by the method instead.
 *
 * **Note:** This method mutates `object`.
 *
 * @param object The object to modify.
 * @param path The path of the property to set.
 * @param value The value to set.
 * @param customizer The function to customize assigned values.
 * @returns Returns `object`.
 *
 * @example
 * const object = {};
 *
 * setWith(object, '[0][1]', 'a', Object);
 * // => { '0': { '1': 'a' } }
 */
export function setWith<T extends object>(
  object: T,
  path: PropertyPath,
  value: unknown,
  customizer?: (value: unknown, key: string, object: object) => unknown
): T {
  const customizerFn = typeof customizer === 'function' ? customizer : undefined;
  return object == null ? object : baseSet(object, path, value, customizerFn);
}
