/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SemVer } from 'semver';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from 'kibana/server';

import { MAJOR_VERSION } from '../common/constants';

const kibanaVersion = new SemVer(MAJOR_VERSION);

// -------------------------------
// >= 8.x
// -------------------------------
const schemaLatest = schema.object(
  {
    ui: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
  },
  { defaultValue: undefined }
);

const configLatest: PluginConfigDescriptor<ConsoleConfig> = {
  exposeToBrowser: {
    ui: true,
  },
  schema: schemaLatest,
  deprecations: () => [],
};

export type ConsoleConfig = TypeOf<typeof schemaLatest>;

// -------------------------------
// 7.x
// -------------------------------
const schema7x = schema.object(
  {
    enabled: schema.boolean({ defaultValue: true }),
    proxyFilter: schema.arrayOf(schema.string(), { defaultValue: ['.*'] }),
    proxyConfig: schema.arrayOf(
      schema.object({
        match: schema.object({
          protocol: schema.string({ defaultValue: '*' }),
          host: schema.string({ defaultValue: '*' }),
          port: schema.string({ defaultValue: '*' }),
          path: schema.string({ defaultValue: '*' }),
        }),

        timeout: schema.number(),
        ssl: schema.object(
          {
            verify: schema.boolean(),
            ca: schema.arrayOf(schema.string()),
            cert: schema.string(),
            key: schema.string(),
          },
          { defaultValue: undefined }
        ),
      }),
      { defaultValue: [] }
    ),
    ssl: schema.object({ verify: schema.boolean({ defaultValue: false }) }, {}),
    ui: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
  },
  { defaultValue: undefined }
);

export type ConsoleConfig7x = TypeOf<typeof schema7x>;

const config7x: PluginConfigDescriptor<ConsoleConfig7x> = {
  exposeToBrowser: {
    ui: true,
  },
  schema: schema7x,
  deprecations: ({ unused }) => [
    unused('ssl', { level: 'critical' }),
    (completeConfig, rootPath, addDeprecation) => {
      if (get(completeConfig, 'console.enabled') === undefined) {
        return completeConfig;
      }

      addDeprecation({
        configPath: 'console.enabled',
        level: 'critical',
        title: i18n.translate('console.deprecations.enabledTitle', {
          defaultMessage: 'Setting "console.enabled" is deprecated',
        }),
        message: i18n.translate('console.deprecations.enabledMessage', {
          defaultMessage:
            'To disallow users from accessing the Console UI, use the "console.ui.enabled" setting instead of "console.enabled".',
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('console.deprecations.enabled.manualStepOneMessage', {
              defaultMessage: 'Open the kibana.yml config file.',
            }),
            i18n.translate('console.deprecations.enabled.manualStepTwoMessage', {
              defaultMessage: 'Change the "console.enabled" setting to "console.ui.enabled".',
            }),
          ],
        },
      });
      return completeConfig;
    },
    (completeConfig, rootPath, addDeprecation) => {
      if (get(completeConfig, 'console.proxyConfig') === undefined) {
        return completeConfig;
      }

      addDeprecation({
        configPath: 'console.proxyConfig',
        level: 'critical',
        title: i18n.translate('console.deprecations.proxyConfigTitle', {
          defaultMessage: 'Setting "console.proxyConfig" is deprecated',
        }),
        message: i18n.translate('console.deprecations.proxyConfigMessage', {
          defaultMessage:
            'Configuring "console.proxyConfig" is deprecated and will be removed in 8.0.0. To secure your connection between Kibana and Elasticsearch use the standard "server.ssl.*" settings instead.',
        }),
        documentationUrl: 'https://ela.st/encrypt-kibana-browser',
        correctiveActions: {
          manualSteps: [
            i18n.translate('console.deprecations.proxyConfig.manualStepOneMessage', {
              defaultMessage: 'Open the kibana.yml config file.',
            }),
            i18n.translate('console.deprecations.proxyConfig.manualStepTwoMessage', {
              defaultMessage: 'Remove the "console.proxyConfig" setting.',
            }),
            i18n.translate('console.deprecations.proxyConfig.manualStepThreeMessage', {
              defaultMessage:
                'Configure the secure connection between Kibana and Elasticsearch using the "server.ssl.*" settings.',
            }),
          ],
        },
      });
      return completeConfig;
    },
    (completeConfig, rootPath, addDeprecation) => {
      if (get(completeConfig, 'console.proxyFilter') === undefined) {
        return completeConfig;
      }

      addDeprecation({
        configPath: 'console.proxyFilter',
        level: 'critical',
        title: i18n.translate('console.deprecations.proxyFilterTitle', {
          defaultMessage: 'Setting "console.proxyFilter" is deprecated',
        }),
        message: i18n.translate('console.deprecations.proxyFilterMessage', {
          defaultMessage:
            'Configuring "console.proxyFilter" is deprecated and will be removed in 8.0.0. To secure your connection between Kibana and Elasticsearch use the standard "server.ssl.*" settings instead.',
        }),
        documentationUrl: 'https://ela.st/encrypt-kibana-browser',
        correctiveActions: {
          manualSteps: [
            i18n.translate('console.deprecations.proxyFilter.manualStepOneMessage', {
              defaultMessage: 'Open the kibana.yml config file.',
            }),
            i18n.translate('console.deprecations.proxyFilter.manualStepTwoMessage', {
              defaultMessage: 'Remove the "console.proxyFilter" setting.',
            }),
            i18n.translate('console.deprecations.proxyFilter.manualStepThreeMessage', {
              defaultMessage:
                'Configure the secure connection between Kibana and Elasticsearch using the "server.ssl.*" settings.',
            }),
          ],
        },
      });
      return completeConfig;
    },
  ],
};

export const config: PluginConfigDescriptor<ConsoleConfig | ConsoleConfig7x> =
  kibanaVersion.major < 8 ? config7x : configLatest;
