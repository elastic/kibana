/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConfigDeprecationProvider, ConfigDeprecation } from '@kbn/config';

const configPathDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (process.env?.CONFIG_PATH) {
    addDeprecation({
      message: `Environment variable "CONFIG_PATH" is deprecated. It has been replaced with "KBN_PATH_CONF" pointing to a config folder`,
      correctiveActions: {
        manualSteps: ['Use "KBN_PATH_CONF" instead of "CONFIG_PATH" to point to a config folder.'],
      },
    });
  }
};

const dataPathDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (process.env?.DATA_PATH) {
    addDeprecation({
      message: `Environment variable "DATA_PATH" will be removed.  It has been replaced with kibana.yml setting "path.data"`,
      correctiveActions: {
        manualSteps: [
          `Set 'path.data' in the config file or CLI flag with the value of the environment variable "DATA_PATH".`,
        ],
      },
    });
  }
};

const rewriteBasePathDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (settings.server?.basePath && !settings.server?.rewriteBasePath) {
    addDeprecation({
      message:
        'You should set server.basePath along with server.rewriteBasePath. Starting in 7.0, Kibana ' +
        'will expect that all requests start with server.basePath rather than expecting you to rewrite ' +
        'the requests in your reverse proxy. Set server.rewriteBasePath to false to preserve the ' +
        'current behavior and silence this warning.',
      correctiveActions: {
        manualSteps: [
          `Set 'server.rewriteBasePath' in the config file, CLI flag, or environment variable (in Docker only).`,
          `Set to false to preserve the current behavior and silence this warning.`,
        ],
      },
    });
  }
};

const rewriteCorsSettings: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  const corsSettings = settings.server?.cors;
  if (typeof corsSettings === 'boolean') {
    addDeprecation({
      message: '"server.cors" is deprecated and has been replaced by "server.cors.enabled"',
      correctiveActions: {
        manualSteps: [
          `Replace "server.cors: ${corsSettings}" with "server.cors.enabled: ${corsSettings}"`,
        ],
      },
    });

    return {
      set: [{ path: 'server.cors', value: { enabled: corsSettings } }],
    };
  }
};

const cspRulesDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  const NONCE_STRING = `{nonce}`;
  // Policies that should include the 'self' source
  const SELF_POLICIES = Object.freeze(['script-src', 'style-src']);
  const SELF_STRING = `'self'`;

  const rules: string[] = settings.csp?.rules;
  if (rules) {
    const parsed = new Map(
      rules.map((ruleStr) => {
        const parts = ruleStr.split(/\s+/);
        return [parts[0], parts.slice(1)];
      })
    );

    return {
      set: [
        {
          path: 'csp.rules',
          value: [...parsed].map(([policy, sourceList]) => {
            if (sourceList.find((source) => source.includes(NONCE_STRING))) {
              addDeprecation({
                message: `csp.rules no longer supports the {nonce} syntax. Replacing with 'self' in ${policy}`,
                correctiveActions: {
                  manualSteps: [`Replace {nonce} syntax with 'self' in ${policy}`],
                },
              });
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
              addDeprecation({
                message: `csp.rules must contain the 'self' source. Automatically adding to ${policy}.`,
                correctiveActions: {
                  manualSteps: [`Add 'self' source to ${policy}.`],
                },
              });
              sourceList.push(SELF_STRING);
            }

            return `${policy} ${sourceList.join(' ')}`.trim();
          }),
        },
      ],
    };
  }
};

const mapManifestServiceUrlDeprecation: ConfigDeprecation = (
  settings,
  fromPath,
  addDeprecation
) => {
  if (settings.map?.manifestServiceUrl) {
    addDeprecation({
      message:
        'You should no longer use the map.manifestServiceUrl setting in kibana.yml to configure the location ' +
        'of the Elastic Maps Service settings. These settings have moved to the "map.emsTileApiUrl" and ' +
        '"map.emsFileApiUrl" settings instead. These settings are for development use only and should not be ' +
        'modified for use in production environments.',
      correctiveActions: {
        manualSteps: [
          `Use "map.emsTileApiUrl" and "map.emsFileApiUrl" config instead of "map.manifestServiceUrl".`,
          `These settings are for development use only and should not be modified for use in production environments.`,
        ],
      },
    });
  }
};

const opsLoggingEventDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (settings.logging?.events?.ops) {
    addDeprecation({
      documentationUrl:
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx#loggingevents',
      message:
        '"logging.events.ops" has been deprecated and will be removed ' +
        'in 8.0. To access ops data moving forward, please enable debug logs for the ' +
        '"metrics.ops" context in your logging configuration. For more details, see ' +
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx',
      correctiveActions: {
        manualSteps: [
          `Remove "logging.events.ops" from your kibana settings.`,
          `Enable debug logs for the "metrics.ops" context in your logging configuration`,
        ],
      },
    });
  }
};

const requestLoggingEventDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (settings.logging?.events?.request || settings.logging?.events?.response) {
    const removeConfigsSteps = [];

    if (settings.logging?.events?.request) {
      removeConfigsSteps.push(`Remove "logging.events.request" from your kibana configs.`);
    }

    if (settings.logging?.events?.response) {
      removeConfigsSteps.push(`Remove "logging.events.response" from your kibana configs.`);
    }

    addDeprecation({
      documentationUrl:
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx#loggingevents',
      message:
        '"logging.events.request" and "logging.events.response" have been deprecated and will be removed ' +
        'in 8.0. To access request and/or response data moving forward, please enable debug logs for the ' +
        '"http.server.response" context in your logging configuration. For more details, see ' +
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx',
      correctiveActions: {
        manualSteps: [
          ...removeConfigsSteps,
          `enable debug logs for the "http.server.response" context in your logging configuration.`,
        ],
      },
    });
  }
};

const timezoneLoggingDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (settings.logging?.timezone) {
    addDeprecation({
      documentationUrl:
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx#loggingtimezone',
      message:
        '"logging.timezone" has been deprecated and will be removed ' +
        'in 8.0. To set the timezone moving forward, please add a timezone date modifier to the log pattern ' +
        'in your logging configuration. For more details, see ' +
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx',
      correctiveActions: {
        manualSteps: [
          `Remove "logging.timezone" from your kibana configs.`,
          `To set the timezone add a timezone date modifier to the log pattern in your logging configuration.`,
        ],
      },
    });
  }
};

const destLoggingDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (settings.logging?.dest) {
    addDeprecation({
      documentationUrl:
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx#loggingdest',
      message:
        '"logging.dest" has been deprecated and will be removed ' +
        'in 8.0. To set the destination moving forward, you can use the "console" appender ' +
        'in your logging configuration or define a custom one. For more details, see ' +
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx',
      correctiveActions: {
        manualSteps: [
          `Remove "logging.dest" from your kibana configs.`,
          `To set the destination use the "console" appender in your logging configuration or define a custom one.`,
        ],
      },
    });
  }
};

const quietLoggingDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (settings.logging?.quiet) {
    addDeprecation({
      documentationUrl:
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx#loggingquiet',
      message:
        '"logging.quiet" has been deprecated and will be removed ' +
        'in 8.0. Moving forward, you can use "logging.root.level:error" in your logging configuration. ',
      correctiveActions: {
        manualSteps: [
          `Remove "logging.quiet" from your kibana configs.`,
          `Use "logging.root.level:error" in your logging configuration.`,
        ],
      },
    });
  }
};

const silentLoggingDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (settings.logging?.silent) {
    addDeprecation({
      documentationUrl:
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx#loggingsilent',
      message:
        '"logging.silent" has been deprecated and will be removed ' +
        'in 8.0. Moving forward, you can use "logging.root.level:off" in your logging configuration. ',
      correctiveActions: {
        manualSteps: [
          `Remove "logging.silent" from your kibana configs.`,
          `Use "logging.root.level:off" in your logging configuration.`,
        ],
      },
    });
  }
};

const verboseLoggingDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (settings.logging?.verbose) {
    addDeprecation({
      documentationUrl:
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx#loggingverbose',
      message:
        '"logging.verbose" has been deprecated and will be removed ' +
        'in 8.0. Moving forward, you can use "logging.root.level:all" in your logging configuration. ',
      correctiveActions: {
        manualSteps: [
          `Remove "logging.verbose" from your kibana configs.`,
          `Use "logging.root.level:all" in your logging configuration.`,
        ],
      },
    });
  }
};

const jsonLoggingDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  // We silence the deprecation warning when running in development mode because
  // the dev CLI code in src/dev/cli_dev_mode/using_server_process.ts manually
  // specifies `--logging.json=false`. Since it's executed in a child process, the
  // ` legacyLoggingConfigSchema` returns `true` for the TTY check on `process.stdout.isTTY`
  if (settings.logging?.json && settings.env !== 'development') {
    addDeprecation({
      documentationUrl:
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx',
      message:
        '"logging.json" has been deprecated and will be removed ' +
        'in 8.0. To specify log message format moving forward, ' +
        'you can configure the "appender.layout" property for every custom appender in your logging configuration. ' +
        'There is currently no default layout for custom appenders and each one must be declared explicitly. ' +
        'For more details, see ' +
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx',
      correctiveActions: {
        manualSteps: [
          `Remove "logging.json" from your kibana configs.`,
          `Configure the "appender.layout" property for every custom appender in your logging configuration.`,
        ],
      },
    });
  }
};

const logRotateDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (settings.logging?.rotate) {
    addDeprecation({
      documentationUrl:
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx#rolling-file-appender',
      message:
        '"logging.rotate" and sub-options have been deprecated and will be removed in 8.0. ' +
        'Moving forward, you can enable log rotation using the "rolling-file" appender for a logger ' +
        'in your logging configuration. For more details, see ' +
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx#rolling-file-appender',
      correctiveActions: {
        manualSteps: [
          `Remove "logging.rotate" from your kibana configs.`,
          `Enable log rotation using the "rolling-file" appender for a logger in your logging configuration.`,
        ],
      },
    });
  }
};

const logEventsLogDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (settings.logging?.events?.log) {
    addDeprecation({
      documentationUrl:
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx#loggingevents',
      message:
        '"logging.events.log" has been deprecated and will be removed ' +
        'in 8.0. Moving forward, log levels can be customized on a per-logger basis using the new logging configuration.',
      correctiveActions: {
        manualSteps: [
          `Remove "logging.events.log" from your kibana configs.`,
          `Customize log levels can be per-logger using the new logging configuration.`,
        ],
      },
    });
  }
};

const logEventsErrorDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (settings.logging?.events?.error) {
    addDeprecation({
      documentationUrl:
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx#loggingevents',
      message:
        '"logging.events.error" has been deprecated and will be removed ' +
        'in 8.0. Moving forward, you can use "logging.root.level: error" in your logging configuration.',
      correctiveActions: {
        manualSteps: [
          `Remove "logging.events.error" from your kibana configs.`,
          `Use "logging.root.level: error" in your logging configuration.`,
        ],
      },
    });
  }
};

const logFilterDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (settings.logging?.filter) {
    addDeprecation({
      documentationUrl:
        'https://github.com/elastic/kibana/blob/master/src/core/server/logging/README.mdx#loggingfilter',
      message: '"logging.filter" has been deprecated and will be removed in 8.0.',
      correctiveActions: {
        manualSteps: [`Remove "logging.filter" from your kibana configs.`],
      },
    });
  }
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
