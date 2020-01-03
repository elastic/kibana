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
 * @name State
 *
 * @extends Events
 *
 * @description Persists generic "state" to and reads it from the URL.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import angular from 'angular';
import rison from 'rison-node';
import { applyDiff } from './utils/diff_object';
import { EventsProvider } from '../events';
import { fatalError, toastNotifications } from '../notify';
import './config_provider';
import { createLegacyClass } from '../utils/legacy_class';
import { callEach } from '../utils/function';
import {
  hashedItemStore,
  isStateHash,
  createStateHash,
} from '../../../../plugins/kibana_utils/public';

export function StateProvider(
  Private,
  $rootScope,
  $location,
  stateManagementConfig,
  config,
  kbnUrl,
  $injector
) {
  const Events = Private(EventsProvider);

  const isDummyRoute = () =>
    $injector.has('$route') &&
    $injector.get('$route').current &&
    $injector.get('$route').current.outerAngularWrapperRoute;

  createLegacyClass(State).inherits(Events);
  function State(urlParam, defaults, _hashedItemStore = hashedItemStore) {
    State.Super.call(this);

    this.setDefaults(defaults);
    this._urlParam = urlParam || '_s';
    this._hashedItemStore = _hashedItemStore;

    // When the URL updates we need to fetch the values from the URL
    this._cleanUpListeners = _.partial(callEach, [
      // partial route update, no app reload
      $rootScope.$on('$routeUpdate', () => {
        this.fetch();
      }),

      // beginning of full route update, new app will be initialized before
      // $routeChangeSuccess or $routeChangeError
      $rootScope.$on('$routeChangeStart', () => {
        if (!this._persistAcrossApps) {
          this.destroy();
        }
      }),

      $rootScope.$on('$routeChangeSuccess', () => {
        if (this._persistAcrossApps) {
          this.fetch();
        }
      }),
    ]);

    // Initialize the State with fetch
    this.fetch();
  }

  State.prototype._readFromURL = function() {
    const search = $location.search();
    const urlVal = search[this._urlParam];

    if (!urlVal) {
      return null;
    }

    if (isStateHash(urlVal)) {
      return this._parseStateHash(urlVal);
    }

    let risonEncoded;
    let unableToParse;
    try {
      risonEncoded = rison.decode(urlVal);
    } catch (e) {
      unableToParse = true;
    }

    if (unableToParse) {
      toastNotifications.addDanger(
        i18n.translate('common.ui.stateManagement.unableToParseUrlErrorMessage', {
          defaultMessage: 'Unable to parse URL',
        })
      );
      search[this._urlParam] = this.toQueryParam(this._defaults);
      $location.search(search).replace();
    }

    if (!risonEncoded) {
      return null;
    }

    if (this.isHashingEnabled()) {
      // RISON can find its way into the URL any number of ways, including the navbar links or
      // shared urls with the entire state embedded. These values need to be translated into
      // hashes and replaced in the browser history when state-hashing is enabled
      search[this._urlParam] = this.toQueryParam(risonEncoded);
      $location.search(search).replace();
    }

    return risonEncoded;
  };

  /**
   * Fetches the state from the url
   * @returns {void}
   */
  State.prototype.fetch = function() {
    if (!stateManagementConfig.enabled) {
      return;
    }

    let stash = this._readFromURL();

    // nothing to read from the url? save if ordered to persist, but only if it's not on a wrapper route
    if (stash === null) {
      if (this._persistAcrossApps) {
        return this.save();
      } else {
        stash = {};
      }
    }

    _.defaults(stash, this._defaults);
    // apply diff to state from stash, will change state in place via side effect
    const diffResults = applyDiff(this, stash);

    if (!isDummyRoute() && diffResults.keys.length) {
      this.emit('fetch_with_changes', diffResults.keys);
    }
  };

  /**
   * Saves the state to the url
   * @returns {void}
   */
  State.prototype.save = function(replace) {
    if (!stateManagementConfig.enabled) {
      return;
    }

    if (isDummyRoute()) {
      return;
    }

    let stash = this._readFromURL();
    const state = this.toObject();
    replace = replace || false;

    if (!stash) {
      replace = true;
      stash = {};
    }

    // apply diff to state from stash, will change state in place via side effect
    const diffResults = applyDiff(stash, _.defaults({}, state, this._defaults));

    if (diffResults.keys.length) {
      this.emit('save_with_changes', diffResults.keys);
    }

    // persist the state in the URL
    const search = $location.search();
    search[this._urlParam] = this.toQueryParam(state);
    if (replace) {
      $location.search(search).replace();
    } else {
      $location.search(search);
    }
  };

  /**
   * Calls save with a forced replace
   * @returns {void}
   */
  State.prototype.replace = function() {
    if (!stateManagementConfig.enabled) {
      return;
    }

    this.save(true);
  };

  /**
   * Resets the state to the defaults
   *
   * @returns {void}
   */
  State.prototype.reset = function() {
    if (!stateManagementConfig.enabled) {
      return;
    }

    kbnUrl.removeParam(this.getQueryParamName());
    // apply diff to attributes from defaults, this is side effecting so
    // it will change the state in place.
    const diffResults = applyDiff(this, this._defaults);
    if (diffResults.keys.length) {
      this.emit('reset_with_changes', diffResults.keys);
    }
    this.save();
  };

  /**
   * Cleans up the state object
   * @returns {void}
   */
  State.prototype.destroy = function() {
    this.off(); // removes all listeners
    this._cleanUpListeners(); // Removes the $routeUpdate listener
  };

  State.prototype.setDefaults = function(defaults) {
    this._defaults = defaults || {};
  };

  /**
   *  Parse the state hash to it's unserialized value. Hashes are restored
   *  to their pre-hashed state.
   *
   *  @param  {string} stateHash - state hash value from the query string.
   *  @return {any} - the stored value, or null if hash does not resolve.
   */
  State.prototype._parseStateHash = function(stateHash) {
    const json = this._hashedItemStore.getItem(stateHash);
    if (json === null) {
      toastNotifications.addDanger(
        i18n.translate('common.ui.stateManagement.unableToRestoreUrlErrorMessage', {
          defaultMessage:
            'Unable to completely restore the URL, be sure to use the share functionality.',
        })
      );
    }

    return JSON.parse(json);
  };

  /**
   *  Lookup the value for a hash and return it's value in rison format or just
   *  return passed argument if it's not recognized as state hash.
   *
   *  @param  {string} stateHashOrRison - either state hash value or rison string.
   *  @return {string} rison
   */
  State.prototype.translateHashToRison = function(stateHashOrRison) {
    if (isStateHash(stateHashOrRison)) {
      return rison.encode(this._parseStateHash(stateHashOrRison));
    }

    return stateHashOrRison;
  };

  State.prototype.isHashingEnabled = function() {
    return !!config.get('state:storeInSessionStorage');
  };

  /**
   *  Produce the hash version of the state in it's current position
   *
   *  @return {string}
   */
  State.prototype.toQueryParam = function(state = this.toObject()) {
    if (!this.isHashingEnabled()) {
      return rison.encode(state);
    }

    // We need to strip out Angular-specific properties.
    const json = angular.toJson(state);
    const hash = createStateHash(json);
    const isItemSet = this._hashedItemStore.setItem(hash, json);

    if (isItemSet) {
      return hash;
    }

    // If we ran out of space trying to persist the state, notify the user.
    const message = i18n.translate(
      'common.ui.stateManagement.unableToStoreHistoryInSessionErrorMessage',
      {
        defaultMessage:
          'Kibana is unable to store history items in your session ' +
          `because it is full and there don't seem to be items any items safe ` +
          'to delete.\n\n' +
          'This can usually be fixed by moving to a fresh tab, but could ' +
          'be caused by a larger issue. If you are seeing this message regularly, ' +
          'please file an issue at {gitHubIssuesUrl}.',
        values: { gitHubIssuesUrl: 'https://github.com/elastic/kibana/issues' },
      }
    );
    fatalError(new Error(message));
  };

  /**
   *  Get the query string parameter name where this state writes and reads
   *  @return {string}
   */
  State.prototype.getQueryParamName = function() {
    return this._urlParam;
  };

  /**
   * Returns an object with each property name and value corresponding to the entries in this collection
   * excluding fields started from '$', '_' and all methods
   *
   * @return {object}
   */
  State.prototype.toObject = function() {
    return _.omit(this, (value, key) => {
      return key.charAt(0) === '$' || key.charAt(0) === '_' || _.isFunction(value);
    });
  };

  /** Alias for method 'toObject'
   *
   * @obsolete Please use 'toObject' method instead
   * @return {object}
   */
  State.prototype.toJSON = function() {
    return this.toObject();
  };

  return State;
}
