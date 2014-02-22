define(function (require) {
  var configFile = require('../../config');

  var es; // share the client amoungst all apps
  require('angular')
    .module('kibana/services')
    .service('es', function (esFactory, $q) {
      if (es) return es;

      es = esFactory({
        host: configFile.elasticsearch
      });

      return es;
    });
});