define(function (require) {
  var _ = require('lodash');
  var nextTick = require('utils/next_tick');
  var configFile = require('../../../config');
  var defaults = require('./defaults');

  require('notify/notify');

  var module = require('modules').get('kibana/config', [
    'kibana/notify',
    'kibana/courier'
  ]);

  // guid within this window
  var nextId = (function () {
    var i = 0;
    return function () {
      return ++i;
    };
  }());

  // allow the rest of the app to get the configFile easily
  module.constant('configFile', configFile);

  // service for delivering config variables to everywhere else
  module.service('config', function ($rootScope, createNotifier, courier, kbnVersion, configFile, Promise, setup) {
    var config = this;
    var notify = createNotifier({
      location: 'Config'
    });

    var doc = courier.createSource('doc')
      .index(configFile.kibanaIndex)
      .type('config')
      .id(kbnVersion);

    var vals = null;

    /******
     * PUBLIC API
     ******/

    config.file = configFile;

    /**
     * Executes once and returns a promise that is resolved once the
     * config has loaded for the first time.
     *
     * @return {Promise} - Resolved when the config loads initially
     */
    config.init = _.once(function () {
      notify.lifecycle('config init');
      return setup.bootstrap().then(function getDoc() {
        return doc.fetch()
        .then(function (resp) {
          if (!resp.found) {
            return doc.doIndex({}).then(getDoc);
          }

          vals = _.defaults({}, resp._source || {}, defaults);

          notify.lifecycle('config init', true);
        });
      });
    });

    config.get = function (key, defaultVal) {
      return vals[key] == null ? vals[key] = _.cloneDeep(defaultVal) : vals[key];
    };

    config.set = function (key, val) {
      // sets a value in the config
      // the es doc must be updated successfully for the update to reflect in the get api.
      if (vals[key] === val) return Promise.resolved(true);

      var update = {};
      update[key] = val;

      return doc.doUpdate(update)
        .then(function () {
          change(key, val);
          return true;
        });
    };

    config.close = function () {};

    /*****
     * PRIVATE API
     *****/

    var change = function (key, val) {
      notify.log('config change: ' + key + ': ' + vals[key] + ' -> ' + val);
      vals[key] = val;
      $rootScope.$broadcast('change:config.' + key, val, vals[key]);
    };

  });
});