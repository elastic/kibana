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
import { createTransform, Deprecations } from '../../deprecation';

const { rename, unused } = Deprecations;

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

const configPath = (settings, log) => {
  if (_.has(process, 'env.CONFIG_PATH')) {
    log(
      `Environment variable CONFIG_PATH is deprecated. It has been replaced with KIBANA_PATH_CONF pointing to a config folder`
    );
  }
};

const dataPath = (settings, log) => {
  if (_.has(process, 'env.DATA_PATH')) {
    log(
      `Environment variable "DATA_PATH" will be removed.  It has been replaced with kibana.yml setting "path.data"`
    );
  }
};

const NONCE_STRING = `{nonce}`;
// Policies that should include the 'self' source
const SELF_POLICIES = Object.freeze(['script-src', 'style-src']);
const SELF_STRING = `'self'`;

const cspRules = (settings, log) => {
  const rules = _.get(settings, 'csp.rules');
  if (!rules) {
    return;
  }

  const parsed = new Map(
    rules.map(ruleStr => {
      const parts = ruleStr.split(/\s+/);
      return [parts[0], parts.slice(1)];
    })
  );

  settings.csp.rules = [...parsed].map(([policy, sourceList]) => {
    if (sourceList.find(source => source.includes(NONCE_STRING))) {
      log(`csp.rules no longer supports the {nonce} syntax. Replacing with 'self' in ${policy}`);
      sourceList = sourceList.filter(source => !source.includes(NONCE_STRING));

      // Add 'self' if not present
      if (!sourceList.find(source => source.includes(SELF_STRING))) {
        sourceList.push(SELF_STRING);
      }
    }

    if (
      SELF_POLICIES.includes(policy) &&
      !sourceList.find(source => source.includes(SELF_STRING))
    ) {
      log(`csp.rules must contain the 'self' source. Automatically adding to ${policy}.`);
      sourceList.push(SELF_STRING);
    }

    return `${policy} ${sourceList.join(' ')}`.trim();
  });
};

const deprecations = [
  //server
  unused('server.xsrf.token'),
  unused('uiSettings.enabled'),
  rename('optimize.lazy', 'optimize.watch'),
  rename('optimize.lazyPort', 'optimize.watchPort'),
  rename('optimize.lazyHost', 'optimize.watchHost'),
  rename('optimize.lazyPrebuild', 'optimize.watchPrebuild'),
  rename('optimize.lazyProxyTimeout', 'optimize.watchProxyTimeout'),
  rename('xpack.telemetry.enabled', 'telemetry.enabled'),
  rename('xpack.telemetry.config', 'telemetry.config'),
  rename('xpack.telemetry.banner', 'telemetry.banner'),
  rename('xpack.telemetry.url', 'telemetry.url'),
  savedObjectsIndexCheckTimeout,
  rewriteBasePath,
  configPath,
  dataPath,
  cspRules,
];

export const transformDeprecations = createTransform(deprecations);
