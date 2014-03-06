define(function (require) {
  var es; // share the client amoungst all apps
  require('angular')
    .module('kibana/services')
    .service('es', function (esFactory, configFile, $q) {
      if (es) return es;

      es = esFactory({
        host: configFile.elasticsearch
      });

      return es;
    });
});