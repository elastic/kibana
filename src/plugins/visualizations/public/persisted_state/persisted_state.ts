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

import { EventEmitter } from 'events';

import {
  isPlainObject,
  cloneDeep,
  get,
  set,
  isEqual,
  isString,
  merge,
  mergeWith,
  toPath,
} from 'lodash';

function prepSetParams(key: PersistedStateKey, value: any, path: PersistedStatePath) {
  // key must be the value, set the entire state using it
  if (value === undefined && (isPlainObject(key) || path.length > 0)) {
    // setting entire tree, swap the key and value to write to the state
    value = key;
    key = undefined;
  }

  // ensure the value being passed in is never mutated
  return {
    value: cloneDeep(value),
    key,
  };
}

type PersistedStateKey = string | string[] | undefined;
type PersistedStatePath = string | string[];

export class PersistedState extends EventEmitter {
  private readonly _path: PersistedStatePath;
  private readonly _initialized: boolean;

  private _changedState: any;
  private _defaultState: any;
  private _mergedState: any;

  constructor(value?: any, path?: PersistedStatePath) {
    super();

    this._path = this.setPath(path);

    // Some validations
    if (!this._path.length && value && !isPlainObject(value)) {
      throw new Error('State value must be a plain object');
    }

    value = value || this.getDefault();

    // copy passed state values and create internal trackers
    this.set(value);
    this._initialized = true; // used to track state changes
  }

  get(key?: PersistedStateKey, defaultValue?: any) {
    // no path and no key, get the whole state
    if (!this.hasPath() && key === undefined) {
      return this._mergedState;
    }

    return cloneDeep(get(this._mergedState, this.getIndex(key || ''), defaultValue));
  }

  set(key: PersistedStateKey | any, value?: any) {
    const params = prepSetParams(key, value, this._path);
    const val = this.setValue(params.key, params.value);

    this.emit('set');
    return val;
  }

  setSilent(key: PersistedStateKey | any, value?: any) {
    const params = prepSetParams(key, value, this._path);

    if (params.key || params.value) {
      return this.setValue(params.key, params.value, true);
    }
  }

  clearAllKeys() {
    Object.getOwnPropertyNames(this._changedState).forEach((key) => {
      this.set(key, null);
    });
  }

  reset(path: PersistedStatePath) {
    const keyPath = this.getIndex(path);
    const origValue = get(this._defaultState, keyPath);
    const currentValue = get(this._mergedState, keyPath);

    if (origValue === undefined) {
      this.cleanPath(path, this._mergedState);
    } else {
      set(this._mergedState, keyPath, origValue);
    }

    // clean up the changedState tree
    this.cleanPath(path, this._changedState);

    if (!isEqual(currentValue, origValue)) this.emit('change');
  }

  getChanges() {
    return cloneDeep(this._changedState);
  }

  toJSON() {
    return this.get();
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  fromString(input: string) {
    return this.set(JSON.parse(input));
  }

  private getIndex(key: PersistedStateKey) {
    if (key === undefined) return this._path;

    return [...(this._path || []), ...toPath(key)];
  }

  private getPartialIndex(key: PersistedStateKey) {
    const keyPath = this.getIndex(key);

    return keyPath.slice(this._path.length);
  }

  private cleanPath(path: PersistedStatePath, stateTree: any) {
    const partialPath = this.getPartialIndex(path);
    let remove = true;

    if (Array.isArray(partialPath)) {
      // recursively delete value tree, when no other keys exist
      while (partialPath.length > 0) {
        const lastKey = partialPath.splice(partialPath.length - 1, 1)[0];
        const statePath = [...this._path, partialPath];
        const stateVal = statePath.length > 0 ? get(stateTree, statePath as string[]) : stateTree;

        // if stateVal isn't an object, do nothing
        if (!isPlainObject(stateVal)) return;

        if (remove) delete stateVal[lastKey];
        if (Object.keys(stateVal).length > 0) remove = false;
      }
    }
  }

  private getDefault() {
    return this.hasPath() ? undefined : {};
  }

  private setPath(path?: PersistedStatePath): string[] {
    if (Array.isArray(path)) {
      return path;
    }

    if (isString(path)) {
      return [...this.getIndex(path)];
    }

    return [];
  }

  private hasPath() {
    return this._path.length > 0;
  }

  private setValue(key: PersistedStateKey, value: any, silent: boolean = false) {
    const self = this;
    let stateChanged = false;
    const initialState = !this._initialized;
    const keyPath = this.getIndex(key);
    const hasKeyPath = keyPath.length > 0;

    // if this is the initial state value, save value as the default
    if (initialState) {
      this._changedState = {};
      if (!this.hasPath() && key === undefined) this._defaultState = value;
      else this._defaultState = set({}, keyPath, value);
    }

    if (!initialState) {
      // no path and no key, set the whole state
      if (!this.hasPath() && key === undefined) {
        // compare changedState and new state, emit an event when different
        stateChanged = !isEqual(this._changedState, value);
        this._changedState = value;
        this._mergedState = cloneDeep(value);
      } else {
        // check for changes at path, emit an event when different
        const curVal = hasKeyPath ? this.get(keyPath) : this._mergedState;
        stateChanged = !isEqual(curVal, value);

        // arrays are merge by index, not desired - ensure they are replaced
        if (Array.isArray(get(this._mergedState, keyPath))) {
          if (hasKeyPath) {
            set(this._mergedState, keyPath, undefined);
          } else {
            this._mergedState = undefined;
          }
        }

        if (hasKeyPath) {
          set(this._changedState, keyPath, value);
        } else {
          this._changedState = isPlainObject(value) ? value : {};
        }
      }
    }

    // update the merged state value
    const targetObj = this._mergedState || cloneDeep(this._defaultState);
    const sourceObj = merge({}, this._changedState);

    // handler arguments are (targetValue, sourceValue, key, target, source)
    const mergeMethod = function (targetValue: any, sourceValue: any, mergeKey: string) {
      // if not initial state, skip default merge method (ie. return value, see note below)
      if (!initialState && isEqual(keyPath, self.getIndex(mergeKey))) {
        // use the sourceValue or fall back to targetValue
        return sourceValue === undefined ? targetValue : sourceValue;
      }
    };

    // If `mergeMethod` is provided it is invoked to produce the merged values of the
    // destination and source properties.
    // If `mergeMethod` returns `undefined` the default merging method is used
    this._mergedState = mergeWith(targetObj, sourceObj, mergeMethod);

    // sanity check; verify that there are actually changes
    if (isEqual(this._mergedState, this._defaultState)) this._changedState = {};

    if (!silent && stateChanged) this.emit('change', key);

    return this;
  }
}
