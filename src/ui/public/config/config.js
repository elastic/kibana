import angular from 'angular';
import chrome from '../chrome';
import { isPlainObject } from 'lodash';
import { uiModules } from '../modules';

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

  // modify remove() to use angular Promises
  this.remove = (key) => (
    Promise.resolve(uiSettings.remove(key))
  );

  // modify set() to use angular Promises and angular.toJson()
  this.set = (key, value) => (
    Promise.resolve(uiSettings.set(
      key,
      isPlainObject(value)
        ? angular.toJson(value)
        : value
    ))
  );

  //////////////////////////////
  //* angular specific methods *
  //////////////////////////////

  const subscription = uiSettings.subscribe(({ key, newValue, oldValue }) => {
    const emit = () => {
      $rootScope.$broadcast('change:config',        newValue, oldValue, key, this);
      $rootScope.$broadcast(`change:config.${key}`, newValue, oldValue, key, this);
    };

    // this is terrible, but necessary to emulate the same API
    // that the `config` service had before where changes were
    // emitted to scopes synchronously. All methods that don't
    // require knowing if we are currently in a digest cycle are
    // async and would deliver events too late for several usecases
    //
    // If you copy this code elsewhere you better have a good reason :)
    $rootScope.$$phase ? emit() : $rootScope.$apply(emit);
  });
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
