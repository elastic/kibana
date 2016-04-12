import angular from 'angular';
import _ from 'lodash';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import Notifier from 'ui/notify/notifier';
const module = uiModules.get('kibana/config');

uiRoutes.addSetupWork(config => config.init());

// service for delivering config variables to everywhere else
module.service(`config`, function ($rootScope, $http, chrome) {
  const config = this;
  const notify = new Notifier({ location: `Config` });
  let vals = {};

  config.init = _.once(init);
  config.get = key => {
    if (!(key in vals)) {
      return null;
    }
    const { userValue, value, type } = vals[key];
    const val = userValue || value;
    if (type === 'json') {
      return JSON.parse(val);
    }
    return val;
  };
  config.set = (key, val) => change(key, _.isPlainObject(val) ? angular.toJson(val) : val);
  config.clear = key => change(key, null);
  config.getAll = () => _.cloneDeep(vals);

  /**
   * A little helper for binding config variables to $scopes
   *
   * @param  {Scope} $scope - an angular $scope object
   * @param  {string} key - the config key to bind to
   * @param  {string} [property] - optional property name where the value should
   *                             be stored. Defaults to the config key
   * @return {function} - an unbind function
   */
  config.$bind = function ($scope, key, property = key) {
    update();
    return () => {
      $scope.$on(`change:config.${key}`, update);
      $scope.$on(`init:config`, update);
    };
    function update() {
      $scope[property] = config.get(key);
    }
  };

  /**
   * Executes once and returns a promise that is resolved once the
   * config has loaded for the first time.
   *
   * @return {Promise} - Resolved when the config loads initially
   */
  function init() {
    const complete = notify.lifecycle(`config init`);
    return reset()
      .then(() => $rootScope.$broadcast(`init:config`))
      .then(
        complete,
        complete.failure
      );
  }
  function reset(loud) {
    return $http
      .get(chrome.addBasePath(`/api/kibana/settings`))
      .then(response => {
        vals = response.data.settings;
        if (loud) {
          $rootScope.$broadcast(`change:config`, vals);
        }
      });
  }
  function change(key, value) {
    const oldVal = config.get(key);
    const update = value === null ? remove : edit;
    return update(key, value)
      .then(() => reset(true))
      .then(() => $rootScope.$broadcast(`change:config.${key}`, vals[key], oldVal));
  }
  function remove(key) {
    return $http.delete(chrome.addBasePath(`/api/kibana/settings/${key}`));
  }
  function edit(key, value) {
    return $http.post(chrome.addBasePath(`/api/kibana/settings/${key}`), { value });
  }
});
