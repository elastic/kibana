/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf, schema } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

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
    disableUnsafeEval: schema.boolean({ defaultValue: true }),
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
    report_only: schema.maybe(
      schema.object({
        form_action: schema.arrayOf(schema.string(), {
          defaultValue: [],
          validate: getDirectiveValidator({ allowNone: false, allowNonce: false }),
        }),
        object_src: schema.arrayOf(schema.string(), {
          defaultValue: [],
          validate: getDirectiveValidator({ allowNone: true, allowNonce: false }),
        }),
      })
    ),
    strict: schema.boolean({ defaultValue: true }),
    warnLegacyBrowsers: schema.boolean({ defaultValue: true }),
    disableEmbedding: schema.oneOf([schema.literal<boolean>(false)], { defaultValue: false }),
  },
  {
    validate: (cspConfig) => {
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

/**
 * @internal
 */
export type CspConfigType = TypeOf<typeof configSchema>;

/**
 * @internal
 */
export type CspAdditionalConfig = Pick<
  Partial<CspConfigType>,
  | 'connect_src'
  | 'default_src'
  | 'font_src'
  | 'frame_src'
  | 'img_src'
  | 'script_src'
  | 'style_src'
  | 'worker_src'
>;

export const cspConfig: ServiceConfigDescriptor<CspConfigType> = {
  // TODO: Move this to server.csp using config deprecations
  // ? https://github.com/elastic/kibana/pull/52251
  path: 'csp',
  schema: configSchema,
};
