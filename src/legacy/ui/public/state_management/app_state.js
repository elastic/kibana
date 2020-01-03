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
 * @name AppState
 *
 * @extends State
 *
 * @description Inherits State, which inherits Events. This class seems to be
 * concerned with mapping "props" to PersistedState instances, and surfacing the
 * ability to destroy those mappings.
 */

import { uiModules } from '../modules';
import { StateProvider } from './state';
import '../persisted_state';
import { createLegacyClass } from '../utils/legacy_class';

const urlParam = '_a';

export function AppStateProvider(Private, $location, $injector) {
  const State = Private(StateProvider);
  const PersistedState = $injector.get('PersistedState');
  let persistedStates;
  let eventUnsubscribers;

  createLegacyClass(AppState).inherits(State);
  function AppState(defaults) {
    // Initialize persistedStates. This object maps "prop" names to
    // PersistedState instances. These are used to make properties "stateful".
    persistedStates = {};

    // Initialize eventUnsubscribers. These will be called in `destroy`, to
    // remove handlers for the 'change' and 'fetch_with_changes' events which
    // are dispatched via the rootScope.
    eventUnsubscribers = [];

    AppState.Super.call(this, urlParam, defaults);
    AppState.getAppState._set(this);
  }

  // if the url param is missing, write it back
  AppState.prototype._persistAcrossApps = false;

  AppState.prototype.destroy = function() {
    AppState.Super.prototype.destroy.call(this);
    AppState.getAppState._set(null);

    eventUnsubscribers.forEach(listener => listener());
  };

  /**
   * @returns PersistedState instance.
   */
  AppState.prototype.makeStateful = function(prop) {
    if (persistedStates[prop]) return persistedStates[prop];
    const self = this;

    // set up the ui state
    persistedStates[prop] = new PersistedState();

    // update the app state when the stateful instance changes
    const updateOnChange = function() {
      const replaceState = false; // TODO: debouncing logic
      self[prop] = persistedStates[prop].getChanges();
      // Save state to the URL.
      self.save(replaceState);
    };
    const handlerOnChange = method => persistedStates[prop][method]('change', updateOnChange);
    handlerOnChange('on');
    eventUnsubscribers.push(() => handlerOnChange('off'));

    // update the stateful object when the app state changes
    const persistOnChange = function(changes) {
      if (!changes) return;

      if (changes.indexOf(prop) !== -1) {
        persistedStates[prop].set(self[prop]);
      }
    };
    const handlePersist = method => this[method]('fetch_with_changes', persistOnChange);
    handlePersist('on');
    eventUnsubscribers.push(() => handlePersist('off'));

    // if the thing we're making stateful has an appState value, write to persisted state
    if (self[prop]) persistedStates[prop].setSilent(self[prop]);

    return persistedStates[prop];
  };

  AppState.getAppState = (function() {
    let currentAppState;

    function get() {
      return currentAppState;
    }

    // Checks to see if the appState might already exist, even if it hasn't been newed up
    get.previouslyStored = function() {
      const search = $location.search();
      return search[urlParam] ? true : false;
    };

    get._set = function(current) {
      currentAppState = current;
    };

    return get;
  })();

  return AppState;
}

uiModules
  .get('kibana/global_state')
  .factory('AppState', function(Private) {
    return Private(AppStateProvider);
  })
  .service('getAppState', function(Private) {
    return Private(AppStateProvider).getAppState;
  });
