define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  require('notify/notify');

  var module = require('modules').get('kibana/setup', [
    'kibana/notify',
    'kibana/courier'
  ]);

  module.service('setup', function (Promise, createNotifier, es, configFile) {
    var notify = createNotifier({
      location: 'Setup'
    });

    this.bootstrap = _.once(function () {
      notify.lifecycle('bootstrap');
      var kibanaIndexExists = false;

      function tmplError(err, tmpl) {
        var err2 = new Error(_.template(tmpl, { configFile: configFile }));
        err2.origError = err;
        if (err.stack) err2.stack = err.stack;
        return err2;
      }

      function checkForES() {
        notify.lifecycle('es check');
        return es.ping({ requestTimeout: 2000 })
        .catch(function () {
          throw new Error('Unable to connect to Elasticsearch at "' + configFile.elasticsearch + '"');
        })
        .finally(function () {
          notify.lifecycle('es check', true);
        });
      }

      function checkForKibanaIndex() {
        notify.lifecycle('kibana index check');
        return es.indices.exists({
          index: configFile.kibanaIndex
        })
        .then(function (exists) {
          kibanaIndexExists = !!exists;
        })
        .catch(function (err) {
          throw tmplError(err, 'Unable to check for Kibana index "<%= configFile.kibanaIndex %>"');
        })
        .finally(function () {
          notify.lifecycle('kibana index check', kibanaIndexExists);
        });
      }

      // create the index if it doens't exist already
      function createKibanaIndex() {
        if (kibanaIndexExists) return Promise.resolved();

        notify.lifecycle('create kibana index');
        return es.indices.create({
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
        })
        .catch(function (err) {
          throw tmplError(err, 'Unable to create Kibana index "<%= configFile.kibanaIndex %>"');
        })
        .finally(function () {
          notify.lifecycle('create kibana index', true);
        });
      }

      return checkForES()
      .then(checkForKibanaIndex)
      .then(createKibanaIndex)
      .finally(function () {
        notify.lifecycle('bootstrap', true);
      });
    });
  });
});