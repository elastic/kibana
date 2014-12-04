define(function (require) {
  var module = require('modules').get('kibana/config', [
    'kibana/notify'
  ]);

  var configFile = JSON.parse(require('text!config'));
  configFile.elasticsearch = (
    window.location.protocol + '//' +
    window.location.hostname +
    (window.location.port ? ':' + window.location.port : '') +
    '/elasticsearch');

  // allow the rest of the app to get the configFile easily
  module.constant('configFile', configFile);

  // service for delivering config variables to everywhere else
  module.service('config', function (Private, Notifier, kbnVersion, kbnSetup, $rootScope) {
    var config = this;

    var angular = require('angular');
    var _ = require('lodash');
    var defaults = require('components/config/defaults');
    var DelayedUpdater = Private(require('components/config/_delayed_updater'));
    var vals = Private(require('components/config/_vals'));

    var notify = new Notifier({
      location: 'Config'
    });

    // active or previous instance of DelayedUpdater. This will log and then process an
    // update once it is requested by calling #set() or #clear().
    var updater;

    var DocSource = Private(require('components/courier/data_source/doc_source'));
    var doc = (new DocSource())
      .index(configFile.kibana_index)
      .type('config')
      .id(kbnVersion);

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

        // used to apply an entire es response to the vals, silentAndLocal will prevent
        // event/notifications/writes from occuring.
        var applyMassUpdate = function (resp, silentAndLocal) {
          _.union(_.keys(resp._source), _.keys(vals)).forEach(function (key) {
            change(key, resp._source[key], silentAndLocal);
          });
        };

        return doc.fetch().then(function initDoc(resp) {
          if (!resp.found) return doc.doIndex({}).then(getDoc);
          else {
            // apply update, and keep it quiet the first time
            applyMassUpdate(resp, true);

            // don't keep it quiet other times
            doc.onUpdate(function (resp) {
              applyMassUpdate(resp, false);
            });
          }
        });
      })
      .then(function () {
        $rootScope.$broadcast('init:config');
      })
      .then(complete, complete.failure);
    });

    config.get = function (key, defaultVal) {
      if (vals[key] == null) {
        if (defaultVal == null) {
          return defaults[key].value;
        } else {
          return _.cloneDeep(defaultVal);
        }
      } else {
        return vals[key];
      }
    };

    // sets a value in the config
    config.set = function (key, val) {
      return change(key, val);
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

    /*****
     * PRIVATE API
     *****/
    var change = function (key, val, silentAndLocal) {
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
