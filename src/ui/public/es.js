define(function (require) {
  require('elasticsearch-browser/elasticsearch.angular.js');
  const _ = require('lodash');

  let es; // share the client amoungst all apps
  require('ui/modules')
    .get('kibana', ['elasticsearch', 'kibana/config'])
    .service('es', function (esFactory, esUrl, $q, esApiVersion, esRequestTimeout) {
      if (es) return es;

      es = esFactory({
        host: esUrl,
        log: 'info',
        requestTimeout: esRequestTimeout,
        apiVersion: esApiVersion,
        plugins: [function (Client, config) {

          // esFactory automatically injects the AngularConnector to the config
          // https://github.com/elastic/elasticsearch-js/blob/master/src/lib/connectors/angular.js
          _.class(CustomAngularConnector).inherits(config.connectionClass);
          function CustomAngularConnector(host, config) {
            CustomAngularConnector.Super.call(this, host, config);

            this.request = _.wrap(this.request, function (request, params, cb) {
              if (String(params.method).toUpperCase() === 'GET') {
                params.query = _.defaults({ _: Date.now() }, params.query);
              }

              return request.call(this, params, cb);
            });
          }

          config.connectionClass = CustomAngularConnector;

        }]
      });

      return es;
    });
});
