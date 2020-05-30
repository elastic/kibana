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

import angular from 'angular';
import { fatalError } from 'ui/notify/fatal_error';
import chrome from '../chrome';
import { isPlainObject } from 'lodash';
import { uiModules } from '../modules';
import { subscribeWithScope } from '../../../../plugins/kibana_legacy/public';

const module = uiModules.get('kibana/config');

/**
 * Angular tie-in to UiSettingsClient, which is implemented in vanilla JS. Designed
 * to expose the exact same API as the config service that has existed since forever.
 * @name config
 */
module.service(`config`, function ($rootScope, Promise) {
  const uiSettings = chrome.getUiSettingsClient();

  // direct bind sync methods
  this.getAll = (...args) => uiSettings.getAll(...args);
  this.get = (...args) => uiSettings.get(...args);
  this.isDeclared = (...args) => uiSettings.isDeclared(...args);
  this.isDefault = (...args) => uiSettings.isDefault(...args);
  this.isCustom = (...args) => uiSettings.isCustom(...args);
  this.isOverridden = (...args) => uiSettings.isOverridden(...args);

  // modify remove() to use angular Promises
  this.remove = (key) => Promise.resolve(uiSettings.remove(key));

  // modify set() to use angular Promises and angular.toJson()
  this.set = (key, value) =>
    Promise.resolve(uiSettings.set(key, isPlainObject(value) ? angular.toJson(value) : value));

  //////////////////////////////
  //* angular specific methods *
  //////////////////////////////

  const subscription = subscribeWithScope(
    $rootScope,
    uiSettings.getUpdate$(),
    {
      next: ({ key, newValue, oldValue }) => {
        $rootScope.$broadcast('change:config', newValue, oldValue, key, this);
        $rootScope.$broadcast(`change:config.${key}`, newValue, oldValue, key, this);
      },
    },
    fatalError
  );
  $rootScope.$on('$destroy', () => subscription.unsubscribe());

  this.watchAll = function (handler, scope = $rootScope) {
    // call handler immediately to initialize
    handler(null, null, null, this);

    return scope.$on('change:config', (event, ...args) => {
      handler(...args);
    });
  };

  this.watch = function (key, handler, scope = $rootScope) {
    if (!this.isDeclared(key)) {
      throw new Error(`Unexpected \`config.watch("${key}", fn)\` call on unrecognized configuration setting "${key}".
Setting an initial value via \`config.set("${key}", value)\` before binding
any custom setting configuration watchers for "${key}" may fix this issue.`);
    }

    // call handler immediately with current value
    handler(this.get(key), null, key, uiSettings);

    // call handler again on each change for this key
    return scope.$on(`change:config.${key}`, (event, ...args) => {
      handler(...args);
    });
  };

  /**
   * A little helper for binding config variables to $scopes
   *
   * @param  {Scope} $scope - an angular $scope object
   * @param  {string} key - the config key to bind to
   * @param  {string} [property] - optional property name where the value should
   *                             be stored. Defaults to the config key
   * @return {function} - an unbind function
   */
  this.bindToScope = function (scope, key, property = key) {
    const onUpdate = (newVal) => {
      scope[property] = newVal;
    };

    return this.watch(key, onUpdate, scope);
  };
});
