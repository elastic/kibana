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
function isObjectInner(val) {
  return val != null && typeof val === 'object' && Array.isArray(val) === false;
}

function isObjectObject(o) {
  return isObjectInner(o) === true && Object.prototype.toString.call(o) === '[object Object]';
}

export function isPlainObject(o) {
  if (isObjectObject(o) === false) return false;

  // If has modified constructor
  const ctor = o.constructor;
  if (typeof ctor !== 'function') return false;

  // If has modified prototype
  const prot = ctor.prototype;
  if (isObjectObject(prot) === false) return false;

  // If constructor does not have an Object-specific method
  if (prot.hasOwnProperty('isPrototypeOf') === false) {
    return false;
  }

  // Most likely a plain Object
  return true;
}

function isObject(val) {
  return val !== null && (typeof val === 'object' || typeof val === 'function');
}

function createKey(pattern, options) {
  let id = pattern;
  if (typeof options === 'undefined') {
    return id + '';
  }
  const keys = Object.keys(options);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    id += ';' + key + '=' + String(options[key]);
  }
  return id;
}

function isValidKey(key) {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

export function set(target, path, value, options) {
  if (!isObject(target)) {
    return target;
  }

  const opts = options || {};
  const isArray = Array.isArray(path);
  if (!isArray && typeof path !== 'string') {
    return target;
  }

  let merge = opts.merge;
  if (merge && typeof merge !== 'function') {
    merge = Object.assign;
  }

  const keys = (isArray ? path : split(path, opts)).filter(isValidKey);
  const len = keys.length;
  const orig = target;

  if (!options && keys.length === 1) {
    result(target, keys[0], value, merge);
    return target;
  }

  for (let i = 0; i < len; i++) {
    const prop = keys[i];

    if (!isObject(target[prop])) {
      target[prop] = {};
    }

    if (i === len - 1) {
      result(target, prop, value, merge);
      break;
    }

    target = target[prop];
  }

  return orig;
}

function result(target, path, value, merge) {
  if (merge && isPlainObject(target[path]) && isPlainObject(value)) {
    target[path] = merge({}, target[path], value);
  } else {
    target[path] = value;
  }
}

function split(path, options) {
  const id = createKey(path, options);
  if (set.memo[id]) return set.memo[id];

  const char = options && options.separator ? options.separator : '.';
  let keys = [];
  const res = [];

  if (options && typeof options.split === 'function') {
    keys = options.split(path);
  } else {
    keys = path.split(char);
  }

  for (let i = 0; i < keys.length; i++) {
    let prop = keys[i];
    while (prop && prop.slice(-1) === '\\' && keys[i + 1] != null) {
      prop = prop.slice(0, -1) + char + keys[++i];
    }
    res.push(prop);
  }
  set.memo[id] = res;
  return res;
}

set.memo = {};

/**
   * Set path in obj. Behaves like lodash `set`
   * @param obj The object to mutate
   * @param path The path of the sub-property to set
   * @param val The value to set the sub-property to
   */
export function overwrite(obj, path, val) {
  set(obj, path, undefined);
  set(obj, path, val);
}