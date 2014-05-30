define(function (require) {
  var module = require('modules').get('kibana/config', [
    'kibana/notify'
  ]);

  var configFile = require('../../../config');
  // allow the rest of the app to get the configFile easily
  module.constant('configFile', configFile);

  // service for delivering config variables to everywhere else
  module.service('config', function (Private, Notifier, kbnVersion, kbnSetup) {
    var config = this;

    var angular = require('angular');
    var _ = require('lodash');
    var nextTick = require('utils/next_tick');
    var defaults = require('./defaults');
    require('notify/notify');

    var DelayedUpdater = Private(require('./_delayed_updater'));

    var DocSource = Private(require('courier/data_source/doc_source'));
    var doc = (new DocSource())
      .index(configFile.kibanaIndex)
      .type('config')
      .id(kbnVersion);

    var vals = Private(require('./_vals'));
    var updater;

    var notify = new Notifier({
      location: 'Config'
    });

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
      var complete = notify.lifecycle('config init');
      return kbnSetup()
      .then(function getDoc() {

        var applyMassUpdate = function (resp, silentAndLocal) {
          var newKeys = _.keys(resp._source);
          var oldKeys = _.keys(vals);

          _.difference(oldKeys, newKeys).forEach(function (key) {
            _change(key, void 0, silentAndLocal);
          });

          newKeys.forEach(function (key) {
            _change(key, resp._source[key], silentAndLocal);
          });
        };

        return doc.fetch().then(function initDoc(resp) {
          if (!resp.found) return doc.doIndex({}).then(getDoc);
          else {
            // apply update, and keep it quite the first time
            applyMassUpdate(resp, true);

            // don't keep it quite other times
            doc.onUpdate(function (resp) {
              applyMassUpdate(resp, false);
            });
          }
        });
      })
      .then(complete, complete.failure);
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

    // sets a value in the config
    config.set = function (key, val) {
      return _change(key, val);
    };

    // clears a value from the config
    config.clear = function (key) {
      return _change(key);
    };
    // alias for clear
    config.delete = config.clear;

    config.close = function () {
      if (updater) updater.fire();
    };

    /*****
     * PRIVATE API
     *****/
    var _notify = function (key, newVal, oldVal) {

    };

    var _change = function (key, val, silentAndLocal) {
      // if the previous updater has already fired, then start over with null
      if (updater && updater.fired) updater = null;
      // create a new updater
      if (!updater) updater = new DelayedUpdater(doc);
      // return a promise that will be resolved once the action is eventually done
      return updater.update(key, val, silentAndLocal);
    };

    config._vals = function () {
      return _.cloneDeep(vals);
    };

  });
});