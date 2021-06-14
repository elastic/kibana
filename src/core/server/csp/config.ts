/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TypeOf, schema } from '@kbn/config-schema';
import { ServiceConfigDescriptor } from '../internal_types';

const configSchema = schema.object(
  {
    rules: schema.maybe(schema.arrayOf(schema.string())),
    script_src: schema.arrayOf(schema.string(), { defaultValue: [] }),
    worker_src: schema.arrayOf(schema.string(), { defaultValue: [] }),
    style_src: schema.arrayOf(schema.string(), { defaultValue: [] }),
    strict: schema.boolean({ defaultValue: true }),
    warnLegacyBrowsers: schema.boolean({ defaultValue: true }),
    disableEmbedding: schema.oneOf([schema.literal<boolean>(false)], { defaultValue: false }),
  },
  {
    validate: (cspConfig) => {
      if (
        cspConfig.rules &&
        (cspConfig.script_src.length || cspConfig.worker_src.length || cspConfig.style_src.length)
      ) {
        return `"csp.rules" cannot be used when specifying per-directive additions such as "script_src", "worker_src" or "style_src"`;
      }
    },
  }
);

/**
 * @internal
 */
export type CspConfigType = TypeOf<typeof configSchema>;

export const config: ServiceConfigDescriptor<CspConfigType> = {
  // TODO: Move this to server.csp using config deprecations
  // ? https://github.com/elastic/kibana/pull/52251
  path: 'csp',
  schema: configSchema,
  deprecations: () => [
    (rawConfig, fromPath, addDeprecation) => {
      const cspConfig = rawConfig[fromPath];
      if (cspConfig?.rules) {
        addDeprecation({
          message:
            'csp.rules is deprecated in favor of per-directive definitions. ' +
            'Please use `csp.script_src`, `csp.worker_src` and `csp.style_src` instead',
          correctiveActions: {
            manualSteps: [
              `Remove "csp.rules" from the Kibana config file"`,
              `Add per-directive definitions to the config file, using "csp.script_src", "csp.worker_src" and "csp.style_src"`,
            ],
          },
        });
      }
    },
  ],
};
