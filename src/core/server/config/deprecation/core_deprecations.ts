/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { has, get } from 'lodash';
import { ConfigDeprecationProvider, ConfigDeprecation } from '@kbn/config';

const configPathDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  if (has(process.env, 'CONFIG_PATH')) {
    log(
      `Environment variable CONFIG_PATH is deprecated. It has been replaced with KBN_PATH_CONF pointing to a config folder`
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

const rewriteCorsSettings: ConfigDeprecation = (settings, fromPath, log) => {
  const corsSettings = get(settings, 'server.cors');
  if (typeof get(settings, 'server.cors') === 'boolean') {
    log('"server.cors" is deprecated and has been replaced by "server.cors.enabled"');
    settings.server.cors = {
      enabled: corsSettings,
    };
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
      rules.map((ruleStr) => {
        const parts = ruleStr.split(/\s+/);
        return [parts[0], parts.slice(1)];
      })
    );

    settings.csp.rules = [...parsed].map(([policy, sourceList]) => {
      if (sourceList.find((source) => source.includes(NONCE_STRING))) {
        log(`csp.rules no longer supports the {nonce} syntax. Replacing with 'self' in ${policy}`);
        sourceList = sourceList.filter((source) => !source.includes(NONCE_STRING));

        // Add 'self' if not present
        if (!sourceList.find((source) => source.includes(SELF_STRING))) {
          sourceList.push(SELF_STRING);
        }
      }

      if (
        SELF_POLICIES.includes(policy) &&
        !sourceList.find((source) => source.includes(SELF_STRING))
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

export const coreDeprecationProvider: ConfigDeprecationProvider = ({ rename, unusedFromRoot }) => [
  unusedFromRoot('savedObjects.indexCheckTimeout'),
  unusedFromRoot('server.xsrf.token'),
  unusedFromRoot('maps.manifestServiceUrl'),
  unusedFromRoot('optimize.lazy'),
  unusedFromRoot('optimize.lazyPort'),
  unusedFromRoot('optimize.lazyHost'),
  unusedFromRoot('optimize.lazyPrebuild'),
  unusedFromRoot('optimize.lazyProxyTimeout'),
  unusedFromRoot('optimize.enabled'),
  unusedFromRoot('optimize.bundleFilter'),
  unusedFromRoot('optimize.bundleDir'),
  unusedFromRoot('optimize.viewCaching'),
  unusedFromRoot('optimize.watch'),
  unusedFromRoot('optimize.watchPort'),
  unusedFromRoot('optimize.watchHost'),
  unusedFromRoot('optimize.watchPrebuild'),
  unusedFromRoot('optimize.watchProxyTimeout'),
  unusedFromRoot('optimize.useBundleCache'),
  unusedFromRoot('optimize.sourceMaps'),
  unusedFromRoot('optimize.workers'),
  unusedFromRoot('optimize.profile'),
  unusedFromRoot('optimize.validateSyntaxOfNodeModules'),
  unusedFromRoot('elasticsearch.preserveHost'),
  unusedFromRoot('elasticsearch.startupTimeout'),
  rename('cpu.cgroup.path.override', 'ops.cGroupOverrides.cpuPath'),
  rename('cpuacct.cgroup.path.override', 'ops.cGroupOverrides.cpuAcctPath'),
  rename('server.xsrf.whitelist', 'server.xsrf.allowlist'),
  rewriteCorsSettings,
  configPathDeprecation,
  dataPathDeprecation,
  rewriteBasePathDeprecation,
  cspRulesDeprecation,
  mapManifestServiceUrlDeprecation,
];
