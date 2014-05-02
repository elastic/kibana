define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var nextTick = require('utils/next_tick');
  var configFile = require('../../../config');
  var defaults = require('./defaults');

  require('notify/notify');

  var module = require('modules').get('kibana/config', [
    'kibana/notify'
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
  module.service('config', function (Private, $rootScope, Notifier, kbnVersion, Promise, setup) {
    var config = this;
    var notify = new Notifier({
      location: 'Config'
    });

    var DocSource = Private(require('courier/data_source/doc_source'));

    var doc = (new DocSource())
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
        return doc.fetch().then(function initDoc(resp) {
          if (!resp.found) return doc.doIndex({}).then(getDoc);
          else {
            vals = _.cloneDeep(resp._source || {});

            doc.onUpdate(function applyMassUpdate(resp) {
              var allKeys = [].concat(_.keys(vals), _.keys(resp._source));
              _.uniq(allKeys).forEach(function (key) {
                if (!angular.equals(vals[key], resp._source[key])) {
                  change(key, resp._source[key]);
                }
              });
            });
          }
        });
      })
      .finally(function () {
        notify.lifecycle('config init', true);
      });
    });

    config.get = function (key, defaultVal) {
      if (vals[key] == null) {
        if (defaultVal == null) {
          return defaults[key];
        } else {
          return _.cloneDeep(defaultVal);
        }
      } else {
        return vals[key];
      }
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

    config.clear = function (key) {
      if (vals[key] == null) return Promise.resolved(true);

      var newVals = _.cloneDeep(vals);
      delete newVals[key];

      return doc.doIndex(newVals)
        .then(function () {
          change(key, void 0);
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

    config._vals = function () {
      return _.cloneDeep(vals);
    };

  });
});