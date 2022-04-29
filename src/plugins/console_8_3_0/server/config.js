"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.config = void 0;

var _semver = require("semver");

var _i18n = require("@kbn/i18n");

var _lodash = require("lodash");

var _configSchema = require("@kbn/config-schema");

var _constants = require("../common/constants");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const kibanaVersion = new _semver.SemVer(_constants.MAJOR_VERSION); // -------------------------------
// >= 8.x
// -------------------------------

const schemaLatest = _configSchema.schema.object({
  ui: _configSchema.schema.object({
    enabled: _configSchema.schema.boolean({
      defaultValue: true
    })
  })
}, {
  defaultValue: undefined
});

const configLatest = {
  exposeToBrowser: {
    ui: true
  },
  schema: schemaLatest,
  deprecations: () => []
};

// -------------------------------
// 7.x
// -------------------------------
const schema7x = _configSchema.schema.object({
  enabled: _configSchema.schema.boolean({
    defaultValue: true
  }),
  proxyFilter: _configSchema.schema.arrayOf(_configSchema.schema.string(), {
    defaultValue: ['.*']
  }),
  proxyConfig: _configSchema.schema.arrayOf(_configSchema.schema.object({
    match: _configSchema.schema.object({
      protocol: _configSchema.schema.string({
        defaultValue: '*'
      }),
      host: _configSchema.schema.string({
        defaultValue: '*'
      }),
      port: _configSchema.schema.string({
        defaultValue: '*'
      }),
      path: _configSchema.schema.string({
        defaultValue: '*'
      })
    }),
    timeout: _configSchema.schema.number(),
    ssl: _configSchema.schema.object({
      verify: _configSchema.schema.boolean(),
      ca: _configSchema.schema.arrayOf(_configSchema.schema.string()),
      cert: _configSchema.schema.string(),
      key: _configSchema.schema.string()
    }, {
      defaultValue: undefined
    })
  }), {
    defaultValue: []
  }),
  ssl: _configSchema.schema.object({
    verify: _configSchema.schema.boolean({
      defaultValue: false
    })
  }, {}),
  ui: _configSchema.schema.object({
    enabled: _configSchema.schema.boolean({
      defaultValue: true
    })
  })
}, {
  defaultValue: undefined
});

const config7x = {
  exposeToBrowser: {
    ui: true
  },
  schema: schema7x,
  deprecations: ({
    unused
  }) => [unused('ssl', {
    level: 'critical'
  }), (completeConfig, rootPath, addDeprecation) => {
    if ((0, _lodash.get)(completeConfig, 'console.enabled') === undefined) {
      return completeConfig;
    }

    addDeprecation({
      configPath: 'console.enabled',
      level: 'critical',
      title: _i18n.i18n.translate('console.deprecations.enabledTitle', {
        defaultMessage: 'Setting "console.enabled" is deprecated'
      }),
      message: _i18n.i18n.translate('console.deprecations.enabledMessage', {
        defaultMessage: 'To disallow users from accessing the Console UI, use the "console.ui.enabled" setting instead of "console.enabled".'
      }),
      correctiveActions: {
        manualSteps: [_i18n.i18n.translate('console.deprecations.enabled.manualStepOneMessage', {
          defaultMessage: 'Open the kibana.yml config file.'
        }), _i18n.i18n.translate('console.deprecations.enabled.manualStepTwoMessage', {
          defaultMessage: 'Change the "console.enabled" setting to "console.ui.enabled".'
        })]
      }
    });
    return completeConfig;
  }, (completeConfig, rootPath, addDeprecation) => {
    if ((0, _lodash.get)(completeConfig, 'console.proxyConfig') === undefined) {
      return completeConfig;
    }

    addDeprecation({
      configPath: 'console.proxyConfig',
      level: 'critical',
      title: _i18n.i18n.translate('console.deprecations.proxyConfigTitle', {
        defaultMessage: 'Setting "console.proxyConfig" is deprecated'
      }),
      message: _i18n.i18n.translate('console.deprecations.proxyConfigMessage', {
        defaultMessage: 'Configuring "console.proxyConfig" is deprecated and will be removed in 8.0.0. To secure your connection between Kibana and Elasticsearch use the standard "server.ssl.*" settings instead.'
      }),
      documentationUrl: 'https://ela.st/encrypt-kibana-browser',
      correctiveActions: {
        manualSteps: [_i18n.i18n.translate('console.deprecations.proxyConfig.manualStepOneMessage', {
          defaultMessage: 'Open the kibana.yml config file.'
        }), _i18n.i18n.translate('console.deprecations.proxyConfig.manualStepTwoMessage', {
          defaultMessage: 'Remove the "console.proxyConfig" setting.'
        }), _i18n.i18n.translate('console.deprecations.proxyConfig.manualStepThreeMessage', {
          defaultMessage: 'Configure the secure connection between Kibana and Elasticsearch using the "server.ssl.*" settings.'
        })]
      }
    });
    return completeConfig;
  }, (completeConfig, rootPath, addDeprecation) => {
    if ((0, _lodash.get)(completeConfig, 'console.proxyFilter') === undefined) {
      return completeConfig;
    }

    addDeprecation({
      configPath: 'console.proxyFilter',
      level: 'critical',
      title: _i18n.i18n.translate('console.deprecations.proxyFilterTitle', {
        defaultMessage: 'Setting "console.proxyFilter" is deprecated'
      }),
      message: _i18n.i18n.translate('console.deprecations.proxyFilterMessage', {
        defaultMessage: 'Configuring "console.proxyFilter" is deprecated and will be removed in 8.0.0. To secure your connection between Kibana and Elasticsearch use the standard "server.ssl.*" settings instead.'
      }),
      documentationUrl: 'https://ela.st/encrypt-kibana-browser',
      correctiveActions: {
        manualSteps: [_i18n.i18n.translate('console.deprecations.proxyFilter.manualStepOneMessage', {
          defaultMessage: 'Open the kibana.yml config file.'
        }), _i18n.i18n.translate('console.deprecations.proxyFilter.manualStepTwoMessage', {
          defaultMessage: 'Remove the "console.proxyFilter" setting.'
        }), _i18n.i18n.translate('console.deprecations.proxyFilter.manualStepThreeMessage', {
          defaultMessage: 'Configure the secure connection between Kibana and Elasticsearch using the "server.ssl.*" settings.'
        })]
      }
    });
    return completeConfig;
  }]
};
const config = kibanaVersion.major < 8 ? config7x : configLatest;
exports.config = config;