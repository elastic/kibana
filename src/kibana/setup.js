define(function (require) {
  var angular = require('angular');
  var async = require('async');
  var $ = require('jquery');
  var configFile = require('../config');
  var nextTick = require('utils/next_tick');

  /**
   * Setup the kibana application, ensuring that the kibanaIndex exists,
   * and perform any migration of data that is required.
   *
   * @param {Module} app - The Kibana module
   * @param {function} done - callback
   */
  return function SetupApp(app, done) {
    // load angular deps
    require([
      'elasticsearch',
      'services/es',
      'services/config',
      'constants/base'
    ], function () {
      $(function () {

        var setup = angular.module('setup', [
          'elasticsearch',
          'kibana/services',
          'kibana/constants'
        ]);
        var appEl = document.createElement('div');
        var kibanaIndexExists;

        setup.run(function (es, config) {
          // init the setup module
          async.series([
            async.apply(checkForKibanaIndex, es),
            async.apply(createKibanaIndex, es),
            async.apply(checkForCurrentConfigDoc, es),
            async.apply(initConfig, config)
          ], function (err) {
            // ready to go, remove the appEl, close services and boot be done
            appEl.remove();
            console.log('booting application');
            return done(err);
          });
        });

        angular.bootstrap(appEl, ['setup']);

        function checkForKibanaIndex(es, done) {
          console.log('look for kibana index');
          es.indices.exists({
            index: configFile.kibanaIndex
          }, function (err, exists) {
            console.log('kibana index does', (exists ? '' : 'not ') + 'exist');
            kibanaIndexExists = exists;
            return done(err);
          });
        }

        // create the index if it doens't exist already
        function createKibanaIndex(es, done) {
          if (kibanaIndexExists) return done();
          console.log('creating kibana index');
          es.indices.create({
            index: configFile.kibanaIndex,
            body: {
              settings: {
                mappings: {
                  type1: {
                    _source: {
                      enabled: false
                    },
                    properties: {
                      field1: {
                        type: 'string',
                        index: 'not_analyzed'
                      }
                    }
                  }
                }
              }
            }
          }, done);
        }

        // if the index is brand new, no need to see if it is out of data
        function checkForCurrentConfigDoc(es, done) {
          if (!kibanaIndexExists) return done();
          console.log('checking if migration is necessary: not implemented');
          nextTick(done);
        }

        function initConfig(config, done) {
          console.log('initializing config service');
          config.init().then(function () { done(); }, done);
        }
      });
    });
  };
});