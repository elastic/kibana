import angular from 'angular';
import _ from 'lodash';
import ConfigDefaultsProvider from 'ui/config/defaults';
import ConfigDelayedUpdaterProvider from 'ui/config/_delayed_updater';
import ConfigValsProvider from 'ui/config/_vals';
import DocSourceProvider from 'ui/courier/data_source/doc_source';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import Notifier from 'ui/notify/notifier';

var module = uiModules.get('kibana/config');

uiRoutes.addSetupWork(function (config) {
  return config.init();
});

// service for delivering config variables to everywhere else
module.service('config', function (Private, kbnVersion, kbnIndex, $rootScope, buildNum) {
  var config = this;

  var defaults = Private(ConfigDefaultsProvider);
  var DelayedUpdater = Private(ConfigDelayedUpdaterProvider);
  var vals = Private(ConfigValsProvider);

  var notify = new Notifier({
    location: 'Config'
  });

  // active or previous instance of DelayedUpdater. This will log and then process an
  // update once it is requested by calling #set() or #clear().
  let updater;

  var DocSource = Private(DocSourceProvider);
  var doc = (new DocSource())
    .index(kbnIndex)
    .type('config')
    .id(kbnVersion);

  /******
   * PUBLIC API
   ******/

  /**
   * Executes once and returns a promise that is resolved once the
   * config has loaded for the first time.
   *
   * @return {Promise} - Resolved when the config loads initially
   */
  config.init = _.once(function () {
    var complete = notify.lifecycle('config init');

    return (function getDoc() {

      // used to apply an entire es response to the vals, silentAndLocal will prevent
      // event/notifications/writes from occuring.
      var applyMassUpdate = function (resp, silentAndLocal) {
        _.union(_.keys(resp._source), _.keys(vals)).forEach(function (key) {
          change(key, resp._source[key], silentAndLocal);
        });
      };

      return doc.fetch().then(function initDoc(resp) {
        if (!resp.found) {
          return doc.doIndex({
            buildNum: buildNum
          }).then(getDoc);
        } else {
          // apply update, and keep it quiet the first time
          applyMassUpdate(resp, true);

          // don't keep it quiet other times
          doc.onUpdate(function (resp) {
            applyMassUpdate(resp, false);
          });
        }
      });
    }())
    .then(function () {
      $rootScope.$broadcast('init:config');
    })
    .then(complete, complete.failure);
  });

  config.get = function (key, defaultVal) {
    let keyVal;

    if (vals[key] == null) {
      if (defaultVal == null) {
        keyVal = defaults[key].value;
      } else {
        keyVal = _.cloneDeep(defaultVal);
      }
    } else {
      keyVal = vals[key];
    }

    if (defaults[key] && defaults[key].type === 'json') {
      return JSON.parse(keyVal);
    }
    return keyVal;
  };

  // sets a value in the config
  config.set = function (key, val) {
    if (_.isPlainObject(val)) {
      return change(key, angular.toJson(val));
    } else {
      return change(key, val);
    }
  };

  // clears a value from the config
  config.clear = function (key) {
    return change(key);
  };
  // alias for clear
  config.delete = config.clear;

  config.close = function () {
    if (updater) updater.fire();
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
  config.$bind = function ($scope, key, property) {
    if (!property) property = key;

    var update = function () {
      $scope[property] = config.get(key);
    };

    update();
    return _.partial(_.invoke, [
      $scope.$on('change:config.' + key, update),
      $scope.$on('init:config', update)
    ], 'call');
  };

  /*****
   * PRIVATE API
   *****/
  function change(key, val, silentAndLocal) {
    // if the previous updater has already fired, then start over with null
    if (updater && updater.fired) updater = null;
    // create a new updater
    if (!updater) updater = new DelayedUpdater(doc);
    // return a promise that will be resolved once the action is eventually done
    return updater.update(key, val, silentAndLocal);
  }

  config._vals = function () {
    return _.cloneDeep(vals);
  };

});
