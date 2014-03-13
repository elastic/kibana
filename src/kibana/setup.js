define(function (require) {
  var angular = require('angular');
  var async = require('async');
  var $ = require('jquery');
  var _ = require('lodash');
  var configFile = require('../config');
  var nextTick = require('utils/next_tick');
  var modules = require('modules');

  /**
   * Setup the kibana application, ensuring that the kibanaIndex exists,
   * and perform any migration of data that is required.
   *
   * @param {function} done - callback
   */
  return function prebootSetup(done) {
    // load angular deps
    require([
      'notify/notify',

      'services/es',
      'services/config',
      'constants/base'
    ], function (notify) {

      $(function () {
        // create the setup module, it should require the same things
        // that kibana currently requires, which should only include the
        // loaded modules
        var setup = modules.get('setup');
        var appEl = document.createElement('div');
        var kibanaIndexExists;

        modules.link(setup);
        setup
          .value('configFile', configFile);

        angular
          .bootstrap(appEl, ['setup'])
          .invoke(function (es, config) {
            // init the setup module
            async.series([
              async.apply(checkForES, es),
              async.apply(checkForKibanaIndex, es),
              async.apply(createKibanaIndex, es),
              async.apply(checkForCurrentConfigDoc, es),
              async.apply(initConfig, config)
            ], function (err) {
              // ready to go, remove the appEl, close services and boot be done
              angular.element(appEl).remove();

              // linked modules should no longer depend on this module
              setup.close();

              if (err) throw err;
              return done(err);
            });
          });

        function wrapError(err, tmpl) {
          // if we pass a callback
          if (typeof err === 'function') {
            var cb = err; // wrap it
            return function (err) {
              cb(wrapError(err, tmpl));
            };
          }

          // if an error didn't actually occur
          if (!err) return void 0;

          var err2 = new Error(_.template(tmpl, { configFile: configFile }));
          err2.origError = err;
          return err2;
        }

        function checkForES(es, done) {
          notify.lifecycle('es check');
          es.ping(function (err, alive) {
            notify.lifecycle('es check', alive);
            done(alive ? void 0 : new Error('Unable to connect to Elasticsearch at "' + configFile.elasticsearch + '"'));
          });
        }

        function checkForKibanaIndex(es, done) {
          notify.lifecycle('kibana index check');
          es.indices.exists({
            index: configFile.kibanaIndex
          }, function (err, exists) {
            notify.lifecycle('kibana index check', !!exists);
            kibanaIndexExists = exists;
            done(wrapError(err, 'Unable to check for Kibana index "<%= configFile.kibanaIndex %>"'));
          });
        }

        // create the index if it doens't exist already
        function createKibanaIndex(es, done) {
          if (kibanaIndexExists) return done();

          notify.lifecycle('create kibana index');
          es.indices.create({
            index: configFile.kibanaIndex,
            body: {
              settings: {
                mappings: {
                  mappings: {
                    _source: {
                      enabled: false
                    },
                    properties: {
                      type: {
                        type: 'string',
                        index: 'not_analyzed'
                      }
                    }
                  }
                }
              }
            }
          }, function (err) {
            notify.lifecycle('create kibana index', !err);
            done(wrapError(err, 'Unable to create Kibana index "<%= configFile.kibanaIndex %>"'));
          });
        }

        // if the index is brand new, no need to see if it is out of data
        function checkForCurrentConfigDoc(es, done) {
          if (!kibanaIndexExists) return done();
          // callbacks should always be called async
          nextTick(done);
        }

        function initConfig(config, done) {
          config.init().then(function () { done(); }, done);
        }
      });
    });
  };
});
