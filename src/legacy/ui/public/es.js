/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * @name es
 *
 * @description This is the result of calling esFactory. esFactory is exposed by the
 * elasticsearch.angular.js client.
 */

import 'elasticsearch-browser';
import _ from 'lodash';
import { uiModules } from './modules';

const plugins = [
  function(Client, config) {
    // esFactory automatically injects the AngularConnector to the config
    // https://github.com/elastic/elasticsearch-js/blob/master/src/lib/connectors/angular.js
    class CustomAngularConnector extends config.connectionClass {
      request = _.wrap(this.request, function(request, params, cb) {
        if (String(params.method).toUpperCase() === 'GET') {
          params.query = _.defaults({ _: Date.now() }, params.query);
        }

        return request.call(this, params, cb);
      });
    }

    config.connectionClass = CustomAngularConnector;
  },
];

export function createEsService(esFactory, esUrl, esApiVersion, esRequestTimeout) {
  return esFactory({
    host: esUrl,
    log: 'info',
    requestTimeout: esRequestTimeout,
    apiVersion: esApiVersion,
    plugins,
  });
}

export function createEsService(esFactory, esUrl, esApiVersion, esRequestTimeout) {
  return esFactory({
    host: esUrl,
    log: 'info',
    requestTimeout: esRequestTimeout,
    apiVersion: esApiVersion,
    plugins
  });
}

uiModules
  .get('kibana', ['elasticsearch', 'kibana/config'])
  //Elasticsearch client used for requesting data.  Connects to the /elasticsearch proxy
  .service('es', createEsService);
