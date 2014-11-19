define(function (require) {
  require('elasticsearch');

  var es; // share the client amoungst all apps
  require('modules')
    .get('kibana', ['elasticsearch', 'kibana/config'])
    .service('es', function (esFactory, configFile, $q) {
      if (es) return es;

      es = esFactory({
        host: configFile.elasticsearch,
        log: 'info',
        requestTimeout: 0
      });

      return es;
    });
});
