/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

const opsLoggingEventDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  if (has(settings, 'logging.events.ops')) {
    log(
      '"logging.events.ops" has been deprecated and will be removed ' +
        'in 8.0. To access ops data moving forward, please enable debug logs for the ' +
        '"metrics.ops" context in your logging configuration. For more details, see ' +
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx'
    );
  }
  return settings;
};

const requestLoggingEventDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  if (has(settings, 'logging.events.request') || has(settings, 'logging.events.response')) {
    log(
      '"logging.events.request" and "logging.events.response" have been deprecated and will be removed ' +
        'in 8.0. To access request and/or response data moving forward, please enable debug logs for the ' +
        '"http.server.response" context in your logging configuration. For more details, see ' +
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx'
    );
  }
  return settings;
};

const timezoneLoggingDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  if (has(settings, 'logging.timezone')) {
    log(
      '"logging.timezone" has been deprecated and will be removed ' +
        'in 8.0. To set the timezone moving forward, please add a timezone date modifier to the log pattern ' +
        'in your logging configuration. For more details, see ' +
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx'
    );
  }
  return settings;
};

const destLoggingDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  if (has(settings, 'logging.dest')) {
    log(
      '"logging.dest" has been deprecated and will be removed ' +
        'in 8.0. To set the destination moving forward, you can use the "console" appender ' +
        'in your logging configuration or define a custom one. For more details, see ' +
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx.'
    );
  }
  return settings;
};

const quietLoggingDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  if (has(settings, 'logging.quiet')) {
    log(
      '"logging.quiet" has been deprecated and will be removed ' +
        'in 8.0. Moving forward, you can use "logging.root.level:error" in your logging configuration. '
    );
  }
  return settings;
};

const silentLoggingDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  if (has(settings, 'logging.silent')) {
    log(
      '"logging.silent" has been deprecated and will be removed ' +
        'in 8.0. Moving forward, you can use "logging.root.level:off" in your logging configuration. '
    );
  }
  return settings;
};

const verboseLoggingDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  if (has(settings, 'logging.verbose')) {
    log(
      '"logging.verbose" has been deprecated and will be removed ' +
        'in 8.0. Moving forward, you can use "logging.root.level:all" in your logging configuration. '
    );
  }
  return settings;
};

const jsonLoggingDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  // We silence the deprecation warning when running in development mode because
  // the dev CLI code in src/dev/cli_dev_mode/using_server_process.ts manually
  // specifies `--logging.json=false`. Since it's executed in a child process, the
  // ` legacyLoggingConfigSchema` returns `true` for the TTY check on `process.stdout.isTTY`
  if (has(settings, 'logging.json') && settings.env !== 'development') {
    log(
      '"logging.json" has been deprecated and will be removed ' +
        'in 8.0. To specify log message format moving forward, ' +
        'you can configure the "appender.layout" property for every custom appender in your logging configuration. ' +
        'There is currently no default layout for custom appenders and each one must be declared explicitly. ' +
        'For more details, see ' +
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx.'
    );
  }
  return settings;
};

const logRotateDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  if (has(settings, 'logging.rotate')) {
    log(
      '"logging.rotate" and sub-options have been deprecated and will be removed in 8.0. ' +
        'Moving forward, you can enable log rotation using the "rolling-file" appender for a logger ' +
        'in your logging configuration. For more details, see ' +
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx#rolling-file-appender'
    );
  }
  return settings;
};

const logEventsLogDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  if (has(settings, 'logging.events.log')) {
    log(
      '"logging.events.log" has been deprecated and will be removed ' +
        'in 8.0. Moving forward, log levels can be customized on a per-logger basis using the new logging configuration. '
    );
  }
  return settings;
};

const logEventsErrorDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  if (has(settings, 'logging.events.error')) {
    log(
      '"logging.events.error" has been deprecated and will be removed ' +
        'in 8.0. Moving forward, you can use "logging.root.level: error" in your logging configuration. '
    );
  }
  return settings;
};

const logFilterDeprecation: ConfigDeprecation = (settings, fromPath, log) => {
  if (has(settings, 'logging.filter')) {
    log('"logging.filter" has been deprecated and will be removed ' + 'in 8.0. ');
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
  opsLoggingEventDeprecation,
  requestLoggingEventDeprecation,
  timezoneLoggingDeprecation,
  destLoggingDeprecation,
  quietLoggingDeprecation,
  silentLoggingDeprecation,
  verboseLoggingDeprecation,
  jsonLoggingDeprecation,
  logRotateDeprecation,
  logEventsLogDeprecation,
  logEventsErrorDeprecation,
  logFilterDeprecation,
];
