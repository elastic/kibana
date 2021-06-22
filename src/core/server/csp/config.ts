/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TypeOf, schema } from '@kbn/config-schema';
import { ServiceConfigDescriptor } from '../internal_types';

const validateDirectiveValues = (values: string[]) => {};

const cspDirectiveSchema = schema.arrayOf(schema.string(), {
  defaultValue: [],
  validate: validateDirectiveValues,
});

const configSchema = schema.object(
  {
    rules: schema.maybe(schema.arrayOf(schema.string())),
    script_src: cspDirectiveSchema,
    worker_src: cspDirectiveSchema,
    style_src: cspDirectiveSchema,
    connect_src: cspDirectiveSchema,
    default_src: cspDirectiveSchema,
    font_src: cspDirectiveSchema,
    frame_src: cspDirectiveSchema,
    img_src: cspDirectiveSchema,
    frame_ancestors: cspDirectiveSchema,
    report_uri: cspDirectiveSchema,
    report_to: cspDirectiveSchema,
    strict: schema.boolean({ defaultValue: true }),
    warnLegacyBrowsers: schema.boolean({ defaultValue: true }),
    disableEmbedding: schema.oneOf([schema.literal<boolean>(false)], { defaultValue: false }),
  },
  {
    validate: (cspConfig) => {
      if (cspConfig.rules && hasDirectiveSpecified(cspConfig)) {
        return `"csp.rules" cannot be used when specifying per-directive additions such as "script_src", "worker_src" or "style_src"`;
      }
    },
  }
);

const hasDirectiveSpecified = (rawConfig: CspConfigType): boolean => {
  return Boolean(
    rawConfig.script_src.length ||
      rawConfig.worker_src.length ||
      rawConfig.style_src.length ||
      rawConfig.connect_src.length ||
      rawConfig.default_src.length ||
      rawConfig.font_src.length ||
      rawConfig.frame_src.length ||
      rawConfig.img_src.length ||
      rawConfig.frame_ancestors.length ||
      rawConfig.report_uri.length ||
      rawConfig.report_to.length
  );
};

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
            'csp.rules is deprecated in favor of directive specific configuration. ' +
            'Please use `csp.script_src`, `csp.worker_src` and `csp.style_src` instead',
          correctiveActions: {
            manualSteps: [
              `Remove "csp.rules" from the Kibana config file"`,
              `Add directive specific configurations to the config file, using "csp.script_src", "csp.worker_src" and "csp.style_src"`,
            ],
          },
        });
      }
    },
  ],
};
