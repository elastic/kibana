import angular from 'angular';
import { cloneDeep, defaultsDeep, isPlainObject } from 'lodash';
import { uiModules } from 'ui/modules';
import { Notifier } from 'ui/notify/notifier';
import { ConfigDelayedUpdaterProvider } from 'ui/config/_delayed_updater';
const module = uiModules.get('kibana/config');

// service for delivering config variables to everywhere else
module.service(`config`, function (Private, $rootScope, $http, chrome, uiSettings) {
  const config = this;
  const notify = new Notifier({ location: `Config` });
  const { defaults, user: initialUserSettings } = uiSettings;
  const delayedUpdate = Private(ConfigDelayedUpdaterProvider);
  let settings = mergeSettings(defaults, initialUserSettings);

  config.getAll = () => cloneDeep(settings);
  config.get = (key, defaultValue) => getCurrentValue(key, defaultValue);
  config.set = (key, val) => change(key, isPlainObject(val) ? angular.toJson(val) : val);
  config.remove = key => change(key, null);
  config.isDeclared = key => key in settings;
  config.isDefault = key => !config.isDeclared(key) || nullOrEmpty(settings[key].userValue);
  config.isCustom = key => config.isDeclared(key) && !('value' in settings[key]);
  config.watchAll = (fn, scope) => watchAll(scope, fn);
  config.watch = (key, fn, scope) => watch(key, scope, fn);

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
    return watch(key, scope, update);
    function update(newVal) {
      scope[property] = newVal;
    }
  };

  function watch(key, scope = $rootScope, fn) {
    if (!config.isDeclared(key)) {
      throw new Error(`Unexpected \`config.watch("${key}", fn)\` call on unrecognized configuration setting "${key}".
Setting an initial value via \`config.set("${key}", value)\` before binding
any custom setting configuration watchers for "${key}" may fix this issue.`);
    }
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
    const declared = config.isDeclared(key);
    const oldVal = declared ? settings[key].userValue : undefined;
    const newVal = key in defaults && defaults[key].defaultValue === value ? null : value;
    const unchanged = oldVal === newVal;
    if (unchanged) {
      return Promise.resolve();
    }
    const initialVal = declared ? config.get(key) : undefined;
    localUpdate(key, newVal, initialVal);

    return delayedUpdate(key, newVal)
      .then(updatedSettings => {
        settings = mergeSettings(defaults, updatedSettings);
      })
      .catch(reason => {
        localUpdate(key, initialVal, config.get(key));
        notify.error(reason);
      });
  }

  function localUpdate(key, newVal, oldVal) {
    patch(key, newVal);
    advertise(key, oldVal);
  }

  function patch(key, value) {
    if (!config.isDeclared(key)) {
      settings[key] = {};
    }
    if (value === null) {
      delete settings[key].userValue;
    } else {
      const { type } = settings[key];
      if (type === 'json' && typeof value !== 'string') {
        settings[key].userValue = angular.toJson(value);
      } else {
        settings[key].userValue = value;
      }
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

  function getCurrentValue(key, defaultValueForGetter) {
    if (!config.isDeclared(key)) {
      if (defaultValueForGetter === undefined) {
        throw new Error(`Unexpected \`config.get("${key}")\` call on unrecognized configuration setting "${key}".
Setting an initial value via \`config.set("${key}", value)\` before attempting to retrieve
any custom setting value for "${key}" may fix this issue.
You can also save an step using \`config.get("${key}", defaultValue)\`, which
will set the initial value if one is not already set.`);
      }
      config.set(key, defaultValueForGetter);
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
