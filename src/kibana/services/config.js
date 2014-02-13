define(function (require) {
  var angular = require('angular');
  var configFile = require('../../config');
  var _ = require('lodash');

  var module = angular.module('kibana/services');
  module.service('config', function ($q, es, courier) {

    var app = angular.module('kibana');
    var config = {};
    var watchers = {};

    function watch(key, onChange) {
      // probably a horrible idea
      if (!watchers[key]) watchers[key] = [];
      watchers[key].push(onChange);
    }

    function change(key, val) {
      if (config[key] !== val) {
        var oldVal = config[key];
        config[key] = val;
        if (watchers[key]) {
          watchers[key].forEach(function (watcher) {
            watcher(val, oldVal);
          });
        }
      }
    }

    function getDoc() {
      var defer = $q.promise();

      courier.get({
        index: config.kibanaIndex,
        type: 'config',
        id: app.constant('kbnVersion')
      }, function fetchDoc(err, doc) {
        _.assign(config, doc);
        defer.resolve();
      }, function onDocUpdate(doc) {
        _.forOwn(doc, function (val, key) {
          change(key, val);
        });
      });

      return defer.promise;
    }

    return {
      get: function (key) {
        return config[key];
      },
      set: function (key, val) {
        // sets a value in the config
        // the es doc must be updated successfully for the update to reflect in the get api.

        if (key === 'elasticsearch' || key === 'kibanaIndex') {
          return $q.reject(new Error('These values must be updated in the config.js file.'));
        }

        var defer = $q.defer();

        if (config[key] === val) {
          defer.resolve();
          return defer.promise;
        }

        var body = {};
        body[key] = val;
        courier.update({
          index: config.kibanaIndex,
          type: 'config',
          id: app.constant('kbnVersion'),
          body: body
        }, function (err) {
          if (err) return defer.reject(err);

          change(key, val);
          defer.resolve();
        });

        return defer.promise;
      },
      $watch: watch,
      init: getDoc
    };
  });
});