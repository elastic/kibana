/**
 * @name es
 *
 * @description This is the result of calling esFactory. esFactory is exposed by the
 * elasticsearch.angular.js client.
 */

import 'elasticsearch-browser';
import _ from 'lodash';
import { uiModules } from './modules';

const plugins = [function (Client, config) {
  // esFactory automatically injects the AngularConnector to the config
  // https://github.com/elastic/elasticsearch-js/blob/master/src/lib/connectors/angular.js
  class CustomAngularConnector extends config.connectionClass {
    request = _.wrap(this.request, function (request, params, cb) {
      if (String(params.method).toUpperCase() === 'GET') {
        params.query = _.defaults({ _: Date.now() }, params.query);
      }

      return request.call(this, params, cb);
    });
  }

  config.connectionClass = CustomAngularConnector;
}];

uiModules
  .get('kibana', ['elasticsearch', 'kibana/config'])

  //Elasticsearch client used for requesting data.  Connects to the /elasticsearch proxy,
  //Uses a tribe node if configured, otherwise uses the base elasticsearch configuration
  .service('es', function (esFactory, esUrl, esApiVersion, esRequestTimeout) {
    return esFactory({
      host: esUrl,
      log: 'info',
      requestTimeout: esRequestTimeout,
      apiVersion: esApiVersion,
      plugins
    });
  });
