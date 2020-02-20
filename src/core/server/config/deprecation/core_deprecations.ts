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

import { has, get } from 'lodash';
import { ConfigDeprecationProvider, ConfigDeprecation } from './types';

const configPathDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  if (has(process.env, 'CONFIG_PATH')) {
    log(
      `Environment variable CONFIG_PATH is deprecated. It has been replaced with KIBANA_PATH_CONF pointing to a config folder`
    );
  }
  return settings;
};

const dataPathDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  if (has(process.env, 'DATA_PATH')) {
    log(
      `Environment variable "DATA_PATH" will be removed.  It has been replaced with kibana.yml setting "path.data"`
    );
  }
  return settings;
};

const rewriteBasePathDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  if (has(settings, 'server.basePath') && !has(settings, 'server.rewriteBasePath')) {
    log(
      'You should set server.basePath along with server.rewriteBasePath. Starting in 7.0, Kibana ' +
        'will expect that all requests start with server.basePath rather than expecting you to rewrite ' +
        'the requests in your reverse proxy. Set server.rewriteBasePath to false to preserve the ' +
        'current behavior and silence this warning.'
    );
  }
  return settings;
};

const cspRulesDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  const NONCE_STRING = `{nonce}`;
  // Policies that should include the 'self' source
  const SELF_POLICIES = Object.freeze(['script-src', 'style-src']);
  const SELF_STRING = `'self'`;

  const rules: string[] = get(settings, 'csp.rules');
  if (rules) {
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
  }

  return settings;
};

const mapManifestServiceUrlDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  if (has(settings, 'map.manifestServiceUrl')) {
    log(
      'You should no longer use the map.manifestServiceUrl setting in kibana.yml to configure the location ' +
        'of the Elastic Maps Service settings. These settings have moved to the "map.emsTileApiUrl" and ' +
        '"map.emsFileApiUrl" settings instead. These settings are for development use only and should not be ' +
        'modified for use in production environments.'
    );
  }
  return settings;
};

export const coreDeprecationProvider: ConfigDeprecationProvider = ({
  unusedFromRoot,
  renameFromRoot,
}) => [
  unusedFromRoot('savedObjects.indexCheckTimeout'),
  unusedFromRoot('server.xsrf.token'),
  unusedFromRoot('maps.manifestServiceUrl'),
  renameFromRoot('optimize.lazy', 'optimize.watch'),
  renameFromRoot('optimize.lazyPort', 'optimize.watchPort'),
  renameFromRoot('optimize.lazyHost', 'optimize.watchHost'),
  renameFromRoot('optimize.lazyPrebuild', 'optimize.watchPrebuild'),
  renameFromRoot('optimize.lazyProxyTimeout', 'optimize.watchProxyTimeout'),
  renameFromRoot('xpack.xpack_main.telemetry.config', 'telemetry.config'),
  renameFromRoot('xpack.xpack_main.telemetry.url', 'telemetry.url'),
  renameFromRoot('xpack.xpack_main.telemetry.enabled', 'telemetry.enabled'),
  renameFromRoot('xpack.telemetry.enabled', 'telemetry.enabled'),
  renameFromRoot('xpack.telemetry.config', 'telemetry.config'),
  renameFromRoot('xpack.telemetry.banner', 'telemetry.banner'),
  renameFromRoot('xpack.telemetry.url', 'telemetry.url'),
  // Monitoring renames
  // TODO: Remove these from here once the monitoring plugin is migrated to NP
  renameFromRoot('xpack.monitoring.enabled', 'monitoring.enabled'),
  renameFromRoot('xpack.monitoring.ui.enabled', 'monitoring.ui.enabled'),
  renameFromRoot(
    'xpack.monitoring.kibana.collection.enabled',
    'monitoring.kibana.collection.enabled'
  ),
  renameFromRoot('xpack.monitoring.max_bucket_size', 'monitoring.ui.max_bucket_size'),
  renameFromRoot('xpack.monitoring.min_interval_seconds', 'monitoring.ui.min_interval_seconds'),
  renameFromRoot(
    'xpack.monitoring.show_license_expiration',
    'monitoring.ui.show_license_expiration'
  ),
  renameFromRoot(
    'xpack.monitoring.ui.container.elasticsearch.enabled',
    'monitoring.ui.container.elasticsearch.enabled'
  ),
  renameFromRoot(
    'xpack.monitoring.ui.container.logstash.enabled',
    'monitoring.ui.container.logstash.enabled'
  ),
  renameFromRoot(
    'xpack.monitoring.tests.cloud_detector.enabled',
    'monitoring.tests.cloud_detector.enabled'
  ),
  renameFromRoot(
    'xpack.monitoring.kibana.collection.interval',
    'monitoring.kibana.collection.interval'
  ),
  renameFromRoot('xpack.monitoring.elasticsearch.hosts', 'monitoring.ui.elasticsearch.hosts'),
  renameFromRoot('xpack.monitoring.elasticsearch.username', 'monitoring.ui.elasticsearch.username'),
  renameFromRoot('xpack.monitoring.elasticsearch.password', 'monitoring.ui.elasticsearch.password'),
  renameFromRoot(
    'xpack.monitoring.xpack_api_polling_frequency_millis',
    'monitoring.xpack_api_polling_frequency_millis'
  ),
  renameFromRoot(
    'xpack.monitoring.cluster_alerts.email_notifications.enabled',
    'monitoring.cluster_alerts.email_notifications.enabled'
  ),
  renameFromRoot(
    'xpack.monitoring.cluster_alerts.email_notifications.email_address',
    'monitoring.cluster_alerts.email_notifications.email_address'
  ),
  renameFromRoot('xpack.monitoring.ccs.enabled', 'monitoring.ui.ccs.enabled'),
  renameFromRoot(
    'xpack.monitoring.elasticsearch.logFetchCount',
    'monitoring.ui.elasticsearch.logFetchCount'
  ),
  configPathDeprecation,
  dataPathDeprecation,
  rewriteBasePathDeprecation,
  cspRulesDeprecation,
  mapManifestServiceUrlDeprecation,
];
