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

/**
 * @name PersistedState
 *
 * @extends Events
 */

import _ from 'lodash';
import toPath from 'lodash/internal/toPath';
import { PersistedStateError } from './errors';
import { SimpleEmitter } from '../utils/simple_emitter';

function prepSetParams(key, value, path) {
  // key must be the value, set the entire state using it
  if (_.isUndefined(value) && (_.isPlainObject(key) || path.length > 0)) {
    // setting entire tree, swap the key and value to write to the state
    value = key;
    key = undefined;
  }

  // ensure the value being passed in is never mutated
  return {
    value: _.cloneDeep(value),
    key: key,
  };
}

export class PersistedState {
  /**
   *
   * @param value
   * @param path
   * @param EmitterClass {SimpleEmitter} - a SimpleEmitter class that this class will extend. Can be used to
   * inherit a custom event emitter. For example, the EventEmitter is an "angular-ized" version
   * for angular components which automatically triggers a digest loop for every registered
   * handler. TODO: replace angularized SimpleEmitter and force angular callers to handle digest loops manually ala
   * https://github.com/elastic/kibana/issues/13855
   */
  constructor(value, path, EmitterClass = SimpleEmitter) {
    EmitterClass.call(this);

    this._path = this._setPath(path);

    _.forOwn(EmitterClass.prototype, (method, methodName) => {
      this[methodName] = function() {
        return EmitterClass.prototype[methodName].apply(this, arguments);
      };
    });

    // Some validations
    if (!this._path.length && value && !_.isPlainObject(value)) {
      throw new PersistedStateError('State value must be a plain object');
    }

    value = value || this._getDefault();

    // copy passed state values and create internal trackers
    this.set(value);
    this._initialized = true; // used to track state changes
  }

  get(key, def) {
    return _.cloneDeep(this._get(key, def));
  }

  set(key, value) {
    const params = prepSetParams(key, value, this._path);
    const val = this._set(params.key, params.value);
    this.emit('set');
    return val;
  }

  setSilent(key, value) {
    const params = prepSetParams(key, value, this._path);
    return this._set(params.key, params.value, true);
  }

  clearAllKeys() {
    Object.getOwnPropertyNames(this._changedState).forEach(key => {
      this.set(key, null);
    });
  }

  reset(path) {
    const keyPath = this._getIndex(path);
    const origValue = _.get(this._defaultState, keyPath);
    const currentValue = _.get(this._mergedState, keyPath);

    if (_.isUndefined(origValue)) {
      this._cleanPath(path, this._mergedState);
    } else {
      _.set(this._mergedState, keyPath, origValue);
    }

    // clean up the changedState tree
    this._cleanPath(path, this._changedState);

    if (!_.isEqual(currentValue, origValue)) this.emit('change');
  }

  getChanges() {
    return _.cloneDeep(this._changedState);
  }

  toJSON() {
    return this.get();
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  fromString(input) {
    return this.set(JSON.parse(input));
  }

  _getIndex(key) {
    if (_.isUndefined(key)) return this._path;
    return (this._path || []).concat(toPath(key));
  }

  _getPartialIndex(key) {
    const keyPath = this._getIndex(key);
    return keyPath.slice(this._path.length);
  }

  _cleanPath(path, stateTree) {
    const partialPath = this._getPartialIndex(path);
    let remove = true;

    // recursively delete value tree, when no other keys exist
    while (partialPath.length > 0) {
      const lastKey = partialPath.splice(partialPath.length - 1, 1)[0];
      const statePath = this._path.concat(partialPath);
      const stateVal = statePath.length > 0 ? _.get(stateTree, statePath) : stateTree;

      // if stateVal isn't an object, do nothing
      if (!_.isPlainObject(stateVal)) return;

      if (remove) delete stateVal[lastKey];
      if (Object.keys(stateVal).length > 0) remove = false;
    }
  }

  _getDefault() {
    return this._hasPath() ? undefined : {};
  }

  _setPath(path) {
    const isString = _.isString(path);
    const isArray = Array.isArray(path);

    if (!isString && !isArray) return [];
    return isString ? [this._getIndex(path)] : path;
  }

  _hasPath() {
    return this._path.length > 0;
  }

  _get(key, def) {
    // no path and no key, get the whole state
    if (!this._hasPath() && _.isUndefined(key)) {
      return this._mergedState;
    }

    return _.get(this._mergedState, this._getIndex(key), def);
  }

  _set(key, value, silent) {
    const self = this;
    let stateChanged = false;
    const initialState = !this._initialized;
    const keyPath = this._getIndex(key);
    const hasKeyPath = keyPath.length > 0;

    // if this is the initial state value, save value as the default
    if (initialState) {
      this._changedState = {};
      if (!this._hasPath() && _.isUndefined(key)) this._defaultState = value;
      else this._defaultState = _.set({}, keyPath, value);
    }

    if (!initialState) {
      // no path and no key, set the whole state
      if (!this._hasPath() && _.isUndefined(key)) {
        // compare changedState and new state, emit an event when different
        stateChanged = !_.isEqual(this._changedState, value);
        this._changedState = value;
        this._mergedState = _.cloneDeep(value);
      } else {
        // check for changes at path, emit an event when different
        const curVal = hasKeyPath ? this.get(keyPath) : this._mergedState;
        stateChanged = !_.isEqual(curVal, value);

        // arrays are merge by index, not desired - ensure they are replaced
        if (Array.isArray(_.get(this._mergedState, keyPath))) {
          if (hasKeyPath) _.set(this._mergedState, keyPath, undefined);
          else this._mergedState = undefined;
        }

        if (hasKeyPath) {
          _.set(this._changedState, keyPath, value);
        } else {
          this._changedState = _.isPlainObject(value) ? value : {};
        }
      }
    }

    // update the merged state value
    const targetObj = this._mergedState || _.cloneDeep(this._defaultState);
    const sourceObj = _.merge({}, this._changedState);

    // handler arguments are (targetValue, sourceValue, key, target, source)
    const mergeMethod = function(targetValue, sourceValue, mergeKey) {
      // if not initial state, skip default merge method (ie. return value, see note below)
      if (!initialState && _.isEqual(keyPath, self._getIndex(mergeKey))) {
        // use the sourceValue or fall back to targetValue
        return !_.isUndefined(sourceValue) ? sourceValue : targetValue;
      }
    };

    // If `mergeMethod` is provided it is invoked to produce the merged values of the
    // destination and source properties.
    // If `mergeMethod` returns `undefined` the default merging method is used
    this._mergedState = _.merge(targetObj, sourceObj, mergeMethod);

    // sanity check; verify that there are actually changes
    if (_.isEqual(this._mergedState, this._defaultState)) this._changedState = {};

    if (!silent && stateChanged) this.emit('change', key);

    return this;
  }
}
