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
    ssl: schema.object({ verify: schema.boolean({ defaultValue: false }) }, {}),
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
  deprecations: ({ deprecate, unused }) => [
    deprecate('proxyFilter', '8.0.0'),
    deprecate('proxyConfig', '8.0.0'),
    unused('ssl'),
    (completeConfig, rootPath, addDeprecation) => {
      if (get(completeConfig, 'console.enabled') === undefined) {
        return completeConfig;
      }

      addDeprecation({
        title: i18n.translate('console.deprecations.enabledTitle', {
          defaultMessage: 'Setting "console.enabled" is deprecated',
        }),
        message: i18n.translate('console.deprecations.enabledMessage', {
          defaultMessage: 'Use the "console.ui.enabled" setting instead of "console.enabled".',
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
  ],
};

export const config: PluginConfigDescriptor<ConsoleConfig | ConsoleConfig7x> =
  kibanaVersion.major < 8 ? config7x : configLatest;
