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

import _ from 'lodash';
import url from 'url';

interface UrlParam {
  hash?: string;
  host?: string;
  hostname?: string;
  href?: string;
  password?: string;
  pathname?: string;
  port?: number;
  protocol?: string;
  search?: string;
  username?: string;
}

interface App {
  pathname?: string;
  hash?: string;
}

/**
 * Converts a config and a pathname to a url
 * @param {object} config A url config
 *   example:
 *   {
 *      protocol: 'http',
 *      hostname: 'localhost',
 *      port: 9220,
 *      auth: kibanaTestUser.username + ':' + kibanaTestUser.password
 *   }
 * @param {object} app The params to append
 *   example:
 *   {
 *      pathname: 'app/kibana',
 *      hash: '/discover'
 *   }
 * @return {string}
 */

function getUrl(config: UrlParam, app: App) {
  return url.format(_.assign({}, config, app));
}

getUrl.noAuth = function getUrlNoAuth(config: UrlParam, app: App) {
  config = _.pickBy(config, function (val, param) {
    return param !== 'auth';
  });
  return getUrl(config, app);
};

getUrl.baseUrl = function getBaseUrl(config: UrlParam) {
  return url.format(_.pick(config, 'protocol', 'hostname', 'port'));
};

export { getUrl };
