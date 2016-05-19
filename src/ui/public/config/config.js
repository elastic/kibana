import angular from 'angular';
import { once, cloneDeep, defaultsDeep, isPlainObject } from 'lodash';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import Notifier from 'ui/notify/notifier';
import ConfigDelayedUpdaterProvider from 'ui/config/_delayed_updater';
const module = uiModules.get('kibana/config');

// service for delivering config variables to everywhere else
module.service(`config`, function (Private, $rootScope, $http, chrome, uiSettings) {
  const config = this;
  const notify = new Notifier({ location: `Config` });
  const { defaults, user: initialUserSettings } = uiSettings;
  const delayedUpdate = Private(ConfigDelayedUpdaterProvider);
  let settings = mergeSettings(defaults, initialUserSettings);

  config.getAll = () => cloneDeep(settings);
  config.get = key => getCurrentValue(key);
  config.set = (key, val) => change(key, isPlainObject(val) ? angular.toJson(val) : val);
  config.remove = key => change(key, null);
  config.isDefault = key => !(key in settings) || nullOrEmpty(settings[key].userValue);
  config.isCustom = key => key in settings && !('value' in settings[key]);
  config.watchAll = (fn, scope) => watchAll(scope, fn);
  config.watch = (key, fn, scope) => watch(scope, fn, key);

  /**
   * A little helper for binding config variables to $scopes
   *
   * @param  {Scope} $scope - an angular $scope object
   * @param  {string} key - the config key to bind to
   * @param  {string} [property] - optional property name where the value should
   *                             be stored. Defaults to the config key
   * @return {function} - an unbind function
   */
  config.bindToScope = function (scope, key, property = key) {
    return watch(scope, update, key);
    function update(newVal) {
      scope[property] = newVal;
    }
  };

  function watch(scope = $rootScope, fn, key) {
    const newVal = config.get(key);
    const update = (e, ...args) => fn(...args);
    fn(newVal, null, key, config);
    return scope.$on(`change:config.${key}`, update);
  }

  function watchAll(scope = $rootScope, fn) {
    const update = (e, ...args) => fn(...args);
    fn(null, null, null, config);
    return scope.$on(`change:config`, update);
  }

  function change(key, value) {
    const oldVal = key in settings ? settings[key].userValue : undefined;
    const newVal = key in defaults && defaults[key].defaultValue === value ? null : value;
    const unchanged = oldVal === newVal;
    if (unchanged) {
      return Promise.resolve();
    }
    const initialVal = config.get(key);
    localUpdate(key, newVal);

    return delayedUpdate(key, newVal)
      .then(updatedSettings => {
        settings = mergeSettings(defaults, updatedSettings);
      })
      .catch(reason => {
        localUpdate(key, initialVal);
        notify.error(reason);
      });
  }

  function localUpdate(key, newVal) {
    const oldVal = config.get(key);
    patch(key, newVal);
    advertise(key, oldVal);
  }

  function patch(key, value) {
    if (!(key in settings)) {
      settings[key] = {};
    }
    if (value === null) {
      delete settings[key].userValue;
    } else {
      settings[key].userValue = value;
    }
  }

  function advertise(key, oldVal) {
    const newVal = config.get(key);
    notify.log(`config change: ${key}: ${oldVal} -> ${newVal}`);
    $rootScope.$broadcast(`change:config.${key}`, newVal, oldVal, key, config);
    $rootScope.$broadcast(`change:config`,        newVal, oldVal, key, config);
  }

  function nullOrEmpty(value) {
    return value === undefined || value === null;
  }

  function getCurrentValue(key) {
    if (!(key in settings)) {
      return null;
    }
    const { userValue, value: defaultValue, type } = settings[key];
    const currentValue = config.isDefault(key) ? defaultValue : userValue;
    if (type === 'json') {
      return JSON.parse(currentValue);
    }
    return currentValue;
  }
});

function mergeSettings(extended, defaults) {
  return defaultsDeep(extended, defaults);
}
