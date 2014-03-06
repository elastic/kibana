define(function (require) {
  var angular = require('angular');
  var async = require('async');
  var $ = require('jquery');
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
      'kibana',

      'elasticsearch',
      'services/es',
      'services/config',
      'constants/base'
    ], function (kibana) {

      $(function () {
        // create the setup module, it should require the same things
        // that kibana currently requires, which should only include the
        // loaded modules
        var setup = modules.get('setup', ['elasticsearch']);
        var appEl = document.createElement('div');
        var kibanaIndexExists;

        setup
          .value('configFile', configFile);

        angular
          .bootstrap(appEl, ['setup'])
          .invoke(function (es, config) {
            // init the setup module
            async.series([
              async.apply(checkForKibanaIndex, es),
              async.apply(createKibanaIndex, es),
              async.apply(checkForCurrentConfigDoc, es),
              async.apply(initConfig, config)
            ], function (err) {
              // ready to go, remove the appEl, close services and boot be done
              angular.element(appEl).remove();

              // linked modules should no longer depend on this module
              setup.close();

              console.log('booting kibana');
              return done(err);
            });
          });

        function checkForKibanaIndex(es, done) {
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
          }, done);
        }

        // if the index is brand new, no need to see if it is out of data
        function checkForCurrentConfigDoc(es, done) {
          if (!kibanaIndexExists) return done();
          console.log('checking if migration is necessary: not implemented');
          // callbacks should always be called async
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