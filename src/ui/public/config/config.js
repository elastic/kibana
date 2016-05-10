import angular from 'angular';
import { once, cloneDeep, defaultsDeep, isPlainObject } from 'lodash';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import Notifier from 'ui/notify/notifier';
const module = uiModules.get('kibana/config');

// service for delivering config variables to everywhere else
module.service(`config`, function ($rootScope, $http, chrome, uiSettings) {
  const config = this;
  const notify = new Notifier({ location: `Config` });
  const { defaults, user: initialUserSettings } = uiSettings;
  let settings = mergeSettings(defaults, initialUserSettings);

  $rootScope.$broadcast(`init:config`);

  config.getAll = () => cloneDeep(settings);
  config.get = key => getCurrentValue(key);
  config.set = (key, val) => change(key, isPlainObject(val) ? angular.toJson(val) : val);
  config.remove = key => change(key, null);
  config.isDefault = key => !(key in settings) || nullOrEmpty(settings[key].userValue);
  config.isCustom = key => key in settings && !('value' in settings[key]);

  /**
   * A little helper for binding config variables to $scopes
   *
   * @param  {Scope} $scope - an angular $scope object
   * @param  {string} key - the config key to bind to
   * @param  {string} [property] - optional property name where the value should
   *                             be stored. Defaults to the config key
   * @return {function} - an unbind function
   */
  config.$bind = function (scope, key, property = key) {
    config.on(key, update, scope);
    function update(value) {
      scope[property] = value;
    }
  };

  config.on = function (key, fn, scope = $rootScope) {
    const postfix = key === `*` ? `` : `.${key}`;
    update();
    scope.$on(`change:config${postfix}`, update);
    scope.$on(`init:config`, update);
    function update() {
      fn(config.get(key));
    }
  };

  function change(key, value) {
    const initialVal = config.get(key);
    const persistentUpdate = value === null ? remove : edit;
    localUpdate(value);

    return Promise
      .resolve()
      .then(() => persistentUpdate(key, value))
      .then(res => res.data.settings)
      .then(updatedSettings => {
        settings = mergeSettings(defaults, updatedSettings);
      })
      .catch(reason => {
        localUpdate(initialVal);
        notify.error(reason);
      });

    function localUpdate(newVal) {
      const oldVal = config.get(key);
      patch(newVal);
      advertise(oldVal);
    }
    function patch(value) {
      if (!(key in settings)) {
        settings[key] = {};
      }
      settings[key].userValue = value;
    }
    function advertise(oldVal) {
      const newVal = config.get(key);
      notify.log(`config change: ${key}: ${oldVal} -> ${newVal}`);
      $rootScope.$broadcast(`change:config`, settings);
      $rootScope.$broadcast(`change:config.${key}`, newVal, oldVal);
    }
  }
  function remove(key) {
    return $http.delete(chrome.addBasePath(`/api/kibana/settings/${key}`));
  }
  function edit(key, value) {
    return $http.post(chrome.addBasePath(`/api/kibana/settings/${key}`), { value });
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

function mergeSettings(defaults, extended) {
  return defaultsDeep(extended, defaults);
}
