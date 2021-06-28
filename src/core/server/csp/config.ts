/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TypeOf, schema } from '@kbn/config-schema';
import { ServiceConfigDescriptor } from '../internal_types';

interface DirectiveValidationOptions {
  allowNone: boolean;
  allowNonce: boolean;
}

const getDirectiveValidator = (options: DirectiveValidationOptions) => {
  const validateValue = getDirectiveValueValidator(options);
  return (values: string[]) => {
    for (const value of values) {
      const error = validateValue(value);
      if (error) {
        return error;
      }
    }
  };
};

const getDirectiveValueValidator = ({ allowNone, allowNonce }: DirectiveValidationOptions) => {
  return (value: string) => {
    if (!allowNonce && value.startsWith('nonce-')) {
      return `using "nonce-*" is considered insecure and is not allowed`;
    }
    if (!allowNone && (value === `none` || value === `'none'`)) {
      return `using "none" would conflict with Kibana's default csp configuration and is not allowed`;
    }
  };
};

const configSchema = schema.object(
  {
    rules: schema.maybe(schema.arrayOf(schema.string())),
    script_src: schema.arrayOf(schema.string(), {
      defaultValue: [],
      validate: getDirectiveValidator({ allowNone: false, allowNonce: false }),
    }),
    worker_src: schema.arrayOf(schema.string(), {
      defaultValue: [],
      validate: getDirectiveValidator({ allowNone: false, allowNonce: false }),
    }),
    style_src: schema.arrayOf(schema.string(), {
      defaultValue: [],
      validate: getDirectiveValidator({ allowNone: false, allowNonce: false }),
    }),
    connect_src: schema.arrayOf(schema.string(), {
      defaultValue: [],
      validate: getDirectiveValidator({ allowNone: false, allowNonce: false }),
    }),
    default_src: schema.arrayOf(schema.string(), {
      defaultValue: [],
      validate: getDirectiveValidator({ allowNone: false, allowNonce: false }),
    }),
    font_src: schema.arrayOf(schema.string(), {
      defaultValue: [],
      validate: getDirectiveValidator({ allowNone: false, allowNonce: false }),
    }),
    frame_src: schema.arrayOf(schema.string(), {
      defaultValue: [],
      validate: getDirectiveValidator({ allowNone: false, allowNonce: false }),
    }),
    img_src: schema.arrayOf(schema.string(), {
      defaultValue: [],
      validate: getDirectiveValidator({ allowNone: false, allowNonce: false }),
    }),
    frame_ancestors: schema.arrayOf(schema.string(), {
      defaultValue: [],
      validate: getDirectiveValidator({ allowNone: false, allowNonce: false }),
    }),
    report_uri: schema.arrayOf(schema.string(), {
      defaultValue: [],
      validate: getDirectiveValidator({ allowNone: true, allowNonce: false }),
    }),
    report_to: schema.arrayOf(schema.string(), {
      defaultValue: [],
    }),
    strict: schema.boolean({ defaultValue: true }),
    warnLegacyBrowsers: schema.boolean({ defaultValue: true }),
    disableEmbedding: schema.oneOf([schema.literal<boolean>(false)], { defaultValue: false }),
  },
  {
    validate: (cspConfig) => {
      if (cspConfig.rules && hasDirectiveSpecified(cspConfig)) {
        return `"csp.rules" cannot be used when specifying per-directive additions such as "script_src", "worker_src" or "style_src"`;
      }
      const hasUnsafeInlineScriptSrc =
        cspConfig.script_src.includes(`unsafe-inline`) ||
        cspConfig.script_src.includes(`'unsafe-inline'`);

      if (cspConfig.strict && hasUnsafeInlineScriptSrc) {
        return 'cannot use `unsafe-inline` for `script_src` when `csp.strict` is true';
      }
      if (cspConfig.warnLegacyBrowsers && hasUnsafeInlineScriptSrc) {
        return 'cannot use `unsafe-inline` for `script_src` when `csp.warnLegacyBrowsers` is true';
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
            '`csp.rules` is deprecated in favor of directive specific configuration. Please use `csp.connect_src`, ' +
            '`csp.default_src`, `csp.font_src`, `csp.frame_ancestors`, `csp.frame_src`, `csp.img_src`, ' +
            '`csp.report_uri`, `csp.report_to`, `csp.script_src`, `csp.style_src`, and `csp.worker_src` instead.',
          correctiveActions: {
            manualSteps: [
              `Remove "csp.rules" from the Kibana config file."`,
              `Add directive specific configurations to the config file using "csp.connect_src", "csp.default_src", "csp.font_src", ` +
                `"csp.frame_ancestors", "csp.frame_src", "csp.img_src", "csp.report_uri", "csp.report_to", "csp.script_src", ` +
                `"csp.style_src", and "csp.worker_src".`,
            ],
          },
        });
      }
    },
  ],
};
