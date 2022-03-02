/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

function getUrl(config: UrlParam, app: UrlParam) {
  return url.format(_.assign({}, config, app));
}

getUrl.noAuth = function getUrlNoAuth(config: UrlParam, app: UrlParam) {
  config = _.pickBy(config, function (val, param) {
    return param !== 'auth';
  });
  return getUrl(config, app);
};

getUrl.baseUrl = function getBaseUrl(config: UrlParam) {
  return url.format(_.pick(config, 'protocol', 'hostname', 'port'));
};

export { getUrl };
