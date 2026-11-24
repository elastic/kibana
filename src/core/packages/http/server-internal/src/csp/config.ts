/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { offeringBasedSchema, schema } from '@kbn/config-schema';
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

const directiveValidator = getDirectiveValidator({ allowNone: false, allowNonce: false });

const directiveSchema = (defaultValue: string[] = []) =>
  schema.arrayOf(schema.string(), { defaultValue, validate: directiveValidator });

/**
 * Sources for a directive that only traditional builds enforce by default. Serverless configures
 * these directives itself, so its default stays empty. Setting the `csp.*` key replaces the
 * default in both offerings.
 */
const traditionalDefault = (defaultValue: string[]) =>
  offeringBasedSchema({
    serverless: directiveSchema(),
    traditional: directiveSchema(defaultValue),
  });

/**
 * `img-src` default for traditional builds. Image sources are mostly deployment specific (custom
 * logos, authentication provider icons, tile servers), so any network origin is allowed rather
 * than requiring every deployment to configure its own list. `blob:` covers the Maps legend icons.
 *
 * When `csp.default_src` is set, its sources are the default instead, so an administrator's
 * allowlist is never widened. Using them as the `img-src` default rather than leaving the
 * directive out keeps that true when another config (the CDN) adds an `img-src` of its own, which
 * would otherwise end the `default-src` fallback.
 */
const imgSrcSchema = offeringBasedSchema({
  serverless: directiveSchema(),
  traditional: schema.conditional(
    schema.siblingRef('default_src'),
    schema.arrayOf(schema.string(), { maxSize: 0 }),
    directiveSchema(['data:', 'blob:', 'https:', 'http:']),
    schema.arrayOf(schema.string(), {
      defaultValue: schema.siblingRef('default_src'),
      validate: directiveValidator,
    })
  ),
});

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
    // Kibana ships its own fonts and inlines the small ones as data URIs.
    font_src: traditionalDefault([`'self'`, 'data:']),
    frame_src: schema.arrayOf(schema.string(), {
      defaultValue: [],
      validate: getDirectiveValidator({ allowNone: false, allowNonce: false }),
    }),
    img_src: imgSrcSchema,
    object_src: schema.arrayOf(schema.string(), {
      defaultValue: [],
      validate: getDirectiveValidator({ allowNone: false, allowNonce: false }),
    }),
    // Kibana has no media source other than itself and the Elastic CDN.
    media_src: traditionalDefault([`'self'`, 'kibana.estccdn.com']),
    form_action: schema.arrayOf(schema.string(), {
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
        connect_src: schema.arrayOf(schema.string(), {
          defaultValue: [],
          validate: getDirectiveValidator({ allowNone: false, allowNonce: false }),
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
  deprecations: ({ unusedFromRoot, deprecateFromRoot }) => [
    unusedFromRoot('csp.report_only.form_action', { level: 'warning' }),
    unusedFromRoot('csp.report_only.object_src', { level: 'warning' }),
    deprecateFromRoot('csp.disableUnsafeEval', '10.0.0', {
      level: 'warning',
      message: '`csp.disableUnsafeEval` has been replaced by the `csp.script_src` setting.',
      correctiveActions: {
        manualSteps: [
          'Remove the `csp.disableUnsafeEval` setting from your kibana configuration file.',
          "Use `csp.script_src: ['unsafe-eval']` instead if you wish to enable `unsafe-eval`.",
        ],
      },
    }),
  ],
};
