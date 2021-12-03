/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ConfigDeprecationProvider, ConfigDeprecation } from '@kbn/config';

const kibanaPathConf: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (process.env?.KIBANA_PATH_CONF) {
    addDeprecation({
      configPath: 'env.KIBANA_PATH_CONF',
      level: 'critical',
      message: `Environment variable "KIBANA_PATH_CONF" is deprecated. It has been replaced with "KBN_PATH_CONF" pointing to a config folder`,
      correctiveActions: {
        manualSteps: [
          'Use "KBN_PATH_CONF" instead of "KIBANA_PATH_CONF" to point to a config folder.',
        ],
      },
    });
  }
};

const configPathDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (process.env?.CONFIG_PATH) {
    addDeprecation({
      configPath: 'env.CONFIG_PATH',
      level: 'critical',
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
      configPath: 'env.DATA_PATH',
      level: 'critical',
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
      configPath: 'server.basePath',
      level: 'warning',
      title: 'Setting "server.rewriteBasePath" should be set when using "server.basePath"',
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
      configPath: 'server.cors',
      level: 'warning',
      title: 'Setting "server.cors" is deprecated',
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
                configPath: 'csp.rules',
                level: 'critical',
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
                configPath: 'csp.rules',
                level: 'critical',
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
      configPath: 'map.manifestServiceUrl',
      level: 'critical',
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

const serverHostZeroDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (settings.server?.host === '0') {
    addDeprecation({
      configPath: 'server.host',
      level: 'critical',
      message:
        'Support for setting server.host to "0" in kibana.yml is deprecated and will be removed in Kibana version 8.0.0. ' +
        'Instead use "0.0.0.0" to bind to all interfaces.',
      correctiveActions: {
        manualSteps: [
          `Replace "server.host: 0" to "server.host: 0.0.0.0" in your kibana configurations.`,
        ],
      },
    });
  }
  return settings;
};

const removeFromConfigStep = (setting: string) => {
  return i18n.translate('core.deprecations.common.removeFromConfig', {
    defaultMessage: `Remove "{setting}" from your kibana configuration.`,
    values: {
      setting,
    },
  });
};

const opsLoggingEventDeprecation: ConfigDeprecation = (
  settings,
  fromPath,
  addDeprecation,
  { branch }
) => {
  if (settings.logging?.events?.ops) {
    addDeprecation({
      configPath: 'logging.events.ops',
      level: 'critical',
      documentationUrl: `https://github.com/elastic/kibana/blob/${branch}/src/core/server/logging/README.mdx#loggingevents`,
      title: i18n.translate('core.deprecations.loggingEventsOps.deprecationTitle', {
        defaultMessage: `Setting "logging.events.ops" is deprecated`,
      }),
      message: i18n.translate('core.deprecations.loggingEventsOps.deprecationMessage', {
        defaultMessage:
          '"logging.events.ops" has been deprecated and will be removed ' +
          'in 8.0. To access ops data moving forward, please enable debug logs for the ' +
          '"metrics.ops" context in your logging configuration.',
      }),
      correctiveActions: {
        manualSteps: [
          removeFromConfigStep('logging.events.ops'),
          i18n.translate('core.deprecations.loggingEventsOps.manualSteps2', {
            defaultMessage: `Enable debug logs for the "metrics.ops" context in your logging configuration`,
          }),
        ],
      },
    });
  }
};

const requestLoggingEventDeprecation: ConfigDeprecation = (
  settings,
  fromPath,
  addDeprecation,
  { branch }
) => {
  if (settings.logging?.events?.request) {
    addDeprecation({
      configPath: 'logging.events.request',
      level: 'critical',
      documentationUrl: `https://github.com/elastic/kibana/blob/${branch}/src/core/server/logging/README.mdx#loggingevents`,
      title: i18n.translate('core.deprecations.loggingEventsRequest.deprecationTitle', {
        defaultMessage: `Setting "logging.events.request" is deprecated`,
      }),
      message: i18n.translate('core.deprecations.loggingEventsRequest.deprecationMessage', {
        defaultMessage:
          '"logging.events.request" has been deprecated and will be removed ' +
          'in 8.0. To access request data moving forward, please enable debug logs for the ' +
          '"http.server.response" context in your logging configuration.',
      }),
      correctiveActions: {
        manualSteps: [
          removeFromConfigStep('logging.events.request'),
          i18n.translate('core.deprecations.loggingEventsRequest.manualSteps2', {
            defaultMessage: `enable debug logs for the "http.server.response" context in your logging configuration.`,
          }),
        ],
      },
    });
  }
};

const responseLoggingEventDeprecation: ConfigDeprecation = (
  settings,
  fromPath,
  addDeprecation,
  { branch }
) => {
  if (settings.logging?.events?.response) {
    addDeprecation({
      configPath: 'logging.events.response',
      level: 'critical',
      documentationUrl: `https://github.com/elastic/kibana/blob/${branch}/src/core/server/logging/README.mdx#loggingevents`,
      title: i18n.translate('core.deprecations.loggingEventsResponse.deprecationTitle', {
        defaultMessage: `Setting "logging.events.response" is deprecated`,
      }),
      message: i18n.translate('core.deprecations.loggingEventsResponse.deprecationMessage', {
        defaultMessage:
          '"logging.events.response" has been deprecated and will be removed ' +
          'in 8.0. To access response data moving forward, please enable debug logs for the ' +
          '"http.server.response" context in your logging configuration.',
      }),
      correctiveActions: {
        manualSteps: [
          removeFromConfigStep('logging.events.response'),
          i18n.translate('core.deprecations.loggingEventsResponse.manualSteps2', {
            defaultMessage: `enable debug logs for the "http.server.response" context in your logging configuration.`,
          }),
        ],
      },
    });
  }
};

const timezoneLoggingDeprecation: ConfigDeprecation = (
  settings,
  fromPath,
  addDeprecation,
  { branch }
) => {
  if (settings.logging?.timezone) {
    addDeprecation({
      configPath: 'logging.timezone',
      level: 'critical',
      documentationUrl: `https://github.com/elastic/kibana/blob/${branch}/src/core/server/logging/README.mdx#loggingtimezone`,
      title: i18n.translate('core.deprecations.loggingTimezone.deprecationTitle', {
        defaultMessage: `Setting "logging.timezone" is deprecated`,
      }),
      message: i18n.translate('core.deprecations.loggingTimezone.deprecationMessage', {
        defaultMessage:
          '"logging.timezone" has been deprecated and will be removed ' +
          'in 8.0. To set the timezone moving forward, please add a timezone date modifier to the log pattern ' +
          'in your logging configuration.',
      }),
      correctiveActions: {
        manualSteps: [
          removeFromConfigStep('logging.timezone'),
          i18n.translate('core.deprecations.loggingTimezone.manualSteps2', {
            defaultMessage: `To set the timezone add a timezone date modifier to the log pattern in your logging configuration.`,
          }),
        ],
      },
    });
  }
};

const destLoggingDeprecation: ConfigDeprecation = (
  settings,
  fromPath,
  addDeprecation,
  { branch }
) => {
  if (settings.logging?.dest) {
    addDeprecation({
      configPath: 'logging.dest',
      level: 'critical',
      documentationUrl: `https://www.elastic.co/guide/en/kibana/${branch}/logging-settings.html#log-to-file-example`,
      title: i18n.translate('core.deprecations.loggingDest.deprecationTitle', {
        defaultMessage: `Setting "logging.dest" is deprecated`,
      }),
      message: i18n.translate('core.deprecations.loggingDest.deprecationMessage', {
        defaultMessage:
          '"logging.dest" has been deprecated and will be removed ' +
          'in 8.0. To set the destination moving forward, you can use the "console" appender ' +
          'in your logging configuration or define a custom one.',
      }),
      correctiveActions: {
        manualSteps: [
          removeFromConfigStep('logging.dest'),
          i18n.translate('core.deprecations.loggingDest.manualSteps2', {
            defaultMessage: `To set the destination use the "console" appender in your logging configuration or define a custom one.`,
          }),
        ],
      },
    });
  }
};

const quietLoggingDeprecation: ConfigDeprecation = (
  settings,
  fromPath,
  addDeprecation,
  { branch }
) => {
  if (settings.logging?.quiet) {
    addDeprecation({
      configPath: 'logging.quiet',
      level: 'critical',
      documentationUrl: `https://www.elastic.co/guide/en/kibana/${branch}/logging-service.html#log-level`,
      title: i18n.translate('core.deprecations.loggingQuiet.deprecationTitle', {
        defaultMessage: `Setting "logging.quiet" is deprecated`,
      }),
      message: i18n.translate('core.deprecations.loggingQuiet.deprecationMessage', {
        defaultMessage:
          '"logging.quiet" has been deprecated and will be removed ' +
          'in 8.0. Moving forward, you can use "logging.root.level:error" in your logging configuration.',
      }),
      correctiveActions: {
        manualSteps: [
          removeFromConfigStep('logging.quiet'),
          i18n.translate('core.deprecations.loggingQuiet.manualSteps2', {
            defaultMessage: `Use "logging.root.level:error" in your logging configuration.`,
          }),
        ],
      },
    });
  }
};

const silentLoggingDeprecation: ConfigDeprecation = (
  settings,
  fromPath,
  addDeprecation,
  { branch }
) => {
  if (settings.logging?.silent) {
    addDeprecation({
      configPath: 'logging.silent',
      level: 'critical',
      documentationUrl: `https://www.elastic.co/guide/en/kibana/${branch}/logging-service.html#log-level`,
      title: i18n.translate('core.deprecations.loggingSilent.deprecationTitle', {
        defaultMessage: `Setting "logging.silent" is deprecated`,
      }),
      message: i18n.translate('core.deprecations.loggingSilent.deprecationMessage', {
        defaultMessage:
          '"logging.silent" has been deprecated and will be removed ' +
          'in 8.0. Moving forward, you can use "logging.root.level:off" in your logging configuration.',
      }),
      correctiveActions: {
        manualSteps: [
          removeFromConfigStep('logging.silent'),
          i18n.translate('core.deprecations.loggingSilent.manualSteps2', {
            defaultMessage: `Use "logging.root.level:off" in your logging configuration.`,
          }),
        ],
      },
    });
  }
};

const verboseLoggingDeprecation: ConfigDeprecation = (
  settings,
  fromPath,
  addDeprecation,
  { branch }
) => {
  if (settings.logging?.verbose) {
    addDeprecation({
      configPath: 'logging.verbose',
      level: 'critical',
      documentationUrl: `https://www.elastic.co/guide/en/kibana/${branch}/logging-service.html#log-level`,
      title: i18n.translate('core.deprecations.loggingVerbose.deprecationTitle', {
        defaultMessage: `Setting "logging.verbose" is deprecated`,
      }),
      message: i18n.translate('core.deprecations.loggingVerbose.deprecationMessage', {
        defaultMessage:
          '"logging.verbose" has been deprecated and will be removed ' +
          'in 8.0. Moving forward, you can use "logging.root.level:all" in your logging configuration.',
      }),
      correctiveActions: {
        manualSteps: [
          removeFromConfigStep('logging.verbose'),
          i18n.translate('core.deprecations.loggingVerbose.manualSteps2', {
            defaultMessage: `Use "logging.root.level:all" in your logging configuration.`,
          }),
        ],
      },
    });
  }
};

const jsonLoggingDeprecation: ConfigDeprecation = (
  settings,
  fromPath,
  addDeprecation,
  { branch }
) => {
  // We silence the deprecation warning when running in development mode because
  // the dev CLI code in src/dev/cli_dev_mode/using_server_process.ts manually
  // specifies `--logging.json=false`. Since it's executed in a child process, the
  // ` legacyLoggingConfigSchema` returns `true` for the TTY check on `process.stdout.isTTY`
  if (settings.logging?.json && settings.env !== 'development') {
    addDeprecation({
      configPath: 'logging.json',
      level: 'critical',
      documentationUrl: `https://www.elastic.co/guide/en/kibana/${branch}/logging-service.html#json-layout`,
      title: i18n.translate('core.deprecations.loggingJson.deprecationTitle', {
        defaultMessage: `Setting "logging.json" is deprecated`,
      }),
      message: i18n.translate('core.deprecations.loggingJson.deprecationMessage', {
        defaultMessage:
          '"logging.json" has been deprecated and will be removed ' +
          'in 8.0. To specify log message format moving forward, ' +
          'you can configure the "appender.layout" property for every custom appender in your logging configuration. ' +
          'There is currently no default layout for custom appenders and each one must be declared explicitly.',
      }),
      correctiveActions: {
        manualSteps: [
          removeFromConfigStep('logging.json'),
          i18n.translate('core.deprecations.loggingJson.manualSteps2', {
            defaultMessage: `Configure the "appender.layout" property for every custom appender in your logging configuration.`,
          }),
        ],
      },
    });
  }
};

const logRotateDeprecation: ConfigDeprecation = (
  settings,
  fromPath,
  addDeprecation,
  { branch }
) => {
  if (settings.logging?.rotate) {
    addDeprecation({
      configPath: 'logging.rotate',
      level: 'critical',
      documentationUrl: `https://www.elastic.co/guide/en/kibana/${branch}/logging-service.html#rolling-file-appender`,
      title: i18n.translate('core.deprecations.loggingRotate.deprecationTitle', {
        defaultMessage: `Setting "logging.rotate" is deprecated`,
      }),
      message: i18n.translate('core.deprecations.loggingRotate.deprecationMessage', {
        defaultMessage:
          '"logging.rotate" and sub-options have been deprecated and will be removed in 8.0. ' +
          'Moving forward, you can enable log rotation using the "rolling-file" appender for a logger ' +
          'in your logging configuration.',
      }),
      correctiveActions: {
        manualSteps: [
          removeFromConfigStep('logging.rotate'),
          i18n.translate('core.deprecations.loggingRotate.manualSteps2', {
            defaultMessage: `Enable log rotation using the "rolling-file" appender for a logger in your logging configuration.`,
          }),
        ],
      },
    });
  }
};

const logEventsLogDeprecation: ConfigDeprecation = (
  settings,
  fromPath,
  addDeprecation,
  { branch }
) => {
  if (settings.logging?.events?.log) {
    addDeprecation({
      configPath: 'logging.events.log',
      level: 'critical',
      documentationUrl: `https://www.elastic.co/guide/en/kibana/${branch}/logging-service.html#log-level`,
      title: i18n.translate('core.deprecations.loggingEventsLog.deprecationTitle', {
        defaultMessage: `Setting "logging.events.log" is deprecated`,
      }),
      message: i18n.translate('core.deprecations.loggingEventsLog.deprecationMessage', {
        defaultMessage:
          '"logging.events.log" has been deprecated and will be removed ' +
          'in 8.0. Moving forward, log levels can be customized on a per-logger basis using the new logging configuration.',
      }),
      correctiveActions: {
        manualSteps: [
          removeFromConfigStep('logging.events.log'),
          i18n.translate('core.deprecations.loggingEventsLog.manualSteps2', {
            defaultMessage: `Customized log levels can be per-logger using the new logging configuration.`,
          }),
        ],
      },
    });
  }
};

const logEventsErrorDeprecation: ConfigDeprecation = (
  settings,
  fromPath,
  addDeprecation,
  { branch }
) => {
  if (settings.logging?.events?.error) {
    addDeprecation({
      configPath: 'logging.events.error',
      level: 'critical',
      documentationUrl: `https://www.elastic.co/guide/en/kibana/${branch}/logging-service.html#log-level`,
      title: i18n.translate('core.deprecations.loggingEventsError.deprecationTitle', {
        defaultMessage: `Setting "logging.events.error" is deprecated`,
      }),
      message: i18n.translate('core.deprecations.loggingEventsError.deprecationMessage', {
        defaultMessage:
          '"logging.events.error" has been deprecated and will be removed ' +
          'in 8.0. Moving forward, you can use "logging.root.level: error" in your logging configuration.',
      }),
      correctiveActions: {
        manualSteps: [
          removeFromConfigStep('logging.events.error'),
          i18n.translate('core.deprecations.loggingEventsError.manualSteps2', {
            defaultMessage: `Use "logging.root.level: error" in your logging configuration.`,
          }),
        ],
      },
    });
  }
};

const logFilterDeprecation: ConfigDeprecation = (
  settings,
  fromPath,
  addDeprecation,
  { branch }
) => {
  if (settings.logging?.filter) {
    addDeprecation({
      configPath: 'logging.filter',
      level: 'critical',
      title: i18n.translate('core.deprecations.loggingFilter.deprecationTitle', {
        defaultMessage: `Setting "logging.filter" is deprecated`,
      }),
      message: i18n.translate('core.deprecations.loggingFilter.deprecationMessage', {
        defaultMessage: '"logging.filter" has been deprecated and will be removed in 8.0.',
      }),
      correctiveActions: {
        manualSteps: [removeFromConfigStep('logging.filter')],
      },
    });
  }
};

const logFormatDeprecation: ConfigDeprecation = (
  settings,
  fromPath,
  addDeprecation,
  { branch }
) => {
  addDeprecation({
    configPath: 'logging',
    level: 'warning',
    documentationUrl: `https://www.elastic.co/guide/en/kibana/${branch}/logging-configuration-migration.html`,
    title: i18n.translate('core.deprecations.loggingFormat.deprecationTitle', {
      defaultMessage: `Kibana's logging format is changing in 8.0`,
    }),
    message: i18n.translate('core.deprecations.loggingFormat.deprecationMessage', {
      defaultMessage:
        'Starting in 8.0, the Kibana logging format will be changing. ' +
        'This may affect you if you are doing any special handling of your Kibana logs, ' +
        'such as ingesting logs into Elasticsearch for further analysis. ' +
        'If you are using the new logging configuration, you are already receiving logs in both ' +
        'old and new formats, and the old format will simply be going away. ' +
        'If you are not yet using the new logging configuration, the log format will change ' +
        'upon upgrade to 8.0. Beginning in 8.0, the format of JSON logs will be ECS-compatible JSON, ' +
        'and the default pattern log format will be configurable with our new logging system. ' +
        'Please refer to the documentation for more information about the new logging format.',
    }),
    correctiveActions: {
      manualSteps: [
        i18n.translate('core.deprecations.loggingFormat.manualSteps1', {
          defaultMessage: `Determine whether your infrastructure is relying on Kibana's legacy log format.`,
        }),
        i18n.translate('core.deprecations.loggingFormat.manualSteps2', {
          defaultMessage: `Learn more about our new logging system by checking out the documentation.`,
        }),
        i18n.translate('core.deprecations.loggingFormat.manualSteps3', {
          defaultMessage: `Learn more about ECS at https://www.elastic.co/guide/en/ecs/8.0/ecs-reference.html.`,
        }),
        i18n.translate('core.deprecations.loggingFormat.manualSteps4', {
          defaultMessage: `Update your ingest tooling to use the new logging format.`,
        }),
      ],
    },
  });
};

export const coreDeprecationProvider: ConfigDeprecationProvider = ({
  unusedFromRoot,
  renameFromRoot,
}) => [
  unusedFromRoot('savedObjects.indexCheckTimeout', { level: 'critical' }),
  unusedFromRoot('server.xsrf.token', { level: 'critical' }),
  unusedFromRoot('maps.manifestServiceUrl', { level: 'critical' }),
  unusedFromRoot('optimize.lazy', { level: 'critical' }),
  unusedFromRoot('optimize.lazyPort', { level: 'critical' }),
  unusedFromRoot('optimize.lazyHost', { level: 'critical' }),
  unusedFromRoot('optimize.lazyPrebuild', { level: 'critical' }),
  unusedFromRoot('optimize.lazyProxyTimeout', { level: 'critical' }),
  unusedFromRoot('optimize.enabled', { level: 'critical' }),
  unusedFromRoot('optimize.bundleFilter', { level: 'critical' }),
  unusedFromRoot('optimize.bundleDir', { level: 'critical' }),
  unusedFromRoot('optimize.viewCaching', { level: 'critical' }),
  unusedFromRoot('optimize.watch', { level: 'critical' }),
  unusedFromRoot('optimize.watchPort', { level: 'critical' }),
  unusedFromRoot('optimize.watchHost', { level: 'critical' }),
  unusedFromRoot('optimize.watchPrebuild', { level: 'critical' }),
  unusedFromRoot('optimize.watchProxyTimeout', { level: 'critical' }),
  unusedFromRoot('optimize.useBundleCache', { level: 'critical' }),
  unusedFromRoot('optimize.sourceMaps', { level: 'critical' }),
  unusedFromRoot('optimize.workers', { level: 'critical' }),
  unusedFromRoot('optimize.profile', { level: 'critical' }),
  unusedFromRoot('optimize.validateSyntaxOfNodeModules', { level: 'critical' }),
  renameFromRoot('xpack.xpack_main.telemetry.config', 'telemetry.config', { level: 'critical' }),
  renameFromRoot('xpack.xpack_main.telemetry.url', 'telemetry.url', { level: 'critical' }),
  renameFromRoot('xpack.xpack_main.telemetry.enabled', 'telemetry.enabled', { level: 'critical' }),
  renameFromRoot('xpack.telemetry.enabled', 'telemetry.enabled', { level: 'critical' }),
  renameFromRoot('xpack.telemetry.config', 'telemetry.config', { level: 'critical' }),
  renameFromRoot('xpack.telemetry.banner', 'telemetry.banner', { level: 'critical' }),
  renameFromRoot('xpack.telemetry.url', 'telemetry.url', { level: 'critical' }),
  renameFromRoot('cpu.cgroup.path.override', 'ops.cGroupOverrides.cpuPath', { level: 'critical' }),
  renameFromRoot('cpuacct.cgroup.path.override', 'ops.cGroupOverrides.cpuAcctPath', {
    level: 'critical',
  }),
  renameFromRoot('server.xsrf.whitelist', 'server.xsrf.allowlist', { level: 'critical' }),
  unusedFromRoot('elasticsearch.preserveHost', { level: 'critical' }),
  unusedFromRoot('elasticsearch.startupTimeout', { level: 'critical' }),
  rewriteCorsSettings,
  configPathDeprecation,
  kibanaPathConf,
  dataPathDeprecation,
  rewriteBasePathDeprecation,
  cspRulesDeprecation,
  mapManifestServiceUrlDeprecation,
  serverHostZeroDeprecation,
  opsLoggingEventDeprecation,
  requestLoggingEventDeprecation,
  responseLoggingEventDeprecation,
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
  logFormatDeprecation,
];
