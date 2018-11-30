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

import _, { partial, set } from 'lodash';
import { createTransform, Deprecations } from '../../deprecation';
import { unset } from '../../utils';

const { rename, unused } = Deprecations;

const serverSslEnabled = (settings, log) => {
  const has = partial(_.has, settings);
  const set = partial(_.set, settings);

  if (!has('server.ssl.enabled') && has('server.ssl.certificate') && has('server.ssl.key')) {
    set('server.ssl.enabled', true);
    log('Enabling ssl by only specifying server.ssl.certificate and server.ssl.key is deprecated. Please set server.ssl.enabled to true');
  }
};

const savedObjectsIndexCheckTimeout = (settings, log) => {
  if (_.has(settings, 'savedObjects.indexCheckTimeout')) {
    log('savedObjects.indexCheckTimeout is no longer necessary.');

    if (Object.keys(settings.savedObjects).length > 1) {
      delete settings.savedObjects.indexCheckTimeout;
    } else {
      delete settings.savedObjects;
    }
  }
};

const rewriteBasePath = (settings, log) => {
  if (_.has(settings, 'server.basePath') && !_.has(settings, 'server.rewriteBasePath')) {
    log(
      'You should set server.basePath along with server.rewriteBasePath. Starting in 7.0, Kibana ' +
      'will expect that all requests start with server.basePath rather than expecting you to rewrite ' +
      'the requests in your reverse proxy. Set server.rewriteBasePath to false to preserve the ' +
      'current behavior and silence this warning.'
    );
  }
};

const loggingTimezone = (settings, log) => {
  if (_.has(settings, 'logging.useUTC')) {
    const timezone = settings.logging.useUTC ? 'UTC' : false;
    set('logging.timezone', timezone);
    unset(settings, 'logging.useUTC');
    log(`Config key "logging.useUTC" is deprecated. It has been replaced with "logging.timezone"`);
  }
};

const deprecations = [
  //server
  rename('server.ssl.cert', 'server.ssl.certificate'),
  unused('server.xsrf.token'),
  unused('uiSettings.enabled'),
  rename('optimize.lazy', 'optimize.watch'),
  rename('optimize.lazyPort', 'optimize.watchPort'),
  rename('optimize.lazyHost', 'optimize.watchHost'),
  rename('optimize.lazyPrebuild', 'optimize.watchPrebuild'),
  rename('optimize.lazyProxyTimeout', 'optimize.watchProxyTimeout'),
  serverSslEnabled,
  savedObjectsIndexCheckTimeout,
  rewriteBasePath,
  loggingTimezone,
];

export const transformDeprecations = createTransform(deprecations);
